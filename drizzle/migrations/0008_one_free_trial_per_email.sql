-- One free trial of Phormula Premium per email address, even across accounts.
--
-- Checkout already gives no second trial to a Stripe customer that has had a
-- subscription. But every account gets its own customer, so deleting the
-- account and signing up again with the same email started a fresh trial.
-- This keeps a list of the email addresses that have subscribed, and the list
-- outlives the account on purpose. Every first subscription starts as a free
-- trial, so an address on the list has had its trial.
--
-- Only a one-way hash of each address is kept, never the address itself. It
-- is taken after normalising the address, so the spellings that reach the same
-- inbox count as one: letter case, a "+tag" (sam+2@example.com), and dots in a
-- Gmail address. A different email address still gets a trial of its own.

CREATE TABLE public.premium_trial_claims (
  email_hash text PRIMARY KEY,
  claimed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.premium_trial_claims ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.premium_trial_claims FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.premium_trial_claims TO service_role;

-- Spelled out, as on subscriptions: only the service role reads or writes
CREATE POLICY "No client access to premium trial claims"
  ON public.premium_trial_claims FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- The hash an address is remembered by.
CREATE FUNCTION public.premium_trial_email_hash(p_email text)
RETURNS text
LANGUAGE sql
IMMUTABLE
STRICT
SET search_path = public
AS $$
  SELECT encode(sha256(convert_to(
    CASE
      WHEN domain IN ('gmail.com', 'googlemail.com') THEN replace(local, '.', '') || '@gmail.com'
      ELSE local || '@' || domain
    END,
    'UTF8'
  )), 'hex')
  FROM (
    SELECT split_part(split_part(address, '@', 1), '+', 1) AS local,
           split_part(address, '@', 2) AS domain
    FROM (SELECT lower(btrim(p_email)) AS address) a
  ) parts
$$;

-- Put the user's current email address on the list.
CREATE FUNCTION public.claim_premium_trial(p_user_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.premium_trial_claims (email_hash)
  SELECT public.premium_trial_email_hash(u.email)
  FROM auth.users u
  WHERE u.id = p_user_id AND nullif(btrim(u.email), '') IS NOT NULL
  ON CONFLICT (email_hash) DO NOTHING
$$;

-- Whether the user's free trial is used up: they have subscribed on this
-- account, or their email address has on any account.
CREATE FUNCTION public.premium_trial_used(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.user_id = p_user_id AND s.status IS NOT NULL
  ) OR EXISTS (
    SELECT 1
    FROM auth.users u
    JOIN public.premium_trial_claims c ON c.email_hash = public.premium_trial_email_hash(u.email)
    WHERE u.id = p_user_id
  )
$$;

-- Every subscription puts its account's address on the list, whichever edge
-- function stored it. A problem here never blocks storing the subscription.
CREATE FUNCTION public.claim_premium_trial_on_subscribe()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.claim_premium_trial(NEW.user_id);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'claim_premium_trial_on_subscribe failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

CREATE TRIGGER claim_premium_trial_on_subscribe
  AFTER INSERT OR UPDATE OF status ON public.subscriptions
  FOR EACH ROW
  WHEN (NEW.status IS NOT NULL)
  EXECUTE FUNCTION public.claim_premium_trial_on_subscribe();

-- Everyone who has subscribed so far
INSERT INTO public.premium_trial_claims (email_hash)
SELECT public.premium_trial_email_hash(u.email)
FROM public.subscriptions s
JOIN auth.users u ON u.id = s.user_id
WHERE s.status IS NOT NULL AND nullif(btrim(u.email), '') IS NOT NULL
ON CONFLICT (email_hash) DO NOTHING;

-- get_premium_status() now also says whether a free trial is on offer, so the
-- upgrade dialog never promises one that Checkout won't give. A function's
-- result columns can't be changed in place.
DROP FUNCTION public.get_premium_status();

CREATE FUNCTION public.get_premium_status()
RETURNS TABLE (
  is_premium boolean,
  status text,
  billing_interval text,
  billing_interval_count integer,
  current_period_end timestamptz,
  cancel_at timestamptz,
  has_billing_account boolean,
  has_payment_method boolean,
  trial_available boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.user_has_premium(me.id),
    s.status,
    s.billing_interval,
    s.billing_interval_count,
    s.current_period_end,
    s.cancel_at,
    coalesce(starts_with(s.stripe_customer_id, 'cus_'), false),
    coalesce(s.has_payment_method, false),
    NOT public.premium_trial_used(me.id)
  FROM (SELECT auth.uid() AS id) me
  LEFT JOIN public.subscriptions s ON s.user_id = me.id
$$;

-- ---------------------------------------------------------------------------
-- Permissions: the edge functions check and claim; the app only reads its own
-- status.
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.premium_trial_email_hash(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_premium_trial(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.premium_trial_used(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_premium_trial_on_subscribe() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_premium_status() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.claim_premium_trial(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.premium_trial_used(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_premium_status() TO authenticated;

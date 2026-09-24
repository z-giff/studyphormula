-- Phormula Premium: who has a Stripe subscription, and what it unlocks.
--
-- Premium unlocks the Interactive, Flowchart and Drawing card types (making,
-- editing and studying them, including text detection on interactive images)
-- and the MC Quiz. Money only ever moves through Stripe: Checkout takes the
-- payment, and the Customer Portal handles cancelling, card changes and
-- invoices. The billing and stripe-webhook edge functions copy each
-- subscription's current state from Stripe into this table.
--
-- Clients never read or write the table directly. The app asks
-- get_premium_status(), and only the edge functions (service role) write.

CREATE TABLE public.subscriptions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Made the first time the user opens Checkout, so a row can exist before any
  -- subscription does: status stays null until they finish paying.
  stripe_customer_id text NOT NULL UNIQUE,
  stripe_subscription_id text UNIQUE,
  -- Stripe's own status: active, trialing, past_due, canceled, unpaid,
  -- incomplete, incomplete_expired or paused.
  status text,
  price_id text,
  -- 'month' or 'year'
  billing_interval text,
  current_period_end timestamptz,
  -- When a subscription the customer cancelled stops. Null while it renews.
  cancel_at timestamptz,
  -- Whether Stripe has a card to charge. Free trials start without one, and a
  -- trial that ends without one is cancelled instead of charged.
  has_payment_method boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.subscriptions FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.subscriptions TO service_role;

-- Spelled out, as on waitlist: only the service role reads or writes
CREATE POLICY "No client access to subscriptions"
  ON public.subscriptions FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- The one definition of who has Premium: a subscription Stripe still counts as
-- live. past_due stays in while Stripe retries a failed renewal; Stripe cancels
-- the subscription once the retries run out. The period check is a backstop
-- for a row that stopped hearing from Stripe: three days after the paid period
-- ends, access stops until the row is synced again. A row with no period end
-- (access granted by hand) never expires this way.
CREATE FUNCTION public.user_has_premium(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.subscriptions s
    WHERE s.user_id = p_user_id
      AND s.status IN ('active', 'trialing', 'past_due')
      AND (s.current_period_end IS NULL OR s.current_period_end > now() - interval '3 days')
  )
$$;

-- The signed-in user's own Premium.
CREATE FUNCTION public.has_premium()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.user_has_premium(auth.uid())
$$;

-- What the app shows about the signed-in user's plan. Always one row; a user
-- who never opened Checkout gets is_premium false and nulls.
-- has_billing_account is whether there is a Stripe customer to manage, which
-- a row granted by hand does not have. A status that isn't null means the user
-- has subscribed before, so their free trial is used up.
CREATE FUNCTION public.get_premium_status()
RETURNS TABLE (
  is_premium boolean,
  status text,
  billing_interval text,
  current_period_end timestamptz,
  cancel_at timestamptz,
  has_billing_account boolean,
  has_payment_method boolean
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
    s.current_period_end,
    s.cancel_at,
    coalesce(starts_with(s.stripe_customer_id, 'cus_'), false),
    coalesce(s.has_payment_method, false)
  FROM (SELECT auth.uid() AS id) me
  LEFT JOIN public.subscriptions s ON s.user_id = me.id
$$;

-- Interactive, flowchart and drawing cards are Premium. Everyone keeps the
-- cards they already have and can still delete, move, reorder, recolour or
-- bookmark them; making one, turning a card into one, or changing what is on
-- one needs Premium.
--
-- Only writes the app makes directly are checked. Adding a set someone shared
-- with you runs inside copy_flashcard_set (SECURITY DEFINER), and edge
-- functions write as service_role, so neither runs as anon or authenticated
-- and both pass: a shared set arrives whole, and its premium cards stay locked
-- until the recipient upgrades.
CREATE FUNCTION public.enforce_premium_flashcard_types()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  IF coalesce(NEW.flashcard_type, 'standard') NOT IN ('interactive', 'flowchart', 'drawing') THEN
    RETURN NEW;
  END IF;

  -- The bulk editor writes every column of every card on each save, so an
  -- update that leaves the card's content as it was is not an edit.
  IF TG_OP = 'UPDATE'
    AND NEW.flashcard_type IS NOT DISTINCT FROM OLD.flashcard_type
    AND NEW.term IS NOT DISTINCT FROM OLD.term
    AND NEW.definition IS NOT DISTINCT FROM OLD.definition
    AND NEW.image_url IS NOT DISTINCT FROM OLD.image_url
    AND NEW.interactive_data IS NOT DISTINCT FROM OLD.interactive_data
  THEN
    RETURN NEW;
  END IF;

  IF public.has_premium() THEN
    RETURN NEW;
  END IF;

  -- The app spots this hint and opens the upgrade dialog.
  RAISE EXCEPTION 'Interactive, flowchart and drawing cards are part of Phormula Premium'
    USING ERRCODE = '42501', HINT = 'premium_required';
END;
$$;

CREATE TRIGGER enforce_premium_flashcard_types
  BEFORE INSERT OR UPDATE OF flashcard_type, term, definition, image_url, interactive_data
  ON public.flashcards
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_premium_flashcard_types();

-- ---------------------------------------------------------------------------
-- Permissions: the edge functions check anyone; the app checks only itself.
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.user_has_premium(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_premium_flashcard_types() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_premium() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_premium_status() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.user_has_premium(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.has_premium() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_premium_status() TO authenticated;

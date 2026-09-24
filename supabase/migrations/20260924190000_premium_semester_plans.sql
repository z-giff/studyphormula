-- Semester plans: Premium can now renew every 4 months (one semester) or every
-- 8 months (two semesters), as well as monthly or yearly. Stripe describes those
-- periods as an interval and a count ('month', 4), so the count is stored next
-- to the interval the table already keeps.
--
-- Safe to run more than once, so it can be pasted into the SQL editor by hand
-- even if the deploy applies it too.

ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS billing_interval_count integer;

-- Every subscription until now was monthly or yearly
UPDATE public.subscriptions
SET billing_interval_count = 1
WHERE billing_interval IS NOT NULL AND billing_interval_count IS NULL;

-- get_premium_status() returns the count too, so the profile can say "billed
-- every 4 months". A function's result columns can't be changed in place.
DROP FUNCTION IF EXISTS public.get_premium_status();

CREATE FUNCTION public.get_premium_status()
RETURNS TABLE (
  is_premium boolean,
  status text,
  billing_interval text,
  billing_interval_count integer,
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
    s.billing_interval_count,
    s.current_period_end,
    s.cancel_at,
    coalesce(starts_with(s.stripe_customer_id, 'cus_'), false),
    coalesce(s.has_payment_method, false)
  FROM (SELECT auth.uid() AS id) me
  LEFT JOIN public.subscriptions s ON s.user_id = me.id
$$;

REVOKE ALL ON FUNCTION public.get_premium_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_premium_status() TO authenticated;

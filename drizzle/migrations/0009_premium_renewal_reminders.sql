-- Renewal reminders for Phormula Premium.
--
-- Before a plan renews, Phormula emails the subscriber when it renews and what
-- they'll be charged, with a link to switch plans or cancel first:
--
--   billed every 4 months or longer   35 days before every renewal
--   billed monthly                    7 days before a renewal, every 6 months
--
-- The Terms of Service promise a reminder before renewals wherever the law
-- requires one, and several laws do (California's automatic renewal law among
-- them). The renewal-reminders edge function sends them through
-- send-transactional-email, like every Phormula email, and a cron job below
-- wakes it every hour. Free trials have their own reminder, sent by
-- stripe-webhook three days before the trial ends.

ALTER TABLE public.subscriptions
  -- When the Stripe subscription started: the first monthly reminder comes
  -- six months after it
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  -- The renewal (its current_period_end) the last reminder was about, so each
  -- renewal gets at most one
  ADD COLUMN IF NOT EXISTS renewal_reminder_period_end timestamptz,
  -- When the last reminder went out: a monthly plan gets the next six months on
  ADD COLUMN IF NOT EXISTS renewal_reminded_at timestamptz;

-- The subscriptions whose next renewal needs its reminder now. Only live plans
-- that will renew through Stripe: nothing for a free trial, a plan already
-- cancelled, or Premium granted by hand.
CREATE FUNCTION public.premium_renewal_reminders_due()
RETURNS SETOF public.subscriptions
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT s.*
  FROM public.subscriptions s
  WHERE s.status = 'active'
    AND s.cancel_at IS NULL
    AND s.stripe_subscription_id IS NOT NULL
    AND starts_with(s.stripe_customer_id, 'cus_')
    AND s.current_period_end > now()
    AND s.renewal_reminder_period_end IS DISTINCT FROM s.current_period_end
    AND CASE
      WHEN s.billing_interval = 'year'
        OR (s.billing_interval = 'month' AND coalesce(s.billing_interval_count, 1) >= 4)
      THEN s.current_period_end <= now() + interval '35 days'
      ELSE s.current_period_end <= now() + interval '7 days'
        AND s.current_period_end >= coalesce(s.renewal_reminded_at, s.started_at, s.created_at) + interval '6 months'
    END
  ORDER BY s.current_period_end
$$;

REVOKE ALL ON FUNCTION public.premium_renewal_reminders_due() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.premium_renewal_reminders_due() TO service_role;

-- Wake the renewal-reminders function every hour. It signs in with the same
-- service key the email triggers and the email queue's own cron job read from
-- the vault. Scheduling a name that already exists replaces that job.
SELECT cron.schedule(
  'premium-renewal-reminders',
  '17 * * * *',
  $job$
  SELECT net.http_post(
    url := 'https://awvwrdjtptjyalmsyejt.supabase.co/functions/v1/renewal-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret FROM vault.decrypted_secrets
        WHERE name = 'email_queue_service_role_key'
      )
    ),
    body := '{}'::jsonb
  )
  $job$
);

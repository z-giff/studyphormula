-- 0009_premium_renewal_reminders was already applied to the database in full:
-- the started_at / renewal_reminder_period_end / renewal_reminded_at columns
-- on subscriptions, the premium_renewal_reminders_due() function, and the
-- hourly cron job 'premium-renewal-reminders' (scheduled directly, as it
-- reads the service key from the vault). This marker records it in the
-- migration journal.
COMMENT ON FUNCTION public.premium_renewal_reminders_due() IS 'The subscriptions whose next renewal needs its reminder email now.';
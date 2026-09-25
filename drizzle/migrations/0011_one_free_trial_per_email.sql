-- 0008_one_free_trial_per_email was already applied to the database in full
-- (premium_trial_claims table, hash/claim/used functions, subscribe trigger,
-- and the get_premium_status() rebuild with trial_available). This marker
-- records it in the migration journal so the two stay in step.
COMMENT ON TABLE public.premium_trial_claims IS 'One free Premium trial per email address: hashed, normalised addresses that have subscribed.';
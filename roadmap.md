# Roadmap

- [x] Answer: does the database have a table named "subscriptons" / "subscriptions"? (No such table exists in any schema.)
- [x] Start this project's email-sending update — consent given, migration started; message relayed.
- [ ] Email update — blocked: database-triggered emails (welcome on confirm, flashcard sharing) can't be switched automatically. Needs Lovable review/retry.
- [ ] (Newly found, unasked) `supabase/functions/_shared/stripe-billing.ts` reads and writes `public.subscriptions`, but no such table exists — confirm with the user before creating it.

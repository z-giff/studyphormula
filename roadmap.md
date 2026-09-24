# Roadmap

- [x] Answer: does the database have a table named "subscriptons" / "subscriptions"? (No such table exists in any schema.)
- [x] Start this project's email-sending update — consent given, migration started; message relayed.
- [ ] Await the funded rewrite turn that converts the app's email code; review and publish when it lands.
- [ ] (Newly found, unasked) `supabase/functions/_shared/stripe-billing.ts` reads and writes `public.subscriptions`, but no such table exists — confirm with the user before creating it.

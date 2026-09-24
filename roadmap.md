# Roadmap

## Done
- Apply pending migrations: resume position (`last_card_index`), flashcard sharing (`flashcard_shares` + RPCs + share-email trigger), premium semester plans (`billing_interval_count`)
- Regenerate Supabase types; build is clean

## Open
- Email-sending update: blocked — welcome + flashcard-share emails are sent from DB triggers via legacy `send-transactional-email`. Waiting on Lovable review or user retry.

- Wire Stripe checkout/webhook into `subscriptions` (deployed)

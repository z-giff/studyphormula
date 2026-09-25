# Roadmap

## Done
- Apply pending migrations: resume position (`last_card_index`), flashcard sharing (`flashcard_shares` + RPCs + share-email trigger), premium semester plans (`billing_interval_count`)
- Regenerate Supabase types; build is clean
- Preserve white-pen drawing strokes on white study cards while keeping eraser strokes invisible
- Add configurable PDF export for complete flashcard sets, including all card types, page orientation/density, same-page or duplex-aligned backs, and optional standard-card image removal
- Added multiple positioned pictures to both sides of regular flashcards with private uploads, full editing controls, consistent study/shared rendering, and PDF export
- Add a live, settings-aware PDF viewer with page navigation and zoom before download

## Open
- Add a table PDF format with live preview, text extraction across card types, optional regular images, and unsplit rows
- Scale complete flashcard faces uniformly in the existing PDF layout
- Email-sending update: blocked — welcome + flashcard-share emails are sent from DB triggers via legacy `send-transactional-email`. Waiting on Lovable review or user retry.

- Wire Stripe checkout/webhook into `subscriptions` (deployed)

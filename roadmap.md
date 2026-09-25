# Roadmap

## Done
- Apply pending migrations: resume position (`last_card_index`), flashcard sharing (`flashcard_shares` + RPCs + share-email trigger), premium semester plans (`billing_interval_count`)
- Regenerate Supabase types; build is clean
- Preserve white-pen drawing strokes on white study cards while keeping eraser strokes invisible
- Add configurable PDF export for complete flashcard sets, including all card types, page orientation/density, same-page or duplex-aligned backs, and optional standard-card image removal
- Added multiple positioned pictures to both sides of regular flashcards with private uploads, full editing controls, consistent study/shared rendering, and PDF export
- Add a live, settings-aware PDF viewer with page navigation and zoom before download
- Add a table PDF format with live preview, text from every card type, optional regular-card images, repeated headers, and unsplit rows
- Scale complete flashcard faces proportionally in the existing PDF layout
- Apply pending migrations 0006–0009: share-email trigger restored, files linked to users (cascade delete), one free trial per email, premium renewal reminders + hourly cron

## Open

- Wire Stripe checkout/webhook into `subscriptions` (deployed)

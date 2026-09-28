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
- Redesign the PDF export dialog: a settings rail with visual pickers (cards per page drawn from the real print layout), a fit-to-page preview with page and zoom controls, a page-count summary beside Download, and a preview-first layout on phones
- Fix how pictures get onto regular cards: each one is checked, shrunk to 2048 px and stripped of photo location data in the browser before upload; uploads run one by one with placeholders on the card and Retry when one fails; new pictures land beside each other at their own shape with the text kept clear; paste, drop and links work anywhere in the editor; signed picture links are batched and reused; legacy inline pictures are no longer cut short and move to storage when the card is edited
- Redesign the regular-card picture editor: the card's sides as folder tabs showing each side exactly as it's studied, pictures dragged, resized from any corner and turned with a rotation handle right on the card (snapping to the centre and edges, and to 15° steps), a floating toolbar (docked under the card on phones) for how the text flows (keep clear, over or behind the text), layer order, moving to the other side, duplicating and deleting, full keyboard control, and a Preview that flips; the editor, deck, study, swipe and shared views and the PDF all draw a side with pictures the same way, with the text in the space the pictures leave at the same size, and the PDF now turns and crops pictures as the app does

## Open

- Wire Stripe checkout/webhook into `subscriptions` (deployed)

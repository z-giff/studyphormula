# Multiple positioned pictures for regular flashcards

## Confirmed experience

The regular-card editor will become the two-sided workspace shown in the screenshot:

- **Front / Back tabs** switch between two independent card canvases.
- **Add pictures** accepts multi-file upload, drag-and-drop, clipboard paste, and image URLs.
- Each side can contain **multiple pictures**.
- Clicking a picture selects it and opens a **small floating toolbar at its top-left**.
- Dragging moves the picture precisely; corner handles resize it; a rotation handle rotates it.
- The selected-picture controls include **Contain / Crop**, **Move forward / Move backward**, and remove.
- The floating toolbar includes the requested text behavior choice:
  - **Overlap text**: the picture and text remain independent layers.
  - **Avoid text**: the term or definition is laid out in the largest clear region around the picture bounds.
- Existing regular-card pictures are converted to a centered picture on the **back**, the way that it currently is.

## Build scope

1. **Reusable regular-card canvas**
  - Add one shared editor/viewer for regular card sides so create, edit, bulk edit, deck view, Memorization mode, Swipe mode, shared cards, bookmarks, and PDF output interpret placements identically.
  - Preserve the current card color, text content, flip behavior, and non-regular card types.
2. **Picture editing**
  - Support selection, mouse dragging, resize handles, rotation, crop/contain, layer ordering, deletion, and keyboard nudging for exact placement.
  - Keep coordinates and sizes proportional so layouts remain stable at different screen and print sizes.
  - Constrain pictures to the card canvas and provide touch/pointer support as well as mouse controls.
3. **Picture intake and storage**
  - Allow several files per upload and canvas drop, plus clipboard and URL inputs.
  - Validate image type, dimensions, and file size before saving.
  - Store uploaded picture files in private project storage rather than enlarging database rows with multiple base64 images.
4. **Data and compatibility**
  - Store a versioned regular-card layout in the card's existing structured data field: separate `front` and `back` picture arrays with position, size, rotation, fit, text behavior, and layer order.
  - Keep the legacy single-picture field readable. On first edit, place that picture centered on the front without changing cards the user never edits.
  - Preserve layouts when cards are copied, bookmarked, shared, imported where supported, or saved from study workflows.
5. **Every viewing mode and PDF**
  - Render front pictures before flipping and back pictures after flipping in the deck and Memorization modes.
  - Apply the same composition in Swipe mode and shared-card previews.
  - Update PDF generation inside the existing PDF module so positioned front/back pictures, rotation, crop/contain, layers, and optional standard-image removal are respected.

## Verification

- Create a regular card with multiple front and back pictures using all four intake methods.
- Verify drag, resize, rotate, crop/contain, layering, overlap text, avoid text, deletion, and auto-save.
- Verify an old single-picture card opens centered on the front.
- Compare both sides across deck, Memorization, Swipe, shared/bookmarked copies, and PDF export.
- Check desktop and narrow layouts, keyboard access, build output, runtime errors, and private-file access boundaries.
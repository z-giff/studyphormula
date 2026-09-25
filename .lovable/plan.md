# Live PDF export preview

## Goal
Show the actual generated flashcard PDF inside the export window before download, and refresh it when any export setting changes.

## What will change
- Reuse the existing PDF generator for both preview and download so the preview matches the exported file exactly.
- Return PDF data from the generator instead of always downloading immediately; keep the existing filename and download result unchanged.
- Add a large document viewer to the export window with page navigation, page count, zoom controls, loading progress, and a clear error/retry state.
- Regenerate the preview after orientation, cards-per-page, side placement, or image-removal changes, with a short delay to avoid repeated work while settings change.
- Keep the previous preview visible while an updated preview is prepared, and prevent stale generations from replacing newer settings.
- Preserve Cancel and Download PDF actions; Download will use the latest completed preview rather than rebuilding it unnecessarily.

## Technical details
- Keep generation in `src/lib/flashcardPdf.ts` and preview controls in `ExportPdfDialog`, following the existing project boundary.
- Use the installed PDF.js package to render the generated PDF bytes onto a canvas, avoiding browser-specific embedded PDF behavior.
- Release rendered PDF resources and cancel obsolete work when settings change or the window closes.
- Verify portrait and landscape layouts, same-page and duplex modes, page navigation, image removal, loading states, and final download output.

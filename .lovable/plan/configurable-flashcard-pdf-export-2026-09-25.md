# Configurable flashcard PDF export

## What will be added
- Place a **PDF** button immediately beside **Share** on each non-empty flashcard set.
- Open an export window with controls for:
  - Letter paper in portrait or landscape.
  - 1, 2, 4, 6, or 8 complete flashcards per page.
  - Front and back on the same page, or on separate duplex-ready pages.
  - A checkbox to remove images from standard flashcards only.
- Keep the user’s chosen settings visible while the PDF is being prepared, show progress, and download a file named from the set title.

## PDF layouts
- **Same page:** place each front followed by its matching back in the next grid position, as selected.
- **Separate pages:** generate a front page followed by its matching back page. Back positions are mirrored horizontally so Letter-size, long-edge duplex printing aligns each back with its front.
- Use stable margins, subtle card outlines, page numbers, and cut guides. Long text scales down or wraps rather than being clipped.

## Card content
- Standard cards retain their colors, formatted text, and optional front image; the image-removal checkbox omits only these standard-card images.
- Drawing cards export the complete centered drawing on the back.
- Flowchart cards export the complete chart fitted within the card back, without editing controls or a grid.
- Interactive cards export the term and masked diagram as the front, then the original labeled diagram as the back so the printable card remains useful.
- Special-card artwork is fitted proportionally within the available card area so no diagram, drawing, node, label, or connection is intentionally cropped.

## Technical details
- Generate the PDF entirely in the browser; no flashcard data or images are sent to another service.
- Add a dedicated export dialog and PDF generator/rendering helpers rather than coupling export logic to the study deck.
- Convert card visuals to high-resolution print images, embed them into a real PDF, and preload/proxy image data safely before capture to reduce missing-image and cross-origin failures.
- Keep PDF-only rendering off-screen and isolated from the visible set page.
- Record the export module boundary in the project architecture notes.

## Verification
- Exercise the export from a real set in the browser for portrait and landscape.
- Inspect generated PDFs for same-page sequencing and duplex front/back alignment.
- Test mixed sets containing standard images, interactive cards, drawings, and flowcharts, including the “remove standard images” option.
- Render the generated PDF pages to images and visually inspect for clipping, blank artwork, overlaps, incorrect mirroring, and unreadable text; correct issues and repeat before completion.
- Confirm the app build remains clean.

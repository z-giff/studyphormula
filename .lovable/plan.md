# Table PDF export and proportional flashcard scaling

## Goal
Add a clean table export alongside the existing flashcard PDF format, with every choice reflected immediately in the live PDF viewer. Correct the flashcard format so each complete card face scales as one composition instead of preserving oversized text inside a smaller card.

## Export controls
- Place two compact format cards at the top of the settings panel: **Flashcards** and **Table**.
- Keep orientation available for both formats.
- Show flashcards-per-page and front/back placement only for the Flashcards format.
- Show an **Include regular-card images** checkbox only for the Table format.
- Keep the existing image-removal control only for the Flashcards format.
- Preserve the current preview, retry, progress, cancel, and download behavior.

## Table PDF
- Render a restrained two-column table headed **Term** and **Definition**.
- Use each card's front text in Term and back text in Definition, including text from standard, interactive, drawing, and flowchart card records.
- For drawing, interactive-diagram, and flowchart cards, leave Definition blank instead of rendering the visual canvas.
- For regular cards, optionally include their positioned front/back pictures inside the corresponding cell while preserving ordering and fit.
- Size rows to their content, repeat the header on each page, and move a row intact to the next page when it does not fit.
- Handle an individually oversized row by proportionally constraining its cell content so the row still remains on one page.
- Apply clean rules, balanced cell padding, readable typography, and subtle alternating rows without decorative clutter.

## Flashcard PDF scaling correction
- Render every flashcard face at one stable reference size, including its border, spacing, text, pictures, drawings, diagrams, and flowcharts.
- Convert the completed face into an image and scale that image uniformly into its page slot.
- Preserve the full card aspect ratio and never crop the card; smaller page slots reduce every visual element and font together.
- Keep same-page and duplex positioning unchanged, including mirrored backs.

## Verification
- Confirm the live viewer updates when switching formats, orientation, image inclusion, density, or side placement.
- Check mixed standard, interactive, drawing, and flowchart sets in both table and flashcard formats.
- Confirm table headers repeat, rows never split, visual-card definitions remain blank, and optional regular images appear or disappear correctly.
- Confirm complete card faces scale proportionally at every density in portrait and landscape.
- Verify page navigation, zoom, retry, and download still use the exact previewed PDF.
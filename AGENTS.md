# Project architecture rules

- Keep flashcard PDF generation in `src/lib/flashcardPdf.ts` and its controls in `ExportPdfDialog`; this isolates print layout from interactive study views.
- Keep regular-card picture layout parsing in `src/lib/standardCardLayout.ts` and use shared editor/viewer components so every card surface preserves identical placement.
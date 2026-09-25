# Project architecture rules

- Keep flashcard PDF generation in `src/lib/flashcardPdf.ts` and its controls in `ExportPdfDialog`; this isolates print layout from interactive study views.
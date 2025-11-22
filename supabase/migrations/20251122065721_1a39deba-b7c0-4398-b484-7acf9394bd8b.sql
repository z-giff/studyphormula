-- Add columns for interactive flashcard functionality
ALTER TABLE flashcards
ADD COLUMN IF NOT EXISTS flashcard_type text DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS interactive_data jsonb;

-- Add a comment to describe the interactive_data structure
COMMENT ON COLUMN flashcards.interactive_data IS 'Stores data for interactive flashcards: { textBoxes: [{ id, x, y, width, height, answer }] }';

-- Create an index on flashcard_type for better query performance
CREATE INDEX IF NOT EXISTS idx_flashcards_type ON flashcards(flashcard_type);
-- Add color column to flashcards table with default matching parent set
ALTER TABLE flashcards ADD COLUMN color TEXT DEFAULT NULL;
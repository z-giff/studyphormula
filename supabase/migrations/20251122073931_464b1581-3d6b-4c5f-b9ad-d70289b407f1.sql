-- Add bookmark column to flashcards table
ALTER TABLE public.flashcards 
ADD COLUMN is_bookmarked BOOLEAN DEFAULT false;
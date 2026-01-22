-- Track 'most recently used' sorting for sets
ALTER TABLE public.flashcard_sets
ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMPTZ;

-- Backfill existing rows (keep historical recency roughly aligned to created_at)
UPDATE public.flashcard_sets
SET last_accessed_at = created_at
WHERE last_accessed_at IS NULL;

-- Default for new rows
ALTER TABLE public.flashcard_sets
ALTER COLUMN last_accessed_at SET DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_flashcard_sets_last_accessed_at
ON public.flashcard_sets(last_accessed_at DESC);

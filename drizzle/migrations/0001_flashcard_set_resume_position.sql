-- Resume a set where the user left off: the card the set was last open on,
-- stored per set as a 0-based index into that set's cards ordered by position.
-- Sets are single-owner (see the flashcard_sets RLS policies), so the set row
-- is the user's position; existing rows start at the first card.
ALTER TABLE public.flashcard_sets
ADD COLUMN IF NOT EXISTS last_card_index INTEGER NOT NULL DEFAULT 0;

-- A negative position could never name a card. The upper bound is not fixed
-- here on purpose: cards come and go after the position is written, so the
-- client opens the nearest card that still exists and corrects the stored one.
ALTER TABLE public.flashcard_sets
DROP CONSTRAINT IF EXISTS flashcard_sets_last_card_index_check;

ALTER TABLE public.flashcard_sets
ADD CONSTRAINT flashcard_sets_last_card_index_check CHECK (last_card_index >= 0);
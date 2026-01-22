-- Flashcard Files (folders)
CREATE TABLE IF NOT EXISTS public.flashcard_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.flashcard_files ENABLE ROW LEVEL SECURITY;

-- Policies (idempotent via drop+create)
DROP POLICY IF EXISTS "Users can view own files" ON public.flashcard_files;
CREATE POLICY "Users can view own files"
ON public.flashcard_files
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own files" ON public.flashcard_files;
CREATE POLICY "Users can create own files"
ON public.flashcard_files
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own files" ON public.flashcard_files;
CREATE POLICY "Users can update own files"
ON public.flashcard_files
FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own files" ON public.flashcard_files;
CREATE POLICY "Users can delete own files"
ON public.flashcard_files
FOR DELETE
USING (auth.uid() = user_id);

-- Add optional file_id to sets
ALTER TABLE public.flashcard_sets
ADD COLUMN IF NOT EXISTS file_id UUID NULL;

-- Foreign key
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'flashcard_sets_file_id_fkey'
  ) THEN
    ALTER TABLE public.flashcard_sets
    ADD CONSTRAINT flashcard_sets_file_id_fkey
    FOREIGN KEY (file_id)
    REFERENCES public.flashcard_files(id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- Ensure set insert/update cannot point to another user's file
DROP POLICY IF EXISTS "Users can create own sets" ON public.flashcard_sets;
CREATE POLICY "Users can create own sets"
ON public.flashcard_sets
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND (
    file_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.flashcard_files f
      WHERE f.id = file_id AND f.user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Users can update own sets" ON public.flashcard_sets;
CREATE POLICY "Users can update own sets"
ON public.flashcard_sets
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND (
    file_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.flashcard_files f
      WHERE f.id = file_id AND f.user_id = auth.uid()
    )
  )
);

-- Keep other set policies as-is (view/delete)

-- updated_at triggers
DROP TRIGGER IF EXISTS update_flashcard_files_updated_at ON public.flashcard_files;
CREATE TRIGGER update_flashcard_files_updated_at
BEFORE UPDATE ON public.flashcard_files
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_flashcard_sets_updated_at ON public.flashcard_sets;
CREATE TRIGGER update_flashcard_sets_updated_at
BEFORE UPDATE ON public.flashcard_sets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_flashcard_files_user_id ON public.flashcard_files(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_sets_file_id ON public.flashcard_sets(file_id);
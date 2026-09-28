CREATE OR REPLACE FUNCTION public.can_view_shared_flashcard_image(p_sender_folder text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.flashcard_shares share
    WHERE share.recipient_id = auth.uid()
      AND share.sender_id::text = p_sender_folder
      AND share.dismissed_at IS NULL
  )
$$;
REVOKE ALL ON FUNCTION public.can_view_shared_flashcard_image(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_shared_flashcard_image(text) TO authenticated;

DROP POLICY IF EXISTS "Recipients can view shared flashcard images" ON storage.objects;
CREATE POLICY "Recipients can view shared flashcard images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'flashcard-images'
  AND public.can_view_shared_flashcard_image((storage.foldername(name))[1])
);
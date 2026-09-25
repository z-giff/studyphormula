CREATE POLICY "Recipients can view shared flashcard images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'flashcard-images'
  AND EXISTS (
    SELECT 1
    FROM public.flashcard_shares share
    WHERE share.recipient_id = auth.uid()
      AND share.sender_id::text = (storage.foldername(name))[1]
      AND share.dismissed_at IS NULL
  )
);
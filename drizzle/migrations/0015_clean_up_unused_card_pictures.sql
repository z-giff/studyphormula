-- Pictures uploaded to cards live in storage (the flashcard-images bucket,
-- one folder per user), and nothing deleted one when it was taken off a card,
-- when its card or set was deleted, or when an upload was never saved. Once a
-- day, the clean-up-pictures function now deletes every picture no card
-- anywhere refers to, a week after it was uploaded, so one still being edited
-- is never caught. Deleting an account removes that user's pictures at once
-- (delete-account).
--
-- It looks for "storage:<path>" anywhere in a card rather than parsing the
-- picture layout, which src/lib/standardCardLayout.ts owns, so a reference in
-- any kind of card counts, including copies other people added.
--
-- The cron job at the bottom reads the service key from the vault, which
-- Lovable's migration tool blocks: schedule that statement directly, as for
-- 0009 (see 0013).

CREATE FUNCTION public.unreferenced_card_pictures(p_limit integer DEFAULT 1000)
RETURNS SETOF text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH referenced AS (
    SELECT DISTINCT match[1] AS name
    FROM public.flashcards c,
         regexp_matches(
           coalesce(c.interactive_data::text, '') || ' ' || coalesce(c.image_url, ''),
           'storage:([^"\s]+)',
           'g'
         ) AS match
    WHERE c.interactive_data::text LIKE '%storage:%' OR c.image_url LIKE 'storage:%'
  )
  SELECT o.name
  FROM storage.objects o
  WHERE o.bucket_id = 'flashcard-images'
    AND o.created_at < now() - interval '7 days'
    AND NOT EXISTS (SELECT 1 FROM referenced r WHERE r.name = o.name)
  ORDER BY o.created_at
  LIMIT p_limit
$$;

REVOKE ALL ON FUNCTION public.unreferenced_card_pictures(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.unreferenced_card_pictures(integer) TO service_role;

-- Wake clean-up-pictures once a day, signed in with the service key the email
-- triggers and the other cron jobs read from the vault.
SELECT cron.schedule(
  'clean-up-card-pictures',
  '41 3 * * *',
  $job$
  SELECT net.http_post(
    url := 'https://awvwrdjtptjyalmsyejt.supabase.co/functions/v1/clean-up-pictures',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret FROM vault.decrypted_secrets
        WHERE name = 'email_queue_service_role_key'
      )
    ),
    body := '{}'::jsonb
  )
  $job$
);

-- The shares in a person's data export (Privacy & Security → Export My Data):
-- what they shared, with whom and when, and what was shared with them. The
-- table itself stays closed to the app (0003_flashcard_sharing).
--
-- For shares they sent, only what they chose and typed: the item and the
-- address. Nothing about what the recipient did with it, and, as everywhere
-- else in sharing, never whether the address has an account.

CREATE FUNCTION public.export_flashcard_shares()
RETURNS TABLE (
  direction text,
  item_type text,
  title text,
  person text,
  created_at timestamptz,
  seen_at timestamptz,
  added_at timestamptz,
  removed_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    'sent',
    CASE WHEN sh.set_id IS NOT NULL THEN 'set' ELSE 'file' END,
    coalesce(s.title, f.name),
    sh.recipient_email,
    sh.created_at,
    NULL::timestamptz,
    NULL::timestamptz,
    NULL::timestamptz
  FROM public.flashcard_shares sh
  LEFT JOIN public.flashcard_sets s ON s.id = sh.set_id
  LEFT JOIN public.flashcard_files f ON f.id = sh.file_id
  WHERE sh.sender_id = auth.uid()
  UNION ALL
  SELECT
    'received',
    CASE WHEN sh.set_id IS NOT NULL THEN 'set' ELSE 'file' END,
    coalesce(s.title, f.name),
    public.flashcard_share_sender_name(sh.sender_id),
    sh.created_at,
    sh.seen_at,
    sh.added_at,
    sh.dismissed_at
  FROM public.flashcard_shares sh
  LEFT JOIN public.flashcard_sets s ON s.id = sh.set_id
  LEFT JOIN public.flashcard_files f ON f.id = sh.file_id
  WHERE sh.recipient_id = auth.uid()
  ORDER BY created_at
$$;

REVOKE ALL ON FUNCTION public.export_flashcard_shares() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.export_flashcard_shares() TO authenticated;

-- Link each file to the account that owns it, as sets, profiles, shares and
-- subscriptions already are. Deleting an account now takes its files with it,
-- and a file can no longer point at an account that doesn't exist.
--
-- Files left behind by accounts deleted before this (for example by hand in
-- the dashboard) would block the link, so they go first. Nobody can see them:
-- their owner is gone, and their sets went with the account.

DELETE FROM public.flashcard_files f
WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = f.user_id);

ALTER TABLE public.flashcard_files
DROP CONSTRAINT IF EXISTS flashcard_files_user_id_fkey;

ALTER TABLE public.flashcard_files
ADD CONSTRAINT flashcard_files_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

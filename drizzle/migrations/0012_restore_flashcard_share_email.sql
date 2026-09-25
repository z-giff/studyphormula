-- 0006_restore_flashcard_share_email was applied directly (it reads the
-- vault, which the migration tool blocks): the send_flashcard_share_email
-- trigger function and the on_flashcard_share_created trigger are in place.
-- This marker records it in the migration journal.
COMMENT ON FUNCTION public.send_flashcard_share_email() IS 'Emails the recipient when a flashcard set or file is shared with them.';
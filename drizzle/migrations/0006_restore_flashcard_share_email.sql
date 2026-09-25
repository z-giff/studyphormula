-- Restore the email a new share sends. 0003_flashcard_sharing was applied
-- without it, so someone without an account never got the invite the Share
-- dialog promises, and existing users never heard that something was waiting.
--
-- An invite when the address has no account yet, otherwise a heads-up that
-- something is waiting in Shared flashcards. Like every Phormula email it goes
-- out through the send-transactional-email function, the same way as the
-- welcome email (send_welcome_email_on_confirm).
--
-- Safe to run whether or not the trigger already exists.

CREATE OR REPLACE FUNCTION public.send_flashcard_share_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  service_role_key text;
  v_title text;
  v_set_count integer;
  v_card_count integer;
BEGIN
  IF NEW.set_id IS NOT NULL THEN
    SELECT s.title INTO v_title FROM public.flashcard_sets s WHERE s.id = NEW.set_id;
    SELECT 1, count(*) INTO v_set_count, v_card_count
    FROM public.flashcards c WHERE c.set_id = NEW.set_id;
  ELSE
    SELECT f.name INTO v_title FROM public.flashcard_files f WHERE f.id = NEW.file_id;
    SELECT count(DISTINCT s.id), count(c.id) INTO v_set_count, v_card_count
    FROM public.flashcard_sets s
    LEFT JOIN public.flashcards c ON c.set_id = s.id
    WHERE s.file_id = NEW.file_id AND s.user_id = NEW.sender_id;
  END IF;

  SELECT decrypted_secret INTO service_role_key
  FROM vault.decrypted_secrets
  WHERE name = 'email_queue_service_role_key';

  IF service_role_key IS NULL THEN
    RAISE WARNING 'send_flashcard_share_email: service role key not found in vault';
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := 'https://awvwrdjtptjyalmsyejt.supabase.co/functions/v1/send-transactional-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := jsonb_build_object(
      'templateName', CASE WHEN NEW.recipient_id IS NULL THEN 'flashcards-invite' ELSE 'flashcards-shared' END,
      'recipientEmail', NEW.recipient_email,
      'idempotencyKey', 'flashcard-share-' || NEW.id::text,
      'templateData', jsonb_build_object(
        'senderName', public.flashcard_share_sender_name(NEW.sender_id),
        'itemType', CASE WHEN NEW.set_id IS NOT NULL THEN 'set' ELSE 'file' END,
        'itemTitle', v_title,
        'setCount', v_set_count,
        'cardCount', v_card_count,
        'recipientEmail', NEW.recipient_email
      )
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- A failed email never blocks the share itself
  RAISE WARNING 'send_flashcard_share_email failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_flashcard_share_created ON public.flashcard_shares;
CREATE TRIGGER on_flashcard_share_created
  AFTER INSERT ON public.flashcard_shares
  FOR EACH ROW
  EXECUTE FUNCTION public.send_flashcard_share_email();

-- Internal: only the trigger runs it
REVOKE ALL ON FUNCTION public.send_flashcard_share_email() FROM PUBLIC, anon, authenticated;

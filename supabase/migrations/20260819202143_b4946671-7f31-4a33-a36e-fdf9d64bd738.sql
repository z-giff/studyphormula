CREATE OR REPLACE FUNCTION public.send_welcome_email_on_confirm()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  service_role_key text;
  payload jsonb;
BEGIN
  IF OLD.email_confirmed_at IS NOT NULL OR NEW.email_confirmed_at IS NULL THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.email_send_log
    WHERE recipient_email = NEW.email
      AND template_name = 'welcome'
      AND status IN ('pending', 'sent')
  ) THEN
    RETURN NEW;
  END IF;

  SELECT decrypted_secret INTO service_role_key
  FROM vault.decrypted_secrets
  WHERE name = 'email_queue_service_role_key';

  IF service_role_key IS NULL THEN
    RAISE WARNING 'send_welcome_email_on_confirm: service role key not found in vault';
    RETURN NEW;
  END IF;

  payload := jsonb_build_object(
    'templateName', 'welcome',
    'recipientEmail', NEW.email,
    'idempotencyKey', 'welcome-' || NEW.id::text,
    'templateData', jsonb_build_object(
      'fullName', COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    )
  );

  PERFORM net.http_post(
    url := 'https://awvwrdjtptjyalmsyejt.supabase.co/functions/v1/send-transactional-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := payload
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'send_welcome_email_on_confirm failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.send_welcome_email_on_confirm() FROM public;
GRANT EXECUTE ON FUNCTION public.send_welcome_email_on_confirm() TO service_role;

DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_email_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.send_welcome_email_on_confirm();
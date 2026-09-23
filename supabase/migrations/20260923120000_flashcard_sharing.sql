-- Share flashcard sets and files with other people by email.
--
-- A share points at one of the sender's sets or files. The recipient finds it
-- under "Shared flashcards", can flip through it read-only, and can add their
-- own copy to their dashboard. An address without an account gets an invite
-- email instead; the share waits under that address and attaches to the
-- account once someone signs up with it and confirms it.
--
-- Clients never read or write this table directly: everything goes through the
-- SECURITY DEFINER functions below. That is also how a recipient reads a set
-- they don't own without loosening RLS on flashcard_sets or flashcards, and
-- why a sender is never told whether an address belongs to an account.

CREATE TABLE public.flashcard_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Exactly one of these. Deleting the original takes the share with it.
  set_id uuid REFERENCES public.flashcard_sets(id) ON DELETE CASCADE,
  file_id uuid REFERENCES public.flashcard_files(id) ON DELETE CASCADE,
  -- Always lower case. recipient_id stays null until the address has a confirmed account.
  recipient_email text NOT NULL,
  recipient_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- Set when the recipient opens Shared flashcards; unseen shares light the red dot
  seen_at timestamptz,
  -- The recipient's own copy, once they add it to their dashboard
  added_at timestamptz,
  added_item_id uuid,
  -- Removed from the recipient's list
  dismissed_at timestamptz,
  CONSTRAINT flashcard_shares_one_item CHECK (num_nonnulls(set_id, file_id) = 1),
  CONSTRAINT flashcard_shares_email_lowercase CHECK (recipient_email = lower(recipient_email))
);

CREATE INDEX idx_flashcard_shares_recipient
  ON public.flashcard_shares (recipient_id, created_at DESC) WHERE dismissed_at IS NULL;
CREATE INDEX idx_flashcard_shares_pending_email
  ON public.flashcard_shares (recipient_email) WHERE recipient_id IS NULL;
CREATE INDEX idx_flashcard_shares_sender ON public.flashcard_shares (sender_id, created_at DESC);
CREATE INDEX idx_flashcard_shares_set ON public.flashcard_shares (set_id) WHERE set_id IS NOT NULL;
CREATE INDEX idx_flashcard_shares_file ON public.flashcard_shares (file_id) WHERE file_id IS NOT NULL;

-- Sharing the same thing with the same person again does nothing until they've
-- added or removed the first one.
CREATE UNIQUE INDEX flashcard_shares_open_set_unique
  ON public.flashcard_shares (set_id, recipient_email)
  WHERE set_id IS NOT NULL AND added_at IS NULL AND dismissed_at IS NULL;
CREATE UNIQUE INDEX flashcard_shares_open_file_unique
  ON public.flashcard_shares (file_id, recipient_email)
  WHERE file_id IS NOT NULL AND added_at IS NULL AND dismissed_at IS NULL;

ALTER TABLE public.flashcard_shares ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.flashcard_shares FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.flashcard_shares TO service_role;

-- ---------------------------------------------------------------------------
-- Internal helpers (not callable from the app)
-- ---------------------------------------------------------------------------

-- The name a recipient sees for the sender: their profile name, else their email.
CREATE FUNCTION public.flashcard_share_sender_name(p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(nullif(btrim(p.full_name), ''), u.email, 'Someone')
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE u.id = p_user_id
$$;

-- Copy one set, its sections and its cards into another user's account.
-- The copy starts fresh: no bookmarks, and it opens on the first card.
CREATE FUNCTION public.copy_flashcard_set(p_set_id uuid, p_owner uuid, p_file_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_set uuid;
  v_new_section uuid;
  v_section record;
  v_section_map jsonb := '{}'::jsonb;
BEGIN
  INSERT INTO public.flashcard_sets (user_id, title, description, color, file_id, last_card_index)
  SELECT p_owner, s.title, s.description, s.color, p_file_id, 0
  FROM public.flashcard_sets s
  WHERE s.id = p_set_id
  RETURNING id INTO v_new_set;

  FOR v_section IN
    SELECT id, title, "position" FROM public.sections WHERE set_id = p_set_id
  LOOP
    INSERT INTO public.sections (set_id, title, "position")
    VALUES (v_new_set, v_section.title, v_section."position")
    RETURNING id INTO v_new_section;
    v_section_map := v_section_map || jsonb_build_object(v_section.id::text, v_new_section);
  END LOOP;

  INSERT INTO public.flashcards (
    set_id, section_id, term, definition, image_url, "position",
    color, flashcard_type, interactive_data, is_bookmarked
  )
  SELECT v_new_set, (v_section_map ->> c.section_id::text)::uuid, c.term, c.definition, c.image_url,
         c."position", c.color, c.flashcard_type, c.interactive_data, false
  FROM public.flashcards c
  WHERE c.set_id = p_set_id;

  RETURN v_new_set;
END;
$$;

-- Queue the email for a new share: an invite when the address has no account
-- yet, otherwise a heads-up that something is waiting in Shared flashcards.
-- Same delivery path as the welcome email (send_welcome_email_on_confirm).
CREATE FUNCTION public.send_flashcard_share_email()
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

CREATE TRIGGER on_flashcard_share_created
  AFTER INSERT ON public.flashcard_shares
  FOR EACH ROW
  EXECUTE FUNCTION public.send_flashcard_share_email();

-- Hand shares that were waiting on an address to the account that confirms it.
CREATE FUNCTION public.link_pending_flashcard_shares()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NULL OR NEW.email_confirmed_at IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.flashcard_shares
  SET recipient_id = NEW.id
  WHERE recipient_id IS NULL
    AND recipient_email = lower(NEW.email)
    AND sender_id <> NEW.id;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block a sign-up over this
  RAISE WARNING 'link_pending_flashcard_shares failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_link_flashcard_shares ON auth.users;
CREATE TRIGGER on_auth_user_link_flashcard_shares
  AFTER INSERT OR UPDATE OF email, email_confirmed_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.link_pending_flashcard_shares();

-- ---------------------------------------------------------------------------
-- Called by the app
-- ---------------------------------------------------------------------------

-- Share one of your sets or files with up to 25 addresses at once. Every
-- address gets back one status: shared, already_shared, self or invalid.
-- "shared" covers both existing accounts and invites, so the result never
-- reveals who has an account.
CREATE FUNCTION public.share_flashcards(p_item_type text, p_item_id uuid, p_emails text[])
RETURNS TABLE (email text, status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_own_email text;
  v_emails text[];
  v_address text;
  v_recipient uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sign in to share flashcards' USING ERRCODE = '42501';
  END IF;

  IF p_item_type = 'set' THEN
    PERFORM 1 FROM public.flashcard_sets WHERE id = p_item_id AND user_id = v_uid;
  ELSIF p_item_type = 'file' THEN
    PERFORM 1 FROM public.flashcard_files WHERE id = p_item_id AND user_id = v_uid;
  ELSE
    RAISE EXCEPTION 'Unknown item type: %', p_item_type USING ERRCODE = '22023';
  END IF;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'That % no longer exists', p_item_type USING ERRCODE = 'P0002';
  END IF;

  -- Trimmed, lower-cased, de-duplicated, in the order they were typed
  SELECT array_agg(t.address ORDER BY t.first_seen) INTO v_emails
  FROM (
    SELECT lower(btrim(x)) AS address, min(n) AS first_seen
    FROM unnest(p_emails) WITH ORDINALITY AS u(x, n)
    WHERE btrim(x) <> ''
    GROUP BY 1
  ) t;

  IF coalesce(cardinality(v_emails), 0) = 0 THEN
    RAISE EXCEPTION 'Add at least one email address' USING ERRCODE = '22023';
  END IF;
  IF cardinality(v_emails) > 25 THEN
    RAISE EXCEPTION 'You can share with up to 25 people at a time' USING ERRCODE = '22023';
  END IF;

  SELECT lower(u.email) INTO v_own_email FROM auth.users u WHERE u.id = v_uid;

  FOREACH v_address IN ARRAY v_emails LOOP
    email := v_address;

    IF length(v_address) > 254 OR v_address !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' THEN
      status := 'invalid';
    ELSIF v_address = v_own_email THEN
      status := 'self';
    ELSE
      SELECT u.id INTO v_recipient
      FROM auth.users u
      WHERE lower(u.email) = v_address AND u.email_confirmed_at IS NOT NULL
      LIMIT 1;

      BEGIN
        INSERT INTO public.flashcard_shares (sender_id, set_id, file_id, recipient_email, recipient_id)
        VALUES (
          v_uid,
          CASE WHEN p_item_type = 'set' THEN p_item_id END,
          CASE WHEN p_item_type = 'file' THEN p_item_id END,
          v_address,
          v_recipient
        );
        status := 'shared';
      EXCEPTION WHEN unique_violation THEN
        status := 'already_shared';
      END;
    END IF;

    RETURN NEXT;
  END LOOP;

  -- Every share sends an email from phormula.co, so cap how many one person
  -- can send. Raising here rolls back this whole call, emails included.
  IF (
    SELECT count(*) FROM public.flashcard_shares s
    WHERE s.sender_id = v_uid AND s.created_at > now() - interval '1 hour'
  ) > 50 THEN
    RAISE EXCEPTION 'You''ve shared with a lot of people in the last hour. Try again a little later.'
      USING ERRCODE = '54000';
  END IF;
END;
$$;

-- Everything shared with the signed-in user that they haven't removed, newest first.
-- added_item_id is only set while their copy still exists, so a deleted copy
-- can be added again.
CREATE FUNCTION public.list_shared_flashcards()
RETURNS TABLE (
  id uuid,
  item_type text,
  title text,
  sender_name text,
  set_count integer,
  card_count integer,
  created_at timestamptz,
  seen_at timestamptz,
  added_item_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    sh.id,
    CASE WHEN sh.set_id IS NOT NULL THEN 'set' ELSE 'file' END,
    coalesce(s.title, f.name),
    public.flashcard_share_sender_name(sh.sender_id),
    (SELECT count(*)::integer FROM public.flashcard_sets x
      WHERE x.user_id = sh.sender_id AND (x.id = sh.set_id OR x.file_id = sh.file_id)),
    (SELECT count(*)::integer FROM public.flashcards c
      JOIN public.flashcard_sets x ON x.id = c.set_id
      WHERE x.user_id = sh.sender_id AND (x.id = sh.set_id OR x.file_id = sh.file_id)),
    sh.created_at,
    sh.seen_at,
    CASE
      WHEN sh.set_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.flashcard_sets x WHERE x.id = sh.added_item_id AND x.user_id = sh.recipient_id
      ) THEN sh.added_item_id
      WHEN sh.file_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.flashcard_files x WHERE x.id = sh.added_item_id AND x.user_id = sh.recipient_id
      ) THEN sh.added_item_id
    END
  FROM public.flashcard_shares sh
  LEFT JOIN public.flashcard_sets s ON s.id = sh.set_id
  LEFT JOIN public.flashcard_files f ON f.id = sh.file_id
  WHERE sh.recipient_id = auth.uid() AND sh.dismissed_at IS NULL
  ORDER BY sh.created_at DESC
$$;

-- Drives the red dot on the dashboard.
CREATE FUNCTION public.count_unseen_shared_flashcards()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::integer
  FROM public.flashcard_shares
  WHERE recipient_id = auth.uid() AND seen_at IS NULL AND dismissed_at IS NULL
$$;

-- Clears the red dot: called when the recipient opens Shared flashcards.
CREATE FUNCTION public.mark_shared_flashcards_seen()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.flashcard_shares
  SET seen_at = now()
  WHERE recipient_id = auth.uid() AND seen_at IS NULL
$$;

-- Take a share off the recipient's list.
CREATE FUNCTION public.dismiss_shared_flashcards(p_share_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.flashcard_shares
  SET dismissed_at = now(), seen_at = coalesce(seen_at, now())
  WHERE id = p_share_id AND recipient_id = auth.uid()
$$;

-- One share for the read-only viewer: its list entry plus the sets in it.
-- Null when it isn't the signed-in user's to see.
CREATE FUNCTION public.get_shared_flashcards(p_share_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT to_jsonb(l) || jsonb_build_object(
    'sets',
    (
      SELECT coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', x.id,
            'title', x.title,
            'description', x.description,
            'color', x.color,
            'card_count', (SELECT count(*) FROM public.flashcards c WHERE c.set_id = x.id)
          )
          ORDER BY x.created_at
        ),
        '[]'::jsonb
      )
      FROM public.flashcard_shares sh
      JOIN public.flashcard_sets x
        ON x.user_id = sh.sender_id AND (x.id = sh.set_id OR x.file_id = sh.file_id)
      WHERE sh.id = l.id
    )
  )
  FROM public.list_shared_flashcards() l
  WHERE l.id = p_share_id
$$;

-- The cards of one set in a share, for the read-only viewer. Bookmarks are the
-- sender's own, so they are left out.
CREATE FUNCTION public.get_shared_flashcard_cards(p_share_id uuid, p_set_id uuid)
RETURNS TABLE (
  id uuid,
  term text,
  definition text,
  image_url text,
  "position" integer,
  section_id uuid,
  color text,
  flashcard_type text,
  interactive_data jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.term, c.definition, c.image_url, c."position", c.section_id,
         c.color, c.flashcard_type, c.interactive_data
  FROM public.flashcard_shares sh
  JOIN public.flashcard_sets x
    ON x.id = p_set_id AND x.user_id = sh.sender_id AND (x.id = sh.set_id OR x.file_id = sh.file_id)
  JOIN public.flashcards c ON c.set_id = x.id
  WHERE sh.id = p_share_id AND sh.recipient_id = auth.uid() AND sh.dismissed_at IS NULL
  ORDER BY c."position"
$$;

-- Add a copy of a share to the recipient's dashboard: a set lands in their
-- sets, a file lands in their files with all of its sets. Adding again while
-- that copy still exists returns the same copy rather than making another.
CREATE FUNCTION public.add_shared_flashcards(p_share_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_share public.flashcard_shares%ROWTYPE;
  v_item_type text;
  v_new_id uuid;
  v_set record;
BEGIN
  SELECT * INTO v_share
  FROM public.flashcard_shares
  WHERE id = p_share_id AND recipient_id = v_uid AND dismissed_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This share is no longer available' USING ERRCODE = 'P0002';
  END IF;

  v_item_type := CASE WHEN v_share.set_id IS NOT NULL THEN 'set' ELSE 'file' END;

  SELECT l.added_item_id INTO v_new_id
  FROM public.list_shared_flashcards() l
  WHERE l.id = p_share_id;

  IF v_new_id IS NOT NULL THEN
    RETURN jsonb_build_object('item_type', v_item_type, 'item_id', v_new_id);
  END IF;

  IF v_item_type = 'set' THEN
    v_new_id := public.copy_flashcard_set(v_share.set_id, v_uid, NULL);
  ELSE
    INSERT INTO public.flashcard_files (user_id, name)
    SELECT v_uid, f.name FROM public.flashcard_files f WHERE f.id = v_share.file_id
    RETURNING id INTO v_new_id;

    FOR v_set IN
      SELECT s.id FROM public.flashcard_sets s
      WHERE s.file_id = v_share.file_id AND s.user_id = v_share.sender_id
      ORDER BY s.created_at
    LOOP
      PERFORM public.copy_flashcard_set(v_set.id, v_uid, v_new_id);
    END LOOP;
  END IF;

  UPDATE public.flashcard_shares
  SET added_at = now(), added_item_id = v_new_id, seen_at = coalesce(seen_at, now())
  WHERE id = p_share_id;

  RETURN jsonb_build_object('item_type', v_item_type, 'item_id', v_new_id);
END;
$$;

-- ---------------------------------------------------------------------------
-- Permissions: the helpers and triggers are internal; the app gets the rest.
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.flashcard_share_sender_name(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.copy_flashcard_set(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.send_flashcard_share_email() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.link_pending_flashcard_shares() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.share_flashcards(text, uuid, text[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_shared_flashcards() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.count_unseen_shared_flashcards() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mark_shared_flashcards_seen() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.dismiss_shared_flashcards(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_shared_flashcards(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_shared_flashcard_cards(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.add_shared_flashcards(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.share_flashcards(text, uuid, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_shared_flashcards() TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_unseen_shared_flashcards() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_shared_flashcards_seen() TO authenticated;
GRANT EXECUTE ON FUNCTION public.dismiss_shared_flashcards(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_shared_flashcards(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_shared_flashcard_cards(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_shared_flashcards(uuid) TO authenticated;

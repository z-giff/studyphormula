-- A free trial of Phormula Premium includes three uses of each of the
-- features that make something for the user: Auto-Flashcard
-- (generate-flashcards), text detection on interactive cards (detect-text)
-- and the MC Quiz. Everything else in the trial, and all of Premium on a paid
-- plan, is unlimited. Someone who wants more before the trial ends can start
-- their paid plan early (the billing function's start_plan action).
--
-- The counts are kept per account and feature. They only matter while the
-- subscription is trialing, and an email address gets one trial, so they
-- never need resetting.

CREATE TABLE public.premium_trial_usage (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature text NOT NULL CHECK (feature IN ('auto_flashcard', 'text_detection', 'quiz')),
  uses integer NOT NULL DEFAULT 0 CHECK (uses >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, feature)
);

ALTER TABLE public.premium_trial_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.premium_trial_usage FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.premium_trial_usage TO service_role;

-- Spelled out, as on subscriptions: only the functions below touch it
CREATE POLICY "No client access to premium trial usage"
  ON public.premium_trial_usage FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- How many uses of each of those features a free trial includes.
CREATE FUNCTION public.premium_trial_use_limit()
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 3
$$;

-- Take one use of a capped feature for the signed-in user, before it runs:
--   'premium_required'     no Premium
--   'unlimited'            a paid plan, so nothing is counted
--   'claimed'              a free trial with a use left, now counted
--   'trial_limit_reached'  a free trial that has used all of this feature's uses
-- Calls at the same moment can't take more than the limit between them: the
-- count only goes up while it is under the limit.
CREATE FUNCTION public.claim_premium_feature_use(p_feature text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  counted integer;
BEGIN
  IF p_feature IS NULL OR p_feature NOT IN ('auto_flashcard', 'text_detection', 'quiz') THEN
    RAISE EXCEPTION 'Unknown Premium feature: %', p_feature USING ERRCODE = '22023';
  END IF;
  IF me IS NULL OR NOT public.user_has_premium(me) THEN
    RETURN 'premium_required';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.user_id = me AND s.status = 'trialing') THEN
    RETURN 'unlimited';
  END IF;
  IF public.premium_trial_use_limit() < 1 THEN
    RETURN 'trial_limit_reached';
  END IF;

  INSERT INTO public.premium_trial_usage AS u (user_id, feature, uses)
  VALUES (me, p_feature, 1)
  ON CONFLICT (user_id, feature) DO UPDATE
    SET uses = u.uses + 1, updated_at = now()
    WHERE u.uses < public.premium_trial_use_limit()
  RETURNING u.uses INTO counted;

  RETURN CASE WHEN counted IS NULL THEN 'trial_limit_reached' ELSE 'claimed' END;
END;
$$;

-- Give back a use the feature didn't deliver, such as a generation the AI
-- service failed. Only the edge functions call this, never the app, so a use
-- can't be handed back to take another.
CREATE FUNCTION public.release_premium_feature_use(p_user_id uuid, p_feature text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.premium_trial_usage
  SET uses = uses - 1, updated_at = now()
  WHERE user_id = p_user_id AND feature = p_feature AND uses > 0
$$;

-- The signed-in user's trial uses so far: one row per capped feature, 0 for
-- one they haven't used. The app shows them while the trial lasts.
CREATE FUNCTION public.get_premium_trial_usage()
RETURNS TABLE (feature text, uses integer, use_limit integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT f.feature, coalesce(u.uses, 0), public.premium_trial_use_limit()
  FROM unnest(ARRAY['auto_flashcard', 'text_detection', 'quiz']) AS f(feature)
  LEFT JOIN public.premium_trial_usage u ON u.user_id = auth.uid() AND u.feature = f.feature
$$;

-- ---------------------------------------------------------------------------
-- Permissions: the app and the edge functions (as the signed-in user) claim
-- and read; only the edge functions (service role) give a use back.
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.premium_trial_use_limit() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_premium_feature_use(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.release_premium_feature_use(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_premium_trial_usage() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.claim_premium_feature_use(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_premium_feature_use(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_premium_trial_usage() TO authenticated;

-- Pre-launch waitlist
-- Only email is collected in this phase. All client access is denied via RLS
-- (no policies); rows are inserted exclusively by the `waitlist-signup` edge
-- function using the service role key, which also verifies the Turnstile
-- captcha before inserting.

CREATE TABLE public.waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  confirmation_sent_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- One signup per address, case-insensitive
CREATE UNIQUE INDEX waitlist_email_unique ON public.waitlist (lower(email));

-- Enable RLS with NO policies: anon/authenticated clients can neither read
-- nor write this table. Only the service role (edge function) can.
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Aggregate-only social proof for the landing page. SECURITY DEFINER lets
-- anonymous visitors read the count without any row-level access.
CREATE OR REPLACE FUNCTION public.waitlist_count()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*) FROM public.waitlist;
$$;

REVOKE ALL ON FUNCTION public.waitlist_count() FROM public;
GRANT EXECUTE ON FUNCTION public.waitlist_count() TO anon, authenticated;

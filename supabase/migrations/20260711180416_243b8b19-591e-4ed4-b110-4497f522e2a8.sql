CREATE TABLE public.waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  confirmation_sent_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX waitlist_email_unique ON public.waitlist (lower(email));

GRANT ALL ON public.waitlist TO service_role;

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

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
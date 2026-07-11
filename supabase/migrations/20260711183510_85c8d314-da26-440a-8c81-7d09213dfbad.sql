REVOKE EXECUTE ON FUNCTION public.waitlist_count() FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.waitlist_count() TO service_role;
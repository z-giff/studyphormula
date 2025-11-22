CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.7

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name'
  );
  RETURN new;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: flashcard_sets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.flashcard_sets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    color text DEFAULT '#3B82F6'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: flashcards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.flashcards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    set_id uuid NOT NULL,
    section_id uuid,
    term text NOT NULL,
    definition text NOT NULL,
    image_url text,
    "position" integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    color text
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text,
    full_name text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: sections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    set_id uuid NOT NULL,
    title text NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: flashcard_sets flashcard_sets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flashcard_sets
    ADD CONSTRAINT flashcard_sets_pkey PRIMARY KEY (id);


--
-- Name: flashcards flashcards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flashcards
    ADD CONSTRAINT flashcards_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: sections sections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sections
    ADD CONSTRAINT sections_pkey PRIMARY KEY (id);


--
-- Name: flashcard_sets update_flashcard_sets_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_flashcard_sets_updated_at BEFORE UPDATE ON public.flashcard_sets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: flashcards update_flashcards_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_flashcards_updated_at BEFORE UPDATE ON public.flashcards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: flashcard_sets flashcard_sets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flashcard_sets
    ADD CONSTRAINT flashcard_sets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: flashcards flashcards_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flashcards
    ADD CONSTRAINT flashcards_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.sections(id) ON DELETE SET NULL;


--
-- Name: flashcards flashcards_set_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flashcards
    ADD CONSTRAINT flashcards_set_id_fkey FOREIGN KEY (set_id) REFERENCES public.flashcard_sets(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: sections sections_set_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sections
    ADD CONSTRAINT sections_set_id_fkey FOREIGN KEY (set_id) REFERENCES public.flashcard_sets(id) ON DELETE CASCADE;


--
-- Name: flashcards Users can create flashcards in own sets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create flashcards in own sets" ON public.flashcards FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.flashcard_sets
  WHERE ((flashcard_sets.id = flashcards.set_id) AND (flashcard_sets.user_id = auth.uid())))));


--
-- Name: flashcard_sets Users can create own sets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own sets" ON public.flashcard_sets FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: sections Users can create sections in own sets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create sections in own sets" ON public.sections FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.flashcard_sets
  WHERE ((flashcard_sets.id = sections.set_id) AND (flashcard_sets.user_id = auth.uid())))));


--
-- Name: flashcards Users can delete flashcards in own sets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete flashcards in own sets" ON public.flashcards FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.flashcard_sets
  WHERE ((flashcard_sets.id = flashcards.set_id) AND (flashcard_sets.user_id = auth.uid())))));


--
-- Name: flashcard_sets Users can delete own sets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own sets" ON public.flashcard_sets FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: sections Users can delete sections in own sets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete sections in own sets" ON public.sections FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.flashcard_sets
  WHERE ((flashcard_sets.id = sections.set_id) AND (flashcard_sets.user_id = auth.uid())))));


--
-- Name: profiles Users can insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: flashcards Users can update flashcards in own sets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update flashcards in own sets" ON public.flashcards FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.flashcard_sets
  WHERE ((flashcard_sets.id = flashcards.set_id) AND (flashcard_sets.user_id = auth.uid())))));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: flashcard_sets Users can update own sets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own sets" ON public.flashcard_sets FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: sections Users can update sections in own sets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update sections in own sets" ON public.sections FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.flashcard_sets
  WHERE ((flashcard_sets.id = sections.set_id) AND (flashcard_sets.user_id = auth.uid())))));


--
-- Name: flashcards Users can view flashcards of own sets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view flashcards of own sets" ON public.flashcards FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.flashcard_sets
  WHERE ((flashcard_sets.id = flashcards.set_id) AND (flashcard_sets.user_id = auth.uid())))));


--
-- Name: profiles Users can view own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: flashcard_sets Users can view own sets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own sets" ON public.flashcard_sets FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: sections Users can view sections of own sets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view sections of own sets" ON public.sections FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.flashcard_sets
  WHERE ((flashcard_sets.id = sections.set_id) AND (flashcard_sets.user_id = auth.uid())))));


--
-- Name: flashcard_sets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.flashcard_sets ENABLE ROW LEVEL SECURITY;

--
-- Name: flashcards; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: sections; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--



--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.5

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
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO pg_database_owner;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
NEW.updated_at = NOW();
RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: user_binders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_binders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    name text NOT NULL,
    description text,
    binder_type text NOT NULL,
    set_code text,
    cards jsonb DEFAULT '[]'::jsonb,
    is_public boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT binder_type_constraint CHECK ((((binder_type = 'set'::text) AND (set_code IS NOT NULL) AND (cards = '[]'::jsonb)) OR ((binder_type = 'custom'::text) AND (set_code IS NULL)))),
    CONSTRAINT user_binders_binder_type_check CHECK ((binder_type = ANY (ARRAY['set'::text, 'custom'::text])))
);


ALTER TABLE public.user_binders OWNER TO postgres;

--
-- Name: user_collections; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_collections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    card_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    quantity_normal integer DEFAULT 0,
    quantity_foil integer DEFAULT 0,
    quantity_total integer GENERATED ALWAYS AS ((quantity_normal + quantity_foil)) STORED,
    CONSTRAINT user_collections_quantity_foil_check CHECK ((quantity_foil >= 0)),
    CONSTRAINT user_collections_quantity_normal_check CHECK ((quantity_normal >= 0)),
    CONSTRAINT user_collections_quantity_positive_check CHECK (((quantity_normal >= 0) AND (quantity_foil >= 0) AND ((quantity_normal + quantity_foil) > 0)))
);


ALTER TABLE public.user_collections OWNER TO postgres;

--
-- Name: user_collections_with_totals; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.user_collections_with_totals AS
 SELECT id,
    user_id,
    card_id,
    created_at,
    updated_at,
    quantity_normal,
    quantity_foil,
    quantity_total,
    (quantity_normal + quantity_foil) AS calculated_total
   FROM public.user_collections uc;


ALTER VIEW public.user_collections_with_totals OWNER TO postgres;

--
-- Name: user_decks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_decks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    name text NOT NULL,
    description text,
    cards jsonb DEFAULT '[]'::jsonb,
    is_public boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.user_decks OWNER TO postgres;

--
-- Name: user_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    display_name text NOT NULL,
    full_name text,
    location text,
    bio text,
    avatar_url text,
    is_public boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.user_profiles OWNER TO postgres;

--
-- Name: user_binders user_binders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_binders
    ADD CONSTRAINT user_binders_pkey PRIMARY KEY (id);


--
-- Name: user_collections user_collections_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_collections
    ADD CONSTRAINT user_collections_pkey PRIMARY KEY (id);


--
-- Name: user_collections user_collections_user_id_card_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_collections
    ADD CONSTRAINT user_collections_user_id_card_id_key UNIQUE (user_id, card_id);


--
-- Name: user_decks user_decks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_decks
    ADD CONSTRAINT user_decks_pkey PRIMARY KEY (id);


--
-- Name: user_profiles user_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (id);


--
-- Name: user_profiles user_profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_key UNIQUE (user_id);


--
-- Name: idx_user_binders_binder_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_binders_binder_type ON public.user_binders USING btree (binder_type);


--
-- Name: idx_user_binders_is_public; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_binders_is_public ON public.user_binders USING btree (is_public) WHERE (is_public = true);


--
-- Name: idx_user_binders_set_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_binders_set_code ON public.user_binders USING btree (set_code);


--
-- Name: idx_user_binders_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_binders_user_id ON public.user_binders USING btree (user_id);


--
-- Name: idx_user_collections_card_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_collections_card_id ON public.user_collections USING btree (card_id);


--
-- Name: idx_user_collections_quantity_foil; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_collections_quantity_foil ON public.user_collections USING btree (quantity_foil) WHERE (quantity_foil > 0);


--
-- Name: idx_user_collections_quantity_normal; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_collections_quantity_normal ON public.user_collections USING btree (quantity_normal) WHERE (quantity_normal > 0);


--
-- Name: idx_user_collections_quantity_total; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_collections_quantity_total ON public.user_collections USING btree (quantity_total) WHERE (quantity_total > 0);


--
-- Name: idx_user_collections_user_card; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_collections_user_card ON public.user_collections USING btree (user_id, card_id);


--
-- Name: idx_user_collections_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_collections_user_id ON public.user_collections USING btree (user_id);


--
-- Name: idx_user_decks_is_public; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_decks_is_public ON public.user_decks USING btree (is_public) WHERE (is_public = true);


--
-- Name: idx_user_decks_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_decks_user_id ON public.user_decks USING btree (user_id);


--
-- Name: idx_user_profiles_display_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_profiles_display_name ON public.user_profiles USING btree (display_name);


--
-- Name: idx_user_profiles_is_public; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_profiles_is_public ON public.user_profiles USING btree (is_public) WHERE (is_public = true);


--
-- Name: idx_user_profiles_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_profiles_user_id ON public.user_profiles USING btree (user_id);


--
-- Name: user_binders update_user_binders_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_user_binders_updated_at BEFORE UPDATE ON public.user_binders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_collections update_user_collections_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_user_collections_updated_at BEFORE UPDATE ON public.user_collections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_decks update_user_decks_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_user_decks_updated_at BEFORE UPDATE ON public.user_decks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_profiles update_user_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_binders user_binders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_binders
    ADD CONSTRAINT user_binders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_collections user_collections_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_collections
    ADD CONSTRAINT user_collections_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_decks user_decks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_decks
    ADD CONSTRAINT user_decks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_profiles user_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_collections Allow reading collections for published binder owners; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow reading collections for published binder owners" ON public.user_collections FOR SELECT USING ((user_id IN ( SELECT user_binders.user_id
   FROM public.user_binders
  WHERE (user_binders.is_public = true))));


--
-- Name: user_binders Users can delete their own binders; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete their own binders" ON public.user_binders FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: user_collections Users can delete their own collections; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete their own collections" ON public.user_collections FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: user_decks Users can delete their own decks; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete their own decks" ON public.user_decks FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: user_profiles Users can delete their own profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete their own profile" ON public.user_profiles FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: user_binders Users can insert their own binders; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert their own binders" ON public.user_binders FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_collections Users can insert their own collections; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert their own collections" ON public.user_collections FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_decks Users can insert their own decks; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert their own decks" ON public.user_decks FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert their own profile" ON public.user_profiles FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_binders Users can update their own binders; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update their own binders" ON public.user_binders FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: user_collections Users can update their own collections; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update their own collections" ON public.user_collections FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: user_decks Users can update their own decks; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update their own decks" ON public.user_decks FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: user_profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update their own profile" ON public.user_profiles FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: user_profiles Users can view public profiles; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view public profiles" ON public.user_profiles FOR SELECT USING (((is_public = true) OR (auth.uid() = user_id)));


--
-- Name: user_binders Users can view their own binders; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view their own binders" ON public.user_binders FOR SELECT USING (((auth.uid() = user_id) OR (is_public = true)));


--
-- Name: user_collections Users can view their own collections; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view their own collections" ON public.user_collections FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_decks Users can view their own decks; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view their own decks" ON public.user_decks FOR SELECT USING (((auth.uid() = user_id) OR (is_public = true)));


--
-- Name: user_binders; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.user_binders ENABLE ROW LEVEL SECURITY;

--
-- Name: user_collections; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.user_collections ENABLE ROW LEVEL SECURITY;

--
-- Name: user_decks; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.user_decks ENABLE ROW LEVEL SECURITY;

--
-- Name: user_profiles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: FUNCTION update_updated_at_column(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_updated_at_column() TO anon;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO authenticated;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO service_role;


--
-- Name: TABLE user_binders; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_binders TO anon;
GRANT ALL ON TABLE public.user_binders TO authenticated;
GRANT ALL ON TABLE public.user_binders TO service_role;


--
-- Name: TABLE user_collections; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_collections TO anon;
GRANT ALL ON TABLE public.user_collections TO authenticated;
GRANT ALL ON TABLE public.user_collections TO service_role;


--
-- Name: TABLE user_collections_with_totals; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_collections_with_totals TO anon;
GRANT ALL ON TABLE public.user_collections_with_totals TO authenticated;
GRANT ALL ON TABLE public.user_collections_with_totals TO service_role;


--
-- Name: TABLE user_decks; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_decks TO anon;
GRANT ALL ON TABLE public.user_decks TO authenticated;
GRANT ALL ON TABLE public.user_decks TO service_role;


--
-- Name: TABLE user_profiles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_profiles TO anon;
GRANT ALL ON TABLE public.user_profiles TO authenticated;
GRANT ALL ON TABLE public.user_profiles TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- PostgreSQL database dump complete
--


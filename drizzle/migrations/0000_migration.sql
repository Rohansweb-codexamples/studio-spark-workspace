CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT 'New member',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles readable by members" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1), 'New member'))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.channels TO authenticated;
GRANT ALL ON public.channels TO service_role;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "channels readable" ON public.channels FOR SELECT TO authenticated USING (true);
CREATE POLICY "channels create" ON public.channels FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
INSERT INTO public.channels (name) VALUES ('general'), ('design'), ('dev');

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages readable" ON public.messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "messages send" ON public.messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "messages delete own" ON public.messages FOR DELETE TO authenticated USING (auth.uid() = user_id);
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

CREATE TABLE public.sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]{2,40}$'),
  published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sites TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sites TO authenticated;
GRANT ALL ON public.sites TO service_role;
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "published sites public" ON public.sites FOR SELECT TO anon, authenticated USING (published OR auth.uid() = owner_id);
CREATE POLICY "own sites insert" ON public.sites FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "own sites update" ON public.sites FOR UPDATE TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "own sites delete" ON public.sites FOR DELETE TO authenticated USING (auth.uid() = owner_id);

CREATE TABLE public.site_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  path text NOT NULL,
  content text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (site_id, path)
);
GRANT SELECT ON public.site_files TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_files TO authenticated;
GRANT ALL ON public.site_files TO service_role;
ALTER TABLE public.site_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "files readable" ON public.site_files FOR SELECT TO anon, authenticated USING (EXISTS (SELECT 1 FROM public.sites s WHERE s.id = site_id AND (s.published OR s.owner_id = auth.uid())));
CREATE POLICY "own files write" ON public.site_files FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.sites s WHERE s.id = site_id AND s.owner_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.sites s WHERE s.id = site_id AND s.owner_id = auth.uid()));
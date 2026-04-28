
-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  craft_type TEXT,
  language TEXT NOT NULL DEFAULT 'en',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Works (registered creations)
CREATE TABLE public.works (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  certificate_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  image_path TEXT NOT NULL,
  perceptual_hash TEXT,
  ai_description TEXT,
  ai_tags TEXT[],
  location_text TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  status TEXT NOT NULL DEFAULT 'registered',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.works ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own works" ON public.works FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own works" ON public.works FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own works" ON public.works FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own works" ON public.works FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_works_user ON public.works(user_id, created_at DESC);

-- Scans (similarity checks)
CREATE TABLE public.scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  scanned_image_url TEXT NOT NULL,
  scanned_image_path TEXT NOT NULL,
  matched_work_id UUID REFERENCES public.works(id) ON DELETE SET NULL,
  similarity_score INT NOT NULL DEFAULT 0,
  ai_reasoning TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own scans" ON public.scans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own scans" ON public.scans FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_scans_user ON public.scans(user_id, created_at DESC);

-- Complaints
CREATE TABLE public.complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  scan_id UUID REFERENCES public.scans(id) ON DELETE SET NULL,
  work_id UUID REFERENCES public.works(id) ON DELETE SET NULL,
  language TEXT NOT NULL DEFAULT 'en',
  complaint_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own complaints" ON public.complaints FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own complaints" ON public.complaints FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own complaints" ON public.complaints FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX idx_complaints_user ON public.complaints(user_id, created_at DESC);

-- Auto-create profile trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, language)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'language', 'en')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Storage bucket (public so images render in certificates)
INSERT INTO storage.buckets (id, name, public) VALUES ('artisan-works', 'artisan-works', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read artisan-works" ON storage.objects FOR SELECT USING (bucket_id = 'artisan-works');
CREATE POLICY "Auth upload to own folder" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'artisan-works' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Auth update own files" ON storage.objects FOR UPDATE USING (
  bucket_id = 'artisan-works' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Auth delete own files" ON storage.objects FOR DELETE USING (
  bucket_id = 'artisan-works' AND auth.uid()::text = (storage.foldername(name))[1]
);

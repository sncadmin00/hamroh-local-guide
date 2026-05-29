
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Auto-promote the very first user to admin
CREATE OR REPLACE FUNCTION public.bootstrap_first_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER bootstrap_first_admin_trigger
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.bootstrap_first_admin();

-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- Cities
CREATE TABLE public.cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cities TO anon, authenticated;
GRANT ALL ON public.cities TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.cities TO authenticated;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cities are viewable by everyone" ON public.cities FOR SELECT USING (true);
CREATE POLICY "Admins manage cities" ON public.cities FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER cities_updated BEFORE UPDATE ON public.cities FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Guides
CREATE TABLE public.guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  city_id UUID NOT NULL REFERENCES public.cities(id) ON DELETE RESTRICT,
  photo_url TEXT,
  tagline TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  languages TEXT[] NOT NULL DEFAULT '{}',
  specialties TEXT[] NOT NULL DEFAULT '{}',
  price_per_day NUMERIC NOT NULL DEFAULT 0,
  rating NUMERIC NOT NULL DEFAULT 5,
  reviews INTEGER NOT NULL DEFAULT 0,
  verified BOOLEAN NOT NULL DEFAULT false,
  instant_book BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.guides TO anon, authenticated;
GRANT ALL ON public.guides TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.guides TO authenticated;
ALTER TABLE public.guides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Guides are viewable by everyone" ON public.guides FOR SELECT USING (true);
CREATE POLICY "Admins manage guides" ON public.guides FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER guides_updated BEFORE UPDATE ON public.guides FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX guides_city_id_idx ON public.guides(city_id);

-- Experiences
CREATE TABLE public.guide_experiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID NOT NULL REFERENCES public.guides(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  duration TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.guide_experiences TO anon, authenticated;
GRANT ALL ON public.guide_experiences TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.guide_experiences TO authenticated;
ALTER TABLE public.guide_experiences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Experiences viewable by everyone" ON public.guide_experiences FOR SELECT USING (true);
CREATE POLICY "Admins manage experiences" ON public.guide_experiences FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX guide_experiences_guide_id_idx ON public.guide_experiences(guide_id);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('guide-photos', 'guide-photos', true);
CREATE POLICY "Guide photos public read" ON storage.objects FOR SELECT USING (bucket_id = 'guide-photos');
CREATE POLICY "Admins upload guide photos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'guide-photos' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update guide photos" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'guide-photos' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete guide photos" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'guide-photos' AND public.has_role(auth.uid(), 'admin'));

-- Seed cities
INSERT INTO public.cities (name, slug, lat, lng, sort_order) VALUES
  ('Tashkent', 'tashkent', 41.2995, 69.2401, 1),
  ('Samarkand', 'samarkand', 39.6542, 66.9597, 2),
  ('Bukhara', 'bukhara', 39.7747, 64.4286, 3);

-- Seed guides
WITH c AS (SELECT id, name FROM public.cities)
INSERT INTO public.guides (slug, name, city_id, tagline, bio, languages, specialties, price_per_day, rating, reviews, verified, instant_book, sort_order)
VALUES
  ('aziz-tashkent', 'Aziz Karimov', (SELECT id FROM c WHERE name='Tashkent'),
    'Tashkent bazaars & Soviet-era stories',
    'Born and raised in Tashkent, I''ve spent 10 years showing visitors the layered history of Uzbekistan''s capital — from Chorsu Bazaar at dawn to the metro''s mosaic palaces.',
    ARRAY['English','Russian','Uzbek'], ARRAY['History','Food','Architecture'], 85, 4.9, 187, true, true, 1),
  ('malika-samarkand', 'Malika Yusupova', (SELECT id FROM c WHERE name='Samarkand'),
    'Registan after dark & artisan workshops',
    'Licensed art historian. I take small groups beyond the postcard shots — into silk paper workshops, family-run ceramics studios, and the quiet courtyards locals love.',
    ARRAY['English','French','Uzbek','Tajik'], ARRAY['Art','Crafts','Photography'], 110, 5.0, 243, true, true, 2),
  ('sherzod-bukhara', 'Sherzod Rakhmonov', (SELECT id FROM c WHERE name='Bukhara'),
    'Silk Road history in the old town',
    'Fifth-generation Bukharan. My family has lived steps from the Lyabi-Hauz for over a century — I share the city''s stories the way my grandfather shared them with me.',
    ARRAY['English','German','Uzbek','Persian'], ARRAY['History','Silk Road','Religion'], 90, 4.8, 156, true, false, 3),
  ('nigora-tashkent', 'Nigora Saidova', (SELECT id FROM c WHERE name='Tashkent'),
    'Modern Tashkent, food, and nightlife',
    'Tashkent''s contemporary side — third-wave coffee, design studios, and the restaurants locals actually book. Perfect for travelers who''ve already done the classics.',
    ARRAY['English','Russian','Korean'], ARRAY['Food','Nightlife','Modern culture'], 80, 4.9, 92, true, true, 4);

-- Seed experiences
INSERT INTO public.guide_experiences (guide_id, title, duration, price, sort_order)
SELECT g.id, e.title, e.duration, e.price, e.sort_order FROM public.guides g
JOIN (VALUES
  ('aziz-tashkent','Chorsu Bazaar food walk','3 hours',45,1),
  ('aziz-tashkent','Full-day Tashkent classics','8 hours',85,2),
  ('aziz-tashkent','Soviet metro architecture tour','2 hours',35,3),
  ('malika-samarkand','Registan Square private tour','3 hours',55,1),
  ('malika-samarkand','Artisan workshop day','6 hours',95,2),
  ('malika-samarkand','Shahi-Zinda sunset photo walk','2 hours',40,3),
  ('sherzod-bukhara','Old town walking tour','4 hours',50,1),
  ('sherzod-bukhara','Full-day Bukhara deep dive','8 hours',90,2),
  ('sherzod-bukhara','Evening tea house & music','2 hours',35,3),
  ('nigora-tashkent','Hidden coffee & dessert crawl','3 hours',40,1),
  ('nigora-tashkent','Local dinner & live music','4 hours',65,2),
  ('nigora-tashkent','Design district walk','2 hours',30,3)
) e(slug, title, duration, price, sort_order) ON g.slug = e.slug;

-- ============ TOURS ============
CREATE TABLE public.tours (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  short_description TEXT NOT NULL DEFAULT '',
  description_md TEXT NOT NULL DEFAULT '',
  cover_url TEXT,
  city_id UUID NOT NULL,
  duration_hours NUMERIC NOT NULL DEFAULT 0,
  price_from NUMERIC NOT NULL DEFAULT 0,
  highlights TEXT[] NOT NULL DEFAULT '{}',
  included TEXT[] NOT NULL DEFAULT '{}',
  not_included TEXT[] NOT NULL DEFAULT '{}',
  published BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.tours TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tours TO authenticated;
GRANT ALL ON public.tours TO service_role;

ALTER TABLE public.tours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published tours viewable by everyone"
  ON public.tours FOR SELECT
  USING (published = true);

CREATE POLICY "Admins manage tours"
  ON public.tours FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER tours_set_updated_at
  BEFORE UPDATE ON public.tours
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---- tour_guides (many-to-many) ----
CREATE TABLE public.tour_guides (
  tour_id UUID NOT NULL,
  guide_id UUID NOT NULL,
  PRIMARY KEY (tour_id, guide_id)
);

GRANT SELECT ON public.tour_guides TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tour_guides TO authenticated;
GRANT ALL ON public.tour_guides TO service_role;

ALTER TABLE public.tour_guides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tour-guide links viewable by everyone"
  ON public.tour_guides FOR SELECT USING (true);

CREATE POLICY "Admins manage tour-guide links"
  ON public.tour_guides FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---- tour_categories (many-to-many) ----
CREATE TABLE public.tour_categories (
  tour_id UUID NOT NULL,
  category_id UUID NOT NULL,
  PRIMARY KEY (tour_id, category_id)
);

GRANT SELECT ON public.tour_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tour_categories TO authenticated;
GRANT ALL ON public.tour_categories TO service_role;

ALTER TABLE public.tour_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tour-category links viewable by everyone"
  ON public.tour_categories FOR SELECT USING (true);

CREATE POLICY "Admins manage tour-category links"
  ON public.tour_categories FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ SPOTLIGHTS ============
CREATE TABLE public.spotlights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kind TEXT NOT NULL DEFAULT 'news',
  title_en TEXT NOT NULL DEFAULT '',
  title_uz TEXT NOT NULL DEFAULT '',
  title_ru TEXT NOT NULL DEFAULT '',
  description_en TEXT NOT NULL DEFAULT '',
  description_uz TEXT NOT NULL DEFAULT '',
  description_ru TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  href TEXT NOT NULL DEFAULT '/',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT spotlights_kind_check CHECK (kind IN ('new_guide','new_route','news','new_tour'))
);

GRANT SELECT ON public.spotlights TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.spotlights TO authenticated;
GRANT ALL ON public.spotlights TO service_role;

ALTER TABLE public.spotlights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active spotlights viewable by everyone"
  ON public.spotlights FOR SELECT
  USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

CREATE POLICY "Admins manage spotlights"
  ON public.spotlights FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER spotlights_set_updated_at
  BEFORE UPDATE ON public.spotlights
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_spotlights_active_sort ON public.spotlights (is_active, sort_order);
CREATE INDEX idx_tours_published_sort ON public.tours (published, sort_order);
CREATE INDEX idx_tours_city ON public.tours (city_id);

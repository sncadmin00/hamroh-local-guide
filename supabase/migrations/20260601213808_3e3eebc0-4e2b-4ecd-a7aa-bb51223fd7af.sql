-- PLACES: рестораны, достопримечательности, маршруты, активности
CREATE TABLE public.places (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  city_id UUID NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'attraction',
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  short_description TEXT NOT NULL DEFAULT '',
  body_md TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  photo_url TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  published BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.places TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.places TO authenticated;
GRANT ALL ON public.places TO service_role;

ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published places viewable by everyone"
ON public.places FOR SELECT
USING (published = true);

CREATE POLICY "Admins manage places"
ON public.places FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER places_set_updated_at
BEFORE UPDATE ON public.places
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_places_city ON public.places(city_id);
CREATE INDEX idx_places_category ON public.places(category);
CREATE INDEX idx_places_published ON public.places(published);

-- PLACE_GUIDES: какие гиды водят на это место
CREATE TABLE public.place_guides (
  place_id UUID NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  guide_id UUID NOT NULL REFERENCES public.guides(id) ON DELETE CASCADE,
  PRIMARY KEY (place_id, guide_id)
);

GRANT SELECT ON public.place_guides TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.place_guides TO authenticated;
GRANT ALL ON public.place_guides TO service_role;

ALTER TABLE public.place_guides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Place-guide links viewable by everyone"
ON public.place_guides FOR SELECT
USING (true);

CREATE POLICY "Admins manage place-guide links"
ON public.place_guides FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- PLACE_SUGGESTIONS: что AI нашёл через web search, ждёт модерации
CREATE TABLE public.place_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  city_id UUID REFERENCES public.cities(id) ON DELETE SET NULL,
  city_name TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'attraction',
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  source_url TEXT NOT NULL DEFAULT '',
  raw_query TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.place_suggestions TO authenticated;
GRANT ALL ON public.place_suggestions TO service_role;

ALTER TABLE public.place_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage place suggestions"
ON public.place_suggestions FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_place_suggestions_status ON public.place_suggestions(status);
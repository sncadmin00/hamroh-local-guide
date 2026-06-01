-- Categories table
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories viewable by everyone"
  ON public.categories FOR SELECT
  USING (true);

CREATE POLICY "Admins manage categories"
  ON public.categories FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER categories_set_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Link table guide <-> category
CREATE TABLE public.guide_categories (
  guide_id UUID NOT NULL,
  category_id UUID NOT NULL,
  PRIMARY KEY (guide_id, category_id)
);

CREATE INDEX idx_guide_categories_category ON public.guide_categories(category_id);
CREATE INDEX idx_guide_categories_guide ON public.guide_categories(guide_id);

GRANT SELECT ON public.guide_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guide_categories TO authenticated;
GRANT ALL ON public.guide_categories TO service_role;

ALTER TABLE public.guide_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guide categories viewable by everyone"
  ON public.guide_categories FOR SELECT
  USING (true);

CREATE POLICY "Admins manage guide categories"
  ON public.guide_categories FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Seed starter categories
INSERT INTO public.categories (slug, name, icon, description, sort_order) VALUES
  ('gastro', 'Gastro', 'utensils', 'Food tours, tastings, local cuisine', 10),
  ('mountains', 'Mountains & Nature', 'mountain', 'Hiking, trekking, outdoor adventures', 20),
  ('old-city', 'Old City & History', 'landmark', 'Historic districts, monuments, architecture', 30),
  ('crafts', 'Crafts & Bazaars', 'shopping-basket', 'Artisans, workshops, traditional markets', 40),
  ('culture', 'Culture & Art', 'palette', 'Museums, galleries, performances', 50),
  ('photo', 'Photo Tours', 'camera', 'Best spots and golden-hour photography', 60);

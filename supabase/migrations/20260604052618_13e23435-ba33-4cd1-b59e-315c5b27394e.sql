
-- 1. Extend tours
ALTER TABLE public.tours
  ADD COLUMN guide_id uuid,
  ADD COLUMN price_by_language jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN transport_included boolean NOT NULL DEFAULT false,
  ADD COLUMN languages text[] NOT NULL DEFAULT '{}'::text[];

-- 2. Backfill guide_id on existing admin tours (first linked guide)
UPDATE public.tours t
SET guide_id = sub.guide_id
FROM (
  SELECT DISTINCT ON (tour_id) tour_id, guide_id
  FROM public.tour_guides
  ORDER BY tour_id, guide_id
) sub
WHERE sub.tour_id = t.id;

-- Backfill languages from owning guide's languages where empty
UPDATE public.tours t
SET languages = g.languages
FROM public.guides g
WHERE t.guide_id = g.id
  AND (t.languages = '{}'::text[] OR t.languages IS NULL)
  AND g.languages IS NOT NULL;

-- 3. Migrate guide_experiences into tours
INSERT INTO public.tours (
  id, slug, title, short_description, description_md,
  city_id, duration_hours, price_from, highlights, included, not_included,
  published, sort_order, guide_id, price_by_language, languages, transport_included
)
SELECT
  ge.id,
  -- slug: guide-slug + slugified title; ensure uniqueness with short id suffix
  lower(regexp_replace(g.slug || '-' || ge.title, '[^a-zA-Z0-9]+', '-', 'g'))
    || '-' || substr(ge.id::text, 1, 6),
  ge.title,
  '',
  '',
  g.city_id,
  -- parse "8 hours" / "2-3 ч" → first integer, fallback 2
  COALESCE(NULLIF(regexp_replace(ge.duration, '[^0-9].*$', ''), '')::numeric, 2),
  ge.price,
  '{}'::text[], '{}'::text[], '{}'::text[],
  true,
  ge.sort_order,
  ge.guide_id,
  COALESCE(ge.price_by_language, '{}'::jsonb),
  COALESCE(g.languages, '{}'::text[]),
  false
FROM public.guide_experiences ge
JOIN public.guides g ON g.id = ge.guide_id;

-- 4. Make guide_id NOT NULL on tours (all rows now have an owner)
ALTER TABLE public.tours ALTER COLUMN guide_id SET NOT NULL;
ALTER TABLE public.tours
  ADD CONSTRAINT tours_guide_id_fkey FOREIGN KEY (guide_id)
  REFERENCES public.guides(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS tours_guide_id_idx ON public.tours(guide_id);

-- 5. Extend guides with multi-city
ALTER TABLE public.guides
  ADD COLUMN extra_city_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];

-- 6. Extend bookings
ALTER TABLE public.bookings
  ADD COLUMN tour_id uuid REFERENCES public.tours(id) ON DELETE SET NULL,
  ADD COLUMN language text;
CREATE INDEX IF NOT EXISTS bookings_tour_id_idx ON public.bookings(tour_id);

-- 7. Drop join + experiences tables
DROP TABLE IF EXISTS public.tour_guides CASCADE;
DROP TABLE IF EXISTS public.guide_experiences CASCADE;

-- 8. Update RLS on tours so guide owners can manage their own
DROP POLICY IF EXISTS "Admins manage tours" ON public.tours;
DROP POLICY IF EXISTS "Published tours viewable by everyone" ON public.tours;

CREATE POLICY "Tours viewable by everyone when published"
  ON public.tours FOR SELECT
  USING (published = true);

CREATE POLICY "Guide owner views own tours"
  ON public.tours FOR SELECT
  TO authenticated
  USING (public.is_guide_owner(auth.uid(), guide_id));

CREATE POLICY "Admins view all tours"
  ON public.tours FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Guide owner manages own tours"
  ON public.tours FOR ALL
  TO authenticated
  USING (public.is_guide_owner(auth.uid(), guide_id))
  WITH CHECK (public.is_guide_owner(auth.uid(), guide_id));

CREATE POLICY "Admins manage tours"
  ON public.tours FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Make sure grants are in place
GRANT SELECT ON public.tours TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tours TO authenticated;
GRANT ALL ON public.tours TO service_role;

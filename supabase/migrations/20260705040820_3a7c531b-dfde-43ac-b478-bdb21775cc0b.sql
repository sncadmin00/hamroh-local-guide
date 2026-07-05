-- 1) cities.approved
ALTER TABLE public.cities
  ADD COLUMN IF NOT EXISTS approved boolean NOT NULL DEFAULT true;

-- Backfill: all existing cities remain approved (default already true, but be explicit)
UPDATE public.cities SET approved = true WHERE approved IS DISTINCT FROM true;

-- Replace the public SELECT policy so only approved cities are visible to non-admins.
DROP POLICY IF EXISTS "Cities are viewable by everyone" ON public.cities;
CREATE POLICY "Approved cities are viewable by everyone"
  ON public.cities
  FOR SELECT
  USING (approved = true OR public.has_role(auth.uid(), 'admin'::app_role));

-- 2) guide_applications multi-city fields
ALTER TABLE public.guide_applications
  ADD COLUMN IF NOT EXISTS city_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS proposed_cities text[] NOT NULL DEFAULT '{}'::text[];

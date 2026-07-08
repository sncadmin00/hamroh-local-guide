-- Flexible tour pricing model
-- Adds three independent pricing modes (fixed / per_person / by_group) that a
-- guide can enable in any combination, plus an explicit max_guests capacity.
-- Old columns (pricing_mode, group_prices, price_from) are kept for a
-- transition period; new code reads from the new columns.

ALTER TABLE public.tours
  ADD COLUMN IF NOT EXISTS pricing_modes    text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS fixed_price      numeric,
  ADD COLUMN IF NOT EXISTS per_person_price numeric,
  ADD COLUMN IF NOT EXISTS group_tiers      jsonb,
  ADD COLUMN IF NOT EXISTS max_guests       integer;

-- Allowed values in pricing_modes
ALTER TABLE public.tours
  DROP CONSTRAINT IF EXISTS tours_pricing_modes_check;
ALTER TABLE public.tours
  ADD CONSTRAINT tours_pricing_modes_check
  CHECK (
    pricing_modes <@ ARRAY['fixed','per_person','by_group']::text[]
  );

ALTER TABLE public.tours
  DROP CONSTRAINT IF EXISTS tours_max_guests_check;
ALTER TABLE public.tours
  ADD CONSTRAINT tours_max_guests_check
  CHECK (max_guests IS NULL OR max_guests >= 1);

-- Validate group_tiers structure and non-overlap.
-- Shape: jsonb array of {min:int, max:int, price:number}, min<=max,
-- price>0, sorted ascending, no overlaps.
CREATE OR REPLACE FUNCTION public.validate_group_tiers(_tiers jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  t jsonb;
  prev_max int := 0;
  cur_min int;
  cur_max int;
  cur_price numeric;
BEGIN
  IF _tiers IS NULL THEN RETURN true; END IF;
  IF jsonb_typeof(_tiers) <> 'array' THEN RETURN false; END IF;
  FOR t IN SELECT * FROM jsonb_array_elements(_tiers)
  LOOP
    IF jsonb_typeof(t) <> 'object' THEN RETURN false; END IF;
    IF (t ? 'min') = false OR (t ? 'max') = false OR (t ? 'price') = false THEN
      RETURN false;
    END IF;
    cur_min := (t->>'min')::int;
    cur_max := (t->>'max')::int;
    cur_price := (t->>'price')::numeric;
    IF cur_min < 1 OR cur_max < cur_min OR cur_price <= 0 THEN RETURN false; END IF;
    IF cur_min <= prev_max THEN RETURN false; END IF;
    prev_max := cur_max;
  END LOOP;
  RETURN true;
END;
$$;

ALTER TABLE public.tours
  DROP CONSTRAINT IF EXISTS tours_group_tiers_check;
ALTER TABLE public.tours
  ADD CONSTRAINT tours_group_tiers_check
  CHECK (public.validate_group_tiers(group_tiers));

-- Backfill from legacy pricing_mode/group_prices/price_from.
-- fixed: pricing_modes=['fixed'], fixed_price from group_prices.fixed or price_from
-- by_group: pricing_modes=['by_group'], build tiers from offered categories.
DO $$
DECLARE
  r record;
  gp jsonb;
  tiers jsonb;
  prev_max int;
  max_cap int;
  cat text;
  cat_max int;
  price numeric;
  cats text[] := ARRAY['private','small','group','large'];
  cat_maxes int[] := ARRAY[2, 6, 12, 25];
  i int;
BEGIN
  FOR r IN
    SELECT id, pricing_mode, group_prices, price_from
    FROM public.tours
    WHERE (pricing_modes IS NULL OR array_length(pricing_modes, 1) IS NULL)
  LOOP
    gp := COALESCE(r.group_prices, '{}'::jsonb);
    IF r.pricing_mode = 'by_group' THEN
      tiers := '[]'::jsonb;
      prev_max := 0;
      max_cap := NULL;
      FOR i IN 1..array_length(cats, 1) LOOP
        cat := cats[i];
        cat_max := cat_maxes[i];
        price := NULLIF(gp->>cat, '')::numeric;
        IF price IS NOT NULL AND price > 0 THEN
          tiers := tiers || jsonb_build_array(jsonb_build_object(
            'min', prev_max + 1,
            'max', cat_max,
            'price', price
          ));
          prev_max := cat_max;
          max_cap := cat_max;
        END IF;
      END LOOP;
      IF jsonb_array_length(tiers) > 0 THEN
        UPDATE public.tours
        SET pricing_modes = ARRAY['by_group'],
            group_tiers = tiers,
            max_guests = max_cap
        WHERE id = r.id;
      END IF;
    ELSE
      -- treat everything else as fixed
      price := COALESCE(NULLIF(gp->>'fixed', '')::numeric, r.price_from);
      IF price IS NOT NULL AND price > 0 THEN
        UPDATE public.tours
        SET pricing_modes = ARRAY['fixed'],
            fixed_price = price
        WHERE id = r.id;
      END IF;
    END IF;
  END LOOP;
END $$;

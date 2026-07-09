ALTER TABLE public.tours
  ADD COLUMN IF NOT EXISTS pricing_base_language text;

-- Backfill existing rows: pricing base = current base_language (backward compatible)
UPDATE public.tours
  SET pricing_base_language = base_language
  WHERE pricing_base_language IS NULL;
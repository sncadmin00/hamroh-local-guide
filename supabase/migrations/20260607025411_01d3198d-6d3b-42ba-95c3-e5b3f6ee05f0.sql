ALTER TABLE public.tours
  ADD COLUMN IF NOT EXISTS highlights_ru text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS highlights_en text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS highlights_uz text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS included_ru text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS included_en text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS included_uz text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS not_included_ru text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS not_included_en text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS not_included_uz text[] NOT NULL DEFAULT '{}';

UPDATE public.tours
SET
  highlights_ru = CASE WHEN cardinality(highlights_ru) = 0 THEN highlights ELSE highlights_ru END,
  highlights_en = CASE WHEN cardinality(highlights_en) = 0 THEN highlights ELSE highlights_en END,
  highlights_uz = CASE WHEN cardinality(highlights_uz) = 0 THEN highlights ELSE highlights_uz END,
  included_ru = CASE WHEN cardinality(included_ru) = 0 THEN included ELSE included_ru END,
  included_en = CASE WHEN cardinality(included_en) = 0 THEN included ELSE included_en END,
  included_uz = CASE WHEN cardinality(included_uz) = 0 THEN included ELSE included_uz END,
  not_included_ru = CASE WHEN cardinality(not_included_ru) = 0 THEN not_included ELSE not_included_ru END,
  not_included_en = CASE WHEN cardinality(not_included_en) = 0 THEN not_included ELSE not_included_en END,
  not_included_uz = CASE WHEN cardinality(not_included_uz) = 0 THEN not_included ELSE not_included_uz END;
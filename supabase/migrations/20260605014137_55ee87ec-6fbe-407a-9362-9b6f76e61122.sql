
ALTER TABLE public.tours
  ADD COLUMN IF NOT EXISTS title_ru text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS title_uz text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS title_en text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS short_description_ru text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS short_description_uz text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS short_description_en text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS description_md_ru text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS description_md_uz text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS description_md_en text NOT NULL DEFAULT '';

-- Backfill: put current content into _en (existing titles are English)
UPDATE public.tours
SET title_en = COALESCE(NULLIF(title_en, ''), title),
    short_description_en = COALESCE(NULLIF(short_description_en, ''), short_description),
    description_md_en = COALESCE(NULLIF(description_md_en, ''), description_md)
WHERE title_en = '' OR short_description_en = '' OR description_md_en = '';

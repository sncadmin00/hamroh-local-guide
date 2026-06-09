ALTER TABLE public.guide_applications
  ADD COLUMN IF NOT EXISTS has_certificate boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS certificate_url text;

ALTER TABLE public.guides
  ADD COLUMN IF NOT EXISTS licensed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS license_url text,
  ADD COLUMN IF NOT EXISTS licensed_at timestamptz;
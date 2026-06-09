ALTER TABLE public.guide_applications
  ADD COLUMN IF NOT EXISTS certificate_confirmed boolean NOT NULL DEFAULT false;
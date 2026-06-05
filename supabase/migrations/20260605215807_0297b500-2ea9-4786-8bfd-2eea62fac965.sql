ALTER TABLE public.guides
  ADD COLUMN IF NOT EXISTS has_transport boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS transport_seats integer;

ALTER TABLE public.guide_applications
  ADD COLUMN IF NOT EXISTS has_transport boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS transport_seats integer;
ALTER TABLE public.tours
  ADD COLUMN IF NOT EXISTS meeting_lat double precision,
  ADD COLUMN IF NOT EXISTS meeting_lng double precision,
  ADD COLUMN IF NOT EXISTS end_lat double precision,
  ADD COLUMN IF NOT EXISTS end_lng double precision;
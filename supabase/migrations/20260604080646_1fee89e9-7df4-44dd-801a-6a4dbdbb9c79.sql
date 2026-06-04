ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS proposed_date date,
  ADD COLUMN IF NOT EXISTS proposed_time time without time zone,
  ADD COLUMN IF NOT EXISTS proposed_note text,
  ADD COLUMN IF NOT EXISTS proposed_at timestamp with time zone;
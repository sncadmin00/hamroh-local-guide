ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS expires_at timestamptz;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS expired_at timestamptz;

-- Backfill: set expires_at for existing pending bookings to created_at + 24h
UPDATE public.bookings
SET expires_at = created_at + interval '24 hours'
WHERE status = 'pending' AND expires_at IS NULL;

CREATE INDEX IF NOT EXISTS bookings_pending_expires_idx
  ON public.bookings (expires_at)
  WHERE status = 'pending';
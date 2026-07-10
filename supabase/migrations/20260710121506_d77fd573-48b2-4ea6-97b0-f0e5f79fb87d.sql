
ALTER TABLE public.guides
  ADD COLUMN IF NOT EXISTS payout_method text CHECK (payout_method IN ('bank','click','payme','cash','other')),
  ADD COLUMN IF NOT EXISTS payout_details jsonb,
  ADD COLUMN IF NOT EXISTS payout_details_updated_at timestamptz;

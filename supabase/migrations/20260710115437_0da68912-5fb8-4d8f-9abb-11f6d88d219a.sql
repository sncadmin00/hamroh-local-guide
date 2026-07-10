
CREATE TABLE public.payout_change_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL CHECK (purpose IN ('update_payout_details','request_payout')),
  code_hash TEXT NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  token_hash TEXT,
  token_expires_at TIMESTAMPTZ,
  delivery_channel TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payout_challenges_user ON public.payout_change_challenges(user_id, created_at DESC);
CREATE INDEX idx_payout_challenges_token ON public.payout_change_challenges(token_hash) WHERE token_hash IS NOT NULL;

GRANT ALL ON public.payout_change_challenges TO service_role;
ALTER TABLE public.payout_change_challenges ENABLE ROW LEVEL SECURITY;
-- No policies: table is server-only (accessed via supabaseAdmin in hooks).

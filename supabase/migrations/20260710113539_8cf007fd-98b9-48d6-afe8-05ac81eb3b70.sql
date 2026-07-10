
CREATE TABLE public.telegram_link_codes (
  code TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  telegram_user_id BIGINT
);
CREATE INDEX idx_telegram_link_codes_user ON public.telegram_link_codes(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.telegram_link_codes TO authenticated;
GRANT ALL ON public.telegram_link_codes TO service_role;
ALTER TABLE public.telegram_link_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own link codes" ON public.telegram_link_codes
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.telegram_signin_nonces (
  nonce TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  telegram_user_id BIGINT,
  action_link TEXT
);
GRANT ALL ON public.telegram_signin_nonces TO service_role;
ALTER TABLE public.telegram_signin_nonces ENABLE ROW LEVEL SECURITY;
-- No policies: only service role (bot webhook + hooks) touches this table.

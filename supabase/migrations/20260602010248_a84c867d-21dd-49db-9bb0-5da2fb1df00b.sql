CREATE TABLE public.telegram_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID UNIQUE,
  telegram_user_id BIGINT NOT NULL UNIQUE,
  telegram_chat_id BIGINT,
  telegram_username TEXT,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  photo_url TEXT,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.telegram_accounts TO authenticated;
GRANT ALL ON public.telegram_accounts TO service_role;

ALTER TABLE public.telegram_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own Telegram account"
ON public.telegram_accounts
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users insert their own Telegram account"
ON public.telegram_accounts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update their own Telegram account"
ON public.telegram_accounts
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete their own Telegram account"
ON public.telegram_accounts
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX idx_telegram_accounts_user_id ON public.telegram_accounts(user_id);
CREATE INDEX idx_telegram_accounts_chat_id ON public.telegram_accounts(telegram_chat_id);

CREATE TRIGGER telegram_accounts_set_updated_at
BEFORE UPDATE ON public.telegram_accounts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.bookings
  ALTER COLUMN customer_email DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS customer_telegram_user_id BIGINT,
  ADD COLUMN IF NOT EXISTS customer_telegram_chat_id BIGINT,
  ADD COLUMN IF NOT EXISTS customer_telegram_username TEXT;

CREATE INDEX IF NOT EXISTS idx_bookings_customer_telegram_user_id
ON public.bookings(customer_telegram_user_id);
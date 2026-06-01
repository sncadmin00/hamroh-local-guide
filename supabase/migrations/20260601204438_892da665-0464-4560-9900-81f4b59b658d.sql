-- 1. Add cancellation reason to bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS cancellation_reason text;

-- 2. Newsletter subscribers
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL UNIQUE,
  locale text NOT NULL DEFAULT 'ru',
  user_id uuid,
  source text NOT NULL DEFAULT 'signup',
  confirmed_at timestamp with time zone NOT NULL DEFAULT now(),
  unsubscribed_at timestamp with time zone,
  last_sent_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_newsletter_active
  ON public.newsletter_subscribers (confirmed_at)
  WHERE unsubscribed_at IS NULL;

-- Grants (anon can insert via opt-in, admins manage, service role full)
GRANT INSERT ON public.newsletter_subscribers TO anon;
GRANT INSERT ON public.newsletter_subscribers TO authenticated;
GRANT SELECT, UPDATE ON public.newsletter_subscribers TO authenticated;
GRANT ALL ON public.newsletter_subscribers TO service_role;

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Anyone (incl. anon) can opt-in
CREATE POLICY "Anyone can subscribe to newsletter"
  ON public.newsletter_subscribers
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Logged-in user can read their own row
CREATE POLICY "Users view own subscription"
  ON public.newsletter_subscribers
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins manage all
CREATE POLICY "Admins manage newsletter subscribers"
  ON public.newsletter_subscribers
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- updated_at trigger
CREATE TRIGGER newsletter_subscribers_set_updated_at
  BEFORE UPDATE ON public.newsletter_subscribers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
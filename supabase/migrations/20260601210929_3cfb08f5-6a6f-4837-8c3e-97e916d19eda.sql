-- 1. Feedback
CREATE TABLE public.feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  page TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.feedback TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feedback TO authenticated;
GRANT ALL ON public.feedback TO service_role;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit feedback"
  ON public.feedback FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins view all feedback"
  ON public.feedback FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete feedback"
  ON public.feedback FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Analytics events
CREATE TABLE public.analytics_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  event TEXT NOT NULL,
  props JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.analytics_events TO anon;
GRANT SELECT, INSERT ON public.analytics_events TO authenticated;
GRANT ALL ON public.analytics_events TO service_role;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log events"
  ON public.analytics_events FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins view all events"
  ON public.analytics_events FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_analytics_events_created_at ON public.analytics_events(created_at DESC);
CREATE INDEX idx_analytics_events_event ON public.analytics_events(event);

-- 3. Referral system
ALTER TABLE public.guides ADD COLUMN referral_code TEXT UNIQUE;
CREATE INDEX idx_guides_referral_code ON public.guides(referral_code);

-- Backfill referral codes for existing guides
UPDATE public.guides
SET referral_code = lower(substring(replace(id::text, '-', ''), 1, 8))
WHERE referral_code IS NULL;

CREATE TABLE public.referral_clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guide_id UUID NOT NULL,
  referral_code TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT '',
  user_agent TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.referral_clicks TO anon;
GRANT SELECT, INSERT ON public.referral_clicks TO authenticated;
GRANT ALL ON public.referral_clicks TO service_role;
ALTER TABLE public.referral_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log referral clicks"
  ON public.referral_clicks FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Guide views own referral clicks"
  ON public.referral_clicks FOR SELECT TO authenticated
  USING (is_guide_owner(auth.uid(), guide_id));

CREATE POLICY "Admins view all referral clicks"
  ON public.referral_clicks FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_referral_clicks_guide_id ON public.referral_clicks(guide_id);
CREATE INDEX idx_referral_clicks_created_at ON public.referral_clicks(created_at DESC);
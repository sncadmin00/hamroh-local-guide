
-- ============================================================
-- 3) EMERGENCY CONTACTS
-- ============================================================
CREATE TABLE public.emergency_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id uuid REFERENCES public.cities(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('police','ambulance','fire','tourist_police','consulate','other')),
  label text NOT NULL,
  phone text NOT NULL,
  country_code text,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.emergency_contacts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.emergency_contacts TO authenticated;
GRANT ALL ON public.emergency_contacts TO service_role;

ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published emergency contacts"
  ON public.emergency_contacts FOR SELECT
  USING (is_published = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage emergency contacts"
  ON public.emergency_contacts FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_emergency_contacts_city ON public.emergency_contacts(city_id) WHERE is_published;
CREATE TRIGGER trg_emergency_contacts_updated_at BEFORE UPDATE ON public.emergency_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 5) LOCAL EVENTS
-- ============================================================
CREATE TABLE public.local_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id uuid NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  date_start date NOT NULL,
  date_end date NOT NULL,
  cover_url text,
  source_url text,
  is_published boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (date_end >= date_start)
);

GRANT SELECT ON public.local_events TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.local_events TO authenticated;
GRANT ALL ON public.local_events TO service_role;

ALTER TABLE public.local_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published local events"
  ON public.local_events FOR SELECT
  USING (is_published = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage local events"
  ON public.local_events FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_local_events_city_dates ON public.local_events(city_id, date_start, date_end) WHERE is_published;
CREATE TRIGGER trg_local_events_updated_at BEFORE UPDATE ON public.local_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 4) REFERRAL PROGRAM (tourist -> tourist)
-- ============================================================

-- Referral codes per user
CREATE TABLE public.user_referral_codes (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.user_referral_codes TO authenticated;
GRANT ALL ON public.user_referral_codes TO service_role;

ALTER TABLE public.user_referral_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own referral code"
  ON public.user_referral_codes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Personal promo codes
CREATE TABLE public.user_promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  kind text NOT NULL CHECK (kind IN ('percent','fixed')),
  value numeric NOT NULL CHECK (value > 0),
  currency text NOT NULL DEFAULT 'UZS',
  min_booking_amount numeric,
  max_discount numeric,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz,
  used_at timestamptz,
  used_booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('referral','manual','campaign')),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.user_promo_codes TO authenticated;
GRANT ALL ON public.user_promo_codes TO service_role;

ALTER TABLE public.user_promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own promo codes"
  ON public.user_promo_codes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_user_promo_codes_user ON public.user_promo_codes(user_id) WHERE used_at IS NULL;

-- Referral relationships
CREATE TABLE public.user_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','qualified','rewarded')),
  qualifying_booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  reward_promo_code_id uuid REFERENCES public.user_promo_codes(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  qualified_at timestamptz,
  rewarded_at timestamptz,
  CHECK (referrer_user_id <> referred_user_id)
);

GRANT SELECT ON public.user_referrals TO authenticated;
GRANT ALL ON public.user_referrals TO service_role;

ALTER TABLE public.user_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view referrals they participate in"
  ON public.user_referrals FOR SELECT
  TO authenticated
  USING (auth.uid() = referrer_user_id OR auth.uid() = referred_user_id);

CREATE INDEX idx_user_referrals_referrer ON public.user_referrals(referrer_user_id);

-- ------------------------------------------------------------
-- Helper: generate a unique referral code
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_user_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_attempt int := 0;
BEGIN
  LOOP
    -- 8-char base32-ish uppercase
    v_code := upper(substr(replace(encode(gen_random_bytes(6),'base64'),'/',''), 1, 8));
    v_code := regexp_replace(v_code, '[^A-Z0-9]', 'X', 'g');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.user_referral_codes WHERE code = v_code);
    v_attempt := v_attempt + 1;
    IF v_attempt > 10 THEN
      RAISE EXCEPTION 'Could not generate unique referral code';
    END IF;
  END LOOP;
  RETURN v_code;
END;
$$;

-- ------------------------------------------------------------
-- Trigger: on booking completion, qualify referral & issue promo
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.referrals_on_booking_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref public.user_referrals;
  v_promo_id uuid;
  v_promo_code text;
BEGIN
  -- Only act on transition into 'completed'
  IF NEW.status <> 'completed' OR OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;

  -- Find a pending referral where THIS user is the referred one
  SELECT * INTO v_ref
    FROM public.user_referrals
    WHERE referred_user_id = NEW.user_id
      AND status = 'pending'
    LIMIT 1;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Issue a promo code to the REFERRER: 10% off, max 100000 UZS, 90 days validity
  v_promo_code := 'REF-' || upper(substr(replace(encode(gen_random_bytes(6),'base64'),'/',''), 1, 8));
  v_promo_code := regexp_replace(v_promo_code, '[^A-Z0-9\-]', 'X', 'g');

  INSERT INTO public.user_promo_codes (
    user_id, code, kind, value, currency, max_discount, valid_until, source
  )
  VALUES (
    v_ref.referrer_user_id, v_promo_code, 'percent', 10, 'UZS', 100000,
    now() + interval '90 days', 'referral'
  )
  RETURNING id INTO v_promo_id;

  UPDATE public.user_referrals
    SET status = 'rewarded',
        qualifying_booking_id = NEW.id,
        reward_promo_code_id = v_promo_id,
        qualified_at = now(),
        rewarded_at = now()
    WHERE id = v_ref.id;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'referrals_on_booking_completed failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_referrals_on_booking_completed
  AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.referrals_on_booking_completed();

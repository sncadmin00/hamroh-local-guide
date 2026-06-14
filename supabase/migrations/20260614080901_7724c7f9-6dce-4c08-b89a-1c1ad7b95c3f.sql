
-- 1. Settings defaults
INSERT INTO public.app_settings (key, value) VALUES
  ('service_fee_percent', '0.05'::jsonb),
  ('payout_day', '10'::jsonb),
  ('min_settlement_amount', '50000'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 2. Bookings extensions
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'cash'
    CHECK (payment_method IN ('cash','online')),
  ADD COLUMN IF NOT EXISTS tour_price numeric(12,2),
  ADD COLUMN IF NOT EXISTS service_fee_amount numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_amount numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS guide_payout_amount numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS service_fee_status text NOT NULL DEFAULT 'pending'
    CHECK (service_fee_status IN ('pending','paid','refunded','waived')),
  ADD COLUMN IF NOT EXISTS service_fee_paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS statement_id uuid;

-- Backfill existing bookings: tour_price = total
UPDATE public.bookings SET tour_price = total WHERE tour_price IS NULL;

-- 3. Auto-calc trigger
CREATE OR REPLACE FUNCTION public.calc_booking_amounts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_commission_pct numeric;
  v_service_fee_pct numeric;
  v_price numeric;
BEGIN
  SELECT (value)::text::numeric INTO v_commission_pct
    FROM public.app_settings WHERE key = 'hamroh_commission_rate';
  v_commission_pct := COALESCE(v_commission_pct, 0.15);

  SELECT (value)::text::numeric INTO v_service_fee_pct
    FROM public.app_settings WHERE key = 'service_fee_percent';
  v_service_fee_pct := COALESCE(v_service_fee_pct, 0.05);

  v_price := COALESCE(NEW.tour_price, NEW.total, 0);
  IF NEW.tour_price IS NULL THEN NEW.tour_price := v_price; END IF;

  NEW.commission_amount := ROUND(v_price * v_commission_pct, 2);
  NEW.service_fee_amount := ROUND(v_price * v_service_fee_pct, 2);

  IF NEW.payment_method = 'online' THEN
    NEW.guide_payout_amount := ROUND(v_price - NEW.commission_amount, 2);
    NEW.total := ROUND(v_price + NEW.service_fee_amount, 2);
  ELSE
    NEW.guide_payout_amount := 0;
    NEW.total := ROUND(v_price + NEW.service_fee_amount, 2);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_calc_booking_amounts ON public.bookings;
CREATE TRIGGER trg_calc_booking_amounts
  BEFORE INSERT OR UPDATE OF tour_price, payment_method ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.calc_booking_amounts();

-- 4. Monthly statements
CREATE SEQUENCE IF NOT EXISTS public.statement_number_seq START 1;

CREATE TABLE IF NOT EXISTS public.monthly_statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id uuid NOT NULL REFERENCES public.guides(id) ON DELETE CASCADE,
  statement_number text UNIQUE NOT NULL,
  period_year int NOT NULL,
  period_month int NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  online_revenue numeric(12,2) NOT NULL DEFAULT 0,
  online_payout_to_guide numeric(12,2) NOT NULL DEFAULT 0,
  online_bookings_count int NOT NULL DEFAULT 0,
  cash_revenue numeric(12,2) NOT NULL DEFAULT 0,
  cash_commission_to_us numeric(12,2) NOT NULL DEFAULT 0,
  cash_bookings_count int NOT NULL DEFAULT 0,
  net_amount numeric(12,2) NOT NULL DEFAULT 0,
  direction text NOT NULL CHECK (direction IN ('payout','invoice','zero')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','settled','rolled_over','cancelled')),
  due_date date,
  settled_at timestamptz,
  payment_method text,
  payment_reference text,
  pdf_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (guide_id, period_year, period_month)
);

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_statement_id_fkey
  FOREIGN KEY (statement_id) REFERENCES public.monthly_statements(id) ON DELETE SET NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.monthly_statements TO authenticated;
GRANT ALL ON public.monthly_statements TO service_role;

ALTER TABLE public.monthly_statements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guides view own statements"
  ON public.monthly_statements FOR SELECT TO authenticated
  USING (public.is_guide_owner(auth.uid(), guide_id));

CREATE POLICY "Admins manage all statements"
  ON public.monthly_statements FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_statements_updated_at
  BEFORE UPDATE ON public.monthly_statements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto statement_number
CREATE OR REPLACE FUNCTION public.set_statement_number()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.statement_number IS NULL OR NEW.statement_number = '' THEN
    NEW.statement_number := 'STM-' || NEW.period_year::text || '-' ||
      lpad(nextval('public.statement_number_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_statement_number
  BEFORE INSERT ON public.monthly_statements
  FOR EACH ROW EXECUTE FUNCTION public.set_statement_number();

CREATE INDEX IF NOT EXISTS idx_statements_guide_period
  ON public.monthly_statements(guide_id, period_year DESC, period_month DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_statement
  ON public.bookings(statement_id) WHERE statement_id IS NOT NULL;

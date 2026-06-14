
-- 1. app_settings
CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings readable by authenticated" ON public.app_settings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "settings writable by admin" ON public.app_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.app_settings(key, value) VALUES ('hamroh_commission_rate', '0.15'::jsonb);

-- 2. guides: tax fields
ALTER TABLE public.guides
  ADD COLUMN IF NOT EXISTS tax_status text NOT NULL DEFAULT 'none'
    CHECK (tax_status IN ('none','self_employed','ip')),
  ADD COLUMN IF NOT EXISTS tax_id text;

-- 3. Payout number sequence
CREATE SEQUENCE IF NOT EXISTS public.payout_number_seq START 1;

-- 4. payouts
CREATE TABLE public.payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id uuid NOT NULL REFERENCES public.guides(id) ON DELETE CASCADE,
  payout_number text NOT NULL UNIQUE,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'UZS',
  method text NOT NULL DEFAULT 'bank'
    CHECK (method IN ('bank','click','payme','cash','other')),
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled','processing','paid','failed')),
  scheduled_at timestamptz,
  paid_at timestamptz,
  reference text,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payouts TO authenticated;
GRANT ALL ON public.payouts TO service_role;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payouts: guide reads own" ON public.payouts
  FOR SELECT TO authenticated
  USING (
    public.is_guide_owner(auth.uid(), guide_id)
    OR public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY "payouts: admin writes" ON public.payouts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX payouts_guide_idx ON public.payouts(guide_id);
CREATE INDEX payouts_status_idx ON public.payouts(status);

-- Auto-fill payout_number
CREATE OR REPLACE FUNCTION public.set_payout_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.payout_number IS NULL OR NEW.payout_number = '' THEN
    NEW.payout_number := 'PAY-' || to_char(now(),'YYYY') || '-' ||
      lpad(nextval('public.payout_number_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_payout_number
  BEFORE INSERT ON public.payouts
  FOR EACH ROW EXECUTE FUNCTION public.set_payout_number();

CREATE TRIGGER trg_payouts_updated_at
  BEFORE UPDATE ON public.payouts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. payout_items
CREATE TABLE public.payout_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id uuid NOT NULL REFERENCES public.payouts(id) ON DELETE CASCADE,
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE RESTRICT,
  gross_amount numeric NOT NULL DEFAULT 0,
  commission_amount numeric NOT NULL DEFAULT 0,
  net_amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(booking_id)
);
GRANT SELECT ON public.payout_items TO authenticated;
GRANT ALL ON public.payout_items TO service_role;
ALTER TABLE public.payout_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payout_items: read via payout" ON public.payout_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.payouts p
      WHERE p.id = payout_id
        AND (public.is_guide_owner(auth.uid(), p.guide_id) OR public.has_role(auth.uid(), 'admin'))
    )
  );
CREATE POLICY "payout_items: admin writes" ON public.payout_items
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX payout_items_payout_idx ON public.payout_items(payout_id);
CREATE INDEX payout_items_booking_idx ON public.payout_items(booking_id);


-- Enum for expense categories (excludes 'tours' — tours come from bookings)
DO $$ BEGIN
  CREATE TYPE public.wallet_expense_category AS ENUM ('accommodation','food','transport','souvenirs','other');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 1) trip_wallets
CREATE TABLE public.trip_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trip_wallets_date_order CHECK (end_date >= start_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_wallets TO authenticated;
GRANT ALL ON public.trip_wallets TO service_role;

ALTER TABLE public.trip_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own wallets" ON public.trip_wallets
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX trip_wallets_user_idx ON public.trip_wallets(user_id, start_date DESC);

CREATE TRIGGER trip_wallets_set_updated_at
  BEFORE UPDATE ON public.trip_wallets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) wallet_expenses
CREATE TABLE public.wallet_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES public.trip_wallets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category public.wallet_expense_category NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  note text,
  spent_on date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wallet_expenses TO authenticated;
GRANT ALL ON public.wallet_expenses TO service_role;

ALTER TABLE public.wallet_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own expenses" ON public.wallet_expenses
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX wallet_expenses_wallet_idx ON public.wallet_expenses(wallet_id, spent_on DESC);
CREATE INDEX wallet_expenses_user_idx ON public.wallet_expenses(user_id);

-- 3) Summary RPC
CREATE OR REPLACE FUNCTION public.get_wallet_summary(_wallet_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_wallet public.trip_wallets;
  v_expenses jsonb;
  v_bookings jsonb;
  v_totals jsonb;
  v_tours_total numeric;
  v_grand numeric;
BEGIN
  SELECT * INTO v_wallet FROM public.trip_wallets WHERE id = _wallet_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;
  IF v_wallet.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(e.*) ORDER BY e.spent_on DESC, e.created_at DESC), '[]'::jsonb)
    INTO v_expenses
    FROM public.wallet_expenses e
    WHERE e.wallet_id = _wallet_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', b.id,
      'date', b.date,
      'experience', b.experience,
      'total', b.total,
      'status', b.status
    ) ORDER BY b.date DESC), '[]'::jsonb),
    COALESCE(SUM(b.total), 0)
    INTO v_bookings, v_tours_total
    FROM public.bookings b
    WHERE b.user_id = v_wallet.user_id
      AND b.date BETWEEN v_wallet.start_date AND v_wallet.end_date
      AND b.status IN ('confirmed','completed');

  SELECT jsonb_build_object(
      'accommodation', COALESCE(SUM(CASE WHEN category = 'accommodation' THEN amount END), 0),
      'food',          COALESCE(SUM(CASE WHEN category = 'food'          THEN amount END), 0),
      'transport',     COALESCE(SUM(CASE WHEN category = 'transport'     THEN amount END), 0),
      'souvenirs',     COALESCE(SUM(CASE WHEN category = 'souvenirs'     THEN amount END), 0),
      'other',         COALESCE(SUM(CASE WHEN category = 'other'         THEN amount END), 0),
      'tours',         v_tours_total
    )
    INTO v_totals
    FROM public.wallet_expenses
    WHERE wallet_id = _wallet_id;

  v_grand := (v_totals->>'accommodation')::numeric
           + (v_totals->>'food')::numeric
           + (v_totals->>'transport')::numeric
           + (v_totals->>'souvenirs')::numeric
           + (v_totals->>'other')::numeric
           + (v_totals->>'tours')::numeric;

  RETURN jsonb_build_object(
    'wallet', to_jsonb(v_wallet),
    'expenses', v_expenses,
    'bookings', v_bookings,
    'totals_by_category', v_totals,
    'grand_total', v_grand
  );
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.get_wallet_summary(uuid) TO authenticated;

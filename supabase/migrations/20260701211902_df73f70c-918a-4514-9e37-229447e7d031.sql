
-- notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text,
  icon text,
  category text,
  link text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications" ON public.notifications
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX notifications_user_idx ON public.notifications(user_id, created_at DESC);

-- trip_budgets
CREATE TABLE public.trip_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  city text,
  start_date date,
  end_date date,
  travelers int NOT NULL DEFAULT 1,
  currency text NOT NULL DEFAULT 'USD',
  items jsonb NOT NULL DEFAULT '{}'::jsonb,
  total numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_budgets TO authenticated;
GRANT ALL ON public.trip_budgets TO service_role;
ALTER TABLE public.trip_budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own budgets" ON public.trip_budgets
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trip_budgets_updated BEFORE UPDATE ON public.trip_budgets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- travel_diaries
CREATE TABLE public.travel_diaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  city text,
  start_date date,
  end_date date,
  cover_url text,
  days jsonb NOT NULL DEFAULT '[]'::jsonb,
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.travel_diaries TO authenticated;
GRANT ALL ON public.travel_diaries TO service_role;
ALTER TABLE public.travel_diaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own diaries read" ON public.travel_diaries
  FOR SELECT USING (auth.uid() = user_id OR is_public = true);
CREATE POLICY "own diaries write" ON public.travel_diaries
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own diaries update" ON public.travel_diaries
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own diaries delete" ON public.travel_diaries
  FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER travel_diaries_updated BEFORE UPDATE ON public.travel_diaries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- Reviews table for clients to rate completed bookings
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL UNIQUE,
  guide_id UUID NOT NULL,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read reviews (public guide profiles)
CREATE POLICY "Reviews viewable by everyone"
  ON public.reviews FOR SELECT
  TO public
  USING (true);

-- A client can submit a review only for their own COMPLETED booking, once
CREATE POLICY "Client inserts review for own completed booking"
  ON public.reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND b.user_id = auth.uid()
        AND b.guide_id = reviews.guide_id
        AND b.status = 'completed'
    )
  );

-- Client can edit/delete own review
CREATE POLICY "Client updates own review"
  ON public.reviews FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Client deletes own review"
  ON public.reviews FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Admins manage all reviews
CREATE POLICY "Admins manage reviews"
  ON public.reviews FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_reviews_guide_id ON public.reviews(guide_id);
CREATE INDEX idx_reviews_user_id ON public.reviews(user_id);

CREATE TRIGGER set_reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Recompute guide aggregate rating & reviews count
CREATE OR REPLACE FUNCTION public.recompute_guide_rating(_guide_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_avg NUMERIC;
BEGIN
  SELECT COUNT(*), COALESCE(AVG(rating), 5)
    INTO v_count, v_avg
    FROM public.reviews
    WHERE guide_id = _guide_id;

  UPDATE public.guides
    SET reviews = v_count,
        rating = ROUND(v_avg::numeric, 2)
    WHERE id = _guide_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reviews_after_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recompute_guide_rating(OLD.guide_id);
    RETURN OLD;
  ELSE
    PERFORM public.recompute_guide_rating(NEW.guide_id);
    IF TG_OP = 'UPDATE' AND OLD.guide_id <> NEW.guide_id THEN
      PERFORM public.recompute_guide_rating(OLD.guide_id);
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

CREATE TRIGGER reviews_recompute_rating
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.reviews_after_change();

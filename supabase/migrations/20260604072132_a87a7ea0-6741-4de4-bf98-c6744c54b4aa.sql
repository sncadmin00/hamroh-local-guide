
-- 1. Clear existing reviews (per user request)
DELETE FROM public.reviews;

-- 2. Add tour_id to reviews (now safe — table is empty)
ALTER TABLE public.reviews ADD COLUMN tour_id uuid NOT NULL;

-- 3. Unique: one review per booking
ALTER TABLE public.reviews ADD CONSTRAINT reviews_booking_unique UNIQUE (booking_id);

-- 4. Add rating + reviews_count to tours
ALTER TABLE public.tours
  ADD COLUMN rating numeric NOT NULL DEFAULT 5,
  ADD COLUMN reviews_count integer NOT NULL DEFAULT 0;

-- 5. Helper to recompute tour rating
CREATE OR REPLACE FUNCTION public.recompute_tour_rating(_tour_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_avg numeric;
BEGIN
  SELECT COUNT(*), COALESCE(AVG(rating), 5)
    INTO v_count, v_avg
    FROM public.reviews
    WHERE tour_id = _tour_id;

  UPDATE public.tours
    SET reviews_count = v_count,
        rating = ROUND(v_avg::numeric, 2)
    WHERE id = _tour_id;
END;
$$;

-- 6. Reset guide review counts (since we deleted reviews)
UPDATE public.guides SET rating = 5, reviews = 0;

-- 7. Update reviews trigger to recompute BOTH guide and tour
CREATE OR REPLACE FUNCTION public.reviews_after_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recompute_guide_rating(OLD.guide_id);
    PERFORM public.recompute_tour_rating(OLD.tour_id);
    RETURN OLD;
  ELSE
    PERFORM public.recompute_guide_rating(NEW.guide_id);
    PERFORM public.recompute_tour_rating(NEW.tour_id);
    IF TG_OP = 'UPDATE' THEN
      IF OLD.guide_id <> NEW.guide_id THEN
        PERFORM public.recompute_guide_rating(OLD.guide_id);
      END IF;
      IF OLD.tour_id <> NEW.tour_id THEN
        PERFORM public.recompute_tour_rating(OLD.tour_id);
      END IF;
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

-- Ensure trigger exists (in case it wasn't created before)
DROP TRIGGER IF EXISTS reviews_after_change_trg ON public.reviews;
CREATE TRIGGER reviews_after_change_trg
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.reviews_after_change();

-- 8. Update RLS insert policy: now also requires tour_id matches booking's tour_id
DROP POLICY IF EXISTS "Client inserts review for own completed booking" ON public.reviews;
CREATE POLICY "Client inserts review for own completed booking"
ON public.reviews
FOR INSERT
TO authenticated
WITH CHECK (
  (user_id = auth.uid())
  AND (EXISTS (
    SELECT 1
    FROM public.bookings b
    WHERE b.id = reviews.booking_id
      AND b.user_id = auth.uid()
      AND b.guide_id = reviews.guide_id
      AND b.tour_id = reviews.tour_id
      AND b.status = 'completed'
  ))
);

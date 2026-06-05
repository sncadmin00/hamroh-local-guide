
-- Add verification fields to guides
ALTER TABLE public.guides
  ADD COLUMN IF NOT EXISTS identity_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS identity_phone text,
  ADD COLUMN IF NOT EXISTS identity_passport_url text,
  ADD COLUMN IF NOT EXISTS identity_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS identity_rejected_reason text,
  ADD COLUMN IF NOT EXISTS intro_video_url text,
  ADD COLUMN IF NOT EXISTS intro_video_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS intro_video_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS intro_video_rejected_reason text,
  ADD COLUMN IF NOT EXISTS completed_tours_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_response_minutes numeric;

-- Allow guide owner to update verification submission fields (admin policy already exists)
DROP POLICY IF EXISTS "Guide owner updates own verification" ON public.guides;
CREATE POLICY "Guide owner updates own verification" ON public.guides
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Function: recompute completed_tours_count
CREATE OR REPLACE FUNCTION public.recompute_guide_completed_tours(_guide_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.guides
  SET completed_tours_count = (
    SELECT COUNT(*) FROM public.bookings
    WHERE guide_id = _guide_id AND status = 'completed'
  )
  WHERE id = _guide_id;
END;
$$;

-- Function: recompute avg_response_minutes (median of guide's first response time per booking)
CREATE OR REPLACE FUNCTION public.recompute_guide_response_time(_guide_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_median numeric;
BEGIN
  WITH first_client_msg AS (
    SELECT booking_id, MIN(created_at) AS client_at
    FROM public.booking_messages
    WHERE sender_role = 'client'
    GROUP BY booking_id
  ),
  first_guide_response AS (
    SELECT bm.booking_id, MIN(bm.created_at) AS guide_at, fcm.client_at
    FROM public.booking_messages bm
    JOIN first_client_msg fcm ON fcm.booking_id = bm.booking_id
    WHERE bm.sender_role = 'guide' AND bm.created_at > fcm.client_at
    GROUP BY bm.booking_id, fcm.client_at
  ),
  diffs AS (
    SELECT EXTRACT(EPOCH FROM (fgr.guide_at - fgr.client_at)) / 60.0 AS minutes
    FROM first_guide_response fgr
    JOIN public.bookings b ON b.id = fgr.booking_id
    WHERE b.guide_id = _guide_id
  )
  SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY minutes) INTO v_median FROM diffs;

  UPDATE public.guides SET avg_response_minutes = v_median WHERE id = _guide_id;
END;
$$;

-- Trigger: on booking status change -> recompute completed_tours
CREATE OR REPLACE FUNCTION public.bookings_recompute_guide_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recompute_guide_completed_tours(OLD.guide_id);
    RETURN OLD;
  END IF;
  PERFORM public.recompute_guide_completed_tours(NEW.guide_id);
  IF TG_OP = 'UPDATE' AND OLD.guide_id <> NEW.guide_id THEN
    PERFORM public.recompute_guide_completed_tours(OLD.guide_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bookings_recompute_guide_stats ON public.bookings;
CREATE TRIGGER trg_bookings_recompute_guide_stats
  AFTER INSERT OR UPDATE OF status, guide_id OR DELETE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.bookings_recompute_guide_stats();

-- Trigger: on new booking message -> recompute response time
CREATE OR REPLACE FUNCTION public.messages_recompute_response_time()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guide_id uuid;
BEGIN
  SELECT guide_id INTO v_guide_id FROM public.bookings WHERE id = NEW.booking_id;
  IF v_guide_id IS NOT NULL THEN
    PERFORM public.recompute_guide_response_time(v_guide_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_messages_recompute_response_time ON public.booking_messages;
CREATE TRIGGER trg_messages_recompute_response_time
  AFTER INSERT ON public.booking_messages
  FOR EACH ROW EXECUTE FUNCTION public.messages_recompute_response_time();

-- Backfill existing data
DO $$
DECLARE g RECORD;
BEGIN
  FOR g IN SELECT id FROM public.guides LOOP
    PERFORM public.recompute_guide_completed_tours(g.id);
    PERFORM public.recompute_guide_response_time(g.id);
  END LOOP;
END $$;

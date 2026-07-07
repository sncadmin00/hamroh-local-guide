-- Prevent double-booking a guide at overlapping times.
-- Applies to bookings in status pending/confirmed (active bookings).
-- Race-safe: pg_advisory_xact_lock on guide_id serializes concurrent inserts
-- for the same guide within a transaction.

CREATE OR REPLACE FUNCTION public.bookings_prevent_time_conflict()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_start time;
  v_new_end   time;
  v_dur       int;
  v_conflict_id uuid;
BEGIN
  -- Only enforce for active statuses. Cancelled/declined/expired free the slot.
  IF NEW.status NOT IN ('pending', 'confirmed') THEN
    RETURN NEW;
  END IF;

  -- Need a start_time to compute an interval. If missing, skip the check.
  IF NEW.start_time IS NULL OR NEW.date IS NULL OR NEW.guide_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_dur := COALESCE(NEW.duration_minutes, 120);
  v_new_start := NEW.start_time;
  v_new_end := (NEW.start_time + make_interval(mins => v_dur));

  -- Serialize concurrent inserts/updates for the same guide.
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.guide_id::text, 42));

  SELECT b.id INTO v_conflict_id
  FROM public.bookings b
  WHERE b.guide_id = NEW.guide_id
    AND b.date = NEW.date
    AND b.status IN ('pending', 'confirmed')
    AND b.start_time IS NOT NULL
    AND b.id IS DISTINCT FROM NEW.id
    AND b.start_time < v_new_end
    AND (b.start_time + make_interval(mins => COALESCE(b.duration_minutes, 120))) > v_new_start
  LIMIT 1;

  IF v_conflict_id IS NOT NULL THEN
    RAISE EXCEPTION 'TIME_CONFLICT: guide already has a booking overlapping this time'
      USING ERRCODE = 'exclusion_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_prevent_time_conflict ON public.bookings;
CREATE TRIGGER bookings_prevent_time_conflict
BEFORE INSERT OR UPDATE OF status, date, start_time, duration_minutes, guide_id
ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.bookings_prevent_time_conflict();
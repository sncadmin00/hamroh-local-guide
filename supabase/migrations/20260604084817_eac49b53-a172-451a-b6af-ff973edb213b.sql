
-- ============================================================
-- 1. calendar_events
-- ============================================================
CREATE TABLE public.calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guide_id UUID NOT NULL REFERENCES public.guides(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('booking','personal','block','reminder')),
  title TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN NOT NULL DEFAULT false,
  location TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT 'primary',
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  google_event_id TEXT,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','booking','google','ai')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_calendar_events_guide_starts ON public.calendar_events(guide_id, starts_at);
CREATE INDEX idx_calendar_events_booking ON public.calendar_events(booking_id) WHERE booking_id IS NOT NULL;
CREATE UNIQUE INDEX idx_calendar_events_google ON public.calendar_events(guide_id, google_event_id) WHERE google_event_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_events TO authenticated;
GRANT ALL ON public.calendar_events TO service_role;

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guide manages own events" ON public.calendar_events
  FOR ALL TO authenticated
  USING (public.is_guide_owner(auth.uid(), guide_id))
  WITH CHECK (public.is_guide_owner(auth.uid(), guide_id));

CREATE POLICY "Admins manage all events" ON public.calendar_events
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_calendar_events_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 2. guide_google_calendar
-- ============================================================
CREATE TABLE public.guide_google_calendar (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guide_id UUID NOT NULL UNIQUE REFERENCES public.guides(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  calendar_id TEXT NOT NULL DEFAULT 'primary',
  sync_token TEXT,
  last_synced_at TIMESTAMPTZ,
  google_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.guide_google_calendar TO authenticated;
GRANT ALL ON public.guide_google_calendar TO service_role;

ALTER TABLE public.guide_google_calendar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guide manages own google connection" ON public.guide_google_calendar
  FOR ALL TO authenticated
  USING (public.is_guide_owner(auth.uid(), guide_id))
  WITH CHECK (public.is_guide_owner(auth.uid(), guide_id));

CREATE POLICY "Admins view google connections" ON public.guide_google_calendar
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_guide_google_calendar_updated_at
  BEFORE UPDATE ON public.guide_google_calendar
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 3. guide_client_notes
-- ============================================================
CREATE TABLE public.guide_client_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guide_id UUID NOT NULL REFERENCES public.guides(id) ON DELETE CASCADE,
  client_user_id UUID,
  client_name TEXT NOT NULL DEFAULT '',
  client_email TEXT,
  notes TEXT NOT NULL DEFAULT '',
  tags TEXT[] NOT NULL DEFAULT '{}',
  last_tour_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_notes_guide ON public.guide_client_notes(guide_id);
CREATE INDEX idx_client_notes_client ON public.guide_client_notes(guide_id, client_user_id) WHERE client_user_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.guide_client_notes TO authenticated;
GRANT ALL ON public.guide_client_notes TO service_role;

ALTER TABLE public.guide_client_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guide manages own client notes" ON public.guide_client_notes
  FOR ALL TO authenticated
  USING (public.is_guide_owner(auth.uid(), guide_id))
  WITH CHECK (public.is_guide_owner(auth.uid(), guide_id));

CREATE TRIGGER trg_guide_client_notes_updated_at
  BEFORE UPDATE ON public.guide_client_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 4. guide_ai_threads (one conversation per guide)
-- ============================================================
CREATE TABLE public.guide_ai_threads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guide_id UUID NOT NULL UNIQUE REFERENCES public.guides(id) ON DELETE CASCADE,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.guide_ai_threads TO authenticated;
GRANT ALL ON public.guide_ai_threads TO service_role;

ALTER TABLE public.guide_ai_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guide manages own AI thread" ON public.guide_ai_threads
  FOR ALL TO authenticated
  USING (public.is_guide_owner(auth.uid(), guide_id))
  WITH CHECK (public.is_guide_owner(auth.uid(), guide_id));

CREATE TRIGGER trg_guide_ai_threads_updated_at
  BEFORE UPDATE ON public.guide_ai_threads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 5. Auto-sync bookings -> calendar_events
-- ============================================================
CREATE OR REPLACE FUNCTION public.sync_booking_to_calendar()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_starts TIMESTAMPTZ;
  v_ends TIMESTAMPTZ;
  v_duration INT;
BEGIN
  -- Sostavlyaem starts_at/ends_at
  v_duration := COALESCE(NEW.duration_minutes, 120);
  IF NEW.start_time IS NOT NULL THEN
    v_starts := (NEW.date::text || ' ' || NEW.start_time::text)::timestamptz;
  ELSE
    v_starts := NEW.date::timestamptz;
  END IF;
  v_ends := v_starts + (v_duration || ' minutes')::interval;

  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    -- Aktivnyi booking -> sozdat/obnovit event
    IF NEW.status IN ('confirmed','completed') THEN
      INSERT INTO public.calendar_events (
        guide_id, type, title, starts_at, ends_at,
        location, notes, color, booking_id, source
      )
      VALUES (
        NEW.guide_id, 'booking',
        COALESCE(NEW.experience, 'Tour') || ' — ' || NEW.customer_name,
        v_starts, v_ends,
        '', COALESCE(NEW.notes, ''),
        CASE WHEN NEW.status = 'completed' THEN 'muted' ELSE 'success' END,
        NEW.id, 'booking'
      )
      ON CONFLICT DO NOTHING;

      UPDATE public.calendar_events
      SET starts_at = v_starts,
          ends_at = v_ends,
          title = COALESCE(NEW.experience, 'Tour') || ' — ' || NEW.customer_name,
          color = CASE WHEN NEW.status = 'completed' THEN 'muted' ELSE 'success' END,
          notes = COALESCE(NEW.notes, '')
      WHERE booking_id = NEW.id;
    END IF;

    -- Otmenenyi/odklonennyi -> udalit event
    IF NEW.status IN ('cancelled','declined','expired') THEN
      DELETE FROM public.calendar_events WHERE booking_id = NEW.id;
    END IF;
  END IF;

  -- UPDATE so smenoy daty/vremeni
  IF TG_OP = 'UPDATE' AND NEW.status IN ('confirmed','completed') AND
     (OLD.date IS DISTINCT FROM NEW.date OR OLD.start_time IS DISTINCT FROM NEW.start_time
      OR OLD.duration_minutes IS DISTINCT FROM NEW.duration_minutes) THEN
    UPDATE public.calendar_events
    SET starts_at = v_starts, ends_at = v_ends
    WHERE booking_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_booking_sync_calendar
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.sync_booking_to_calendar();

-- ============================================================
-- 6. Backfill suschestvuyushih bookings v calendar
-- ============================================================
INSERT INTO public.calendar_events (
  guide_id, type, title, starts_at, ends_at,
  location, notes, color, booking_id, source
)
SELECT
  b.guide_id,
  'booking',
  COALESCE(b.experience, 'Tour') || ' — ' || b.customer_name,
  CASE WHEN b.start_time IS NOT NULL
    THEN (b.date::text || ' ' || b.start_time::text)::timestamptz
    ELSE b.date::timestamptz
  END,
  CASE WHEN b.start_time IS NOT NULL
    THEN (b.date::text || ' ' || b.start_time::text)::timestamptz + (COALESCE(b.duration_minutes,120) || ' minutes')::interval
    ELSE b.date::timestamptz + (COALESCE(b.duration_minutes,120) || ' minutes')::interval
  END,
  '', COALESCE(b.notes, ''),
  CASE WHEN b.status = 'completed' THEN 'muted' ELSE 'success' END,
  b.id, 'booking'
FROM public.bookings b
WHERE b.status IN ('confirmed','completed')
ON CONFLICT DO NOTHING;

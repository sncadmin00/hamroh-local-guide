
ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS google_event_id TEXT;

CREATE INDEX IF NOT EXISTS calendar_events_google_event_id_idx
  ON public.calendar_events (google_event_id) WHERE google_event_id IS NOT NULL;

-- Ensure grants on existing table
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guide_google_calendar TO authenticated;
GRANT ALL ON public.guide_google_calendar TO service_role;
ALTER TABLE public.guide_google_calendar ENABLE ROW LEVEL SECURITY;


CREATE TABLE public.booking_google_events (
  booking_id UUID PRIMARY KEY REFERENCES public.bookings(id) ON DELETE CASCADE,
  guide_id UUID NOT NULL REFERENCES public.guides(id) ON DELETE CASCADE,
  google_event_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.booking_google_events TO authenticated;
GRANT ALL ON public.booking_google_events TO service_role;

ALTER TABLE public.booking_google_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guides can view their booking mappings"
  ON public.booking_google_events FOR SELECT
  TO authenticated
  USING (public.is_guide_owner(auth.uid(), guide_id));

CREATE TRIGGER update_booking_google_events_updated_at
  BEFORE UPDATE ON public.booking_google_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

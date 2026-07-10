ALTER TABLE public.local_events ALTER COLUMN city_id DROP NOT NULL;
ALTER TABLE public.local_events ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'event';
ALTER TABLE public.local_events ADD COLUMN IF NOT EXISTS external_id text;
CREATE UNIQUE INDEX IF NOT EXISTS local_events_external_id_uidx ON public.local_events(external_id) WHERE external_id IS NOT NULL;
DROP INDEX IF EXISTS public.local_events_external_id_uidx;
ALTER TABLE public.local_events ADD CONSTRAINT local_events_external_id_key UNIQUE (external_id);
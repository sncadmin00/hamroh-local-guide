ALTER TABLE public.place_suggestions ADD COLUMN admin_note text;

COMMENT ON COLUMN public.place_suggestions.admin_note IS 'Optional note from the moderator explaining a rejection or approval decision.';
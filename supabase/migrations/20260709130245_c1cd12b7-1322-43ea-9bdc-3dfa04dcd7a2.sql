ALTER TABLE public.place_suggestions ADD COLUMN IF NOT EXISTS address text NOT NULL DEFAULT '';
COMMENT ON COLUMN public.place_suggestions.address IS 'Street/textual address entered by guide. Required from mobile clients.';
COMMENT ON COLUMN public.place_suggestions.source_url IS 'Google Maps (or other) link to the place. Required from mobile clients — helps admin fill coordinates on approval.';
GRANT SELECT ON public.spotlights TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.spotlights TO authenticated;
GRANT ALL ON public.spotlights TO service_role;
GRANT INSERT ON public.guide_applications TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.guide_applications TO authenticated;
GRANT ALL ON public.guide_applications TO service_role;
GRANT SELECT ON public.guide_availability_slots TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guide_availability_slots TO authenticated;
GRANT ALL ON public.guide_availability_slots TO service_role;
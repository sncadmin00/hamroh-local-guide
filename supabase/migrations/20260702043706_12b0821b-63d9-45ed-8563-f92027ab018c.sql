GRANT SELECT ON public.travel_diaries TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.travel_diaries TO authenticated;
GRANT ALL ON public.travel_diaries TO service_role;
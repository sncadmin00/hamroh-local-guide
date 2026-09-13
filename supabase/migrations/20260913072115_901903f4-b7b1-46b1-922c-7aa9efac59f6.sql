CREATE OR REPLACE VIEW public.review_authors AS
SELECT
  r.id AS review_id,
  split_part(COALESCE(NULLIF(btrim(p.full_name), ''), 'Traveler'), ' ', 1) AS first_name,
  p.avatar_url
FROM public.reviews r
JOIN public.profiles p ON p.id = r.user_id;

GRANT SELECT ON public.review_authors TO anon;
GRANT SELECT ON public.review_authors TO authenticated;
GRANT SELECT ON public.review_authors TO service_role;
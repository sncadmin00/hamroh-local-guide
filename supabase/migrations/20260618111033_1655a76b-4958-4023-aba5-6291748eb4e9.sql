DROP POLICY IF EXISTS "Anyone can read invitation by token" ON public.guide_invitations;
REVOKE SELECT, UPDATE ON public.guide_invitations FROM anon;
REVOKE SELECT (identity_phone, tax_id) ON public.guides FROM anon;
REVOKE SELECT (identity_phone, tax_id) ON public.guides FROM authenticated;
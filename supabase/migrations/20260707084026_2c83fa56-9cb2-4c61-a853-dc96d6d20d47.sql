REVOKE SELECT (notification_email) ON public.guides FROM anon, authenticated;
GRANT SELECT (notification_email) ON public.guides TO service_role;
-- Note: authenticated guides can still read their own row's notification_email via
-- a security-definer path if needed; for now the mobile app writes it and reads it
-- through a server function using service_role, and the field is not exposed on
-- the public profile.
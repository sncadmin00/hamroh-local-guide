REVOKE SELECT (notification_email) ON public.guides FROM anon, authenticated;
REVOKE UPDATE (notification_email) ON public.guides FROM anon, authenticated;
GRANT SELECT (notification_email), UPDATE (notification_email) ON public.guides TO service_role;
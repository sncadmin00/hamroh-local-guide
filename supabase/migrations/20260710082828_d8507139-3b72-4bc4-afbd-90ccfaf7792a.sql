
CREATE OR REPLACE FUNCTION public.notifications_dispatch_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_key text;
BEGIN
  BEGIN
    SELECT decrypted_secret INTO v_key
      FROM vault.decrypted_secrets
      WHERE name = 'email_queue_service_role_key'
      LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_key := NULL;
  END;

  IF v_key IS NULL THEN
    RETURN NEW;
  END IF;

  BEGIN
    PERFORM net.http_post(
      url := 'https://project--6fe4ded5-fad3-4138-b141-63c14b76e50f.lovable.app/api/public/hooks/notifications/push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_key
      ),
      body := jsonb_build_object('notification_id', NEW.id)
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notifications_dispatch_push failed (row preserved): %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notifications_dispatch_push_trg ON public.notifications;
CREATE TRIGGER notifications_dispatch_push_trg
AFTER INSERT ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.notifications_dispatch_push();

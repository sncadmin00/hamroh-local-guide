ALTER TABLE public.booking_messages ADD COLUMN IF NOT EXISTS notification_sent_at timestamptz;
CREATE INDEX IF NOT EXISTS booking_messages_unread_notify_idx
  ON public.booking_messages (created_at)
  WHERE read_at IS NULL AND notification_sent_at IS NULL;
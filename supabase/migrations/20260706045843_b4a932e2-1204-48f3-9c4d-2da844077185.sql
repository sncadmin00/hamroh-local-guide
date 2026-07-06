ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS type text,
  ADD COLUMN IF NOT EXISTS entity_id uuid,
  ADD COLUMN IF NOT EXISTS entity_type text,
  ADD COLUMN IF NOT EXISTS read_at timestamptz;

CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON public.notifications (user_id, created_at DESC) WHERE read = false;

CREATE INDEX IF NOT EXISTS notifications_entity_idx
  ON public.notifications (entity_type, entity_id);
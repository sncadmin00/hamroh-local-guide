
CREATE TABLE public.booking_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  sender_role text NOT NULL CHECK (sender_role IN ('client','guide')),
  body text NOT NULL CHECK (length(body) > 0 AND length(body) <= 4000),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX booking_messages_booking_id_created_at_idx
  ON public.booking_messages (booking_id, created_at);

GRANT SELECT, INSERT, UPDATE ON public.booking_messages TO authenticated;
GRANT ALL ON public.booking_messages TO service_role;

ALTER TABLE public.booking_messages ENABLE ROW LEVEL SECURITY;

-- Clients (booking.user_id) and guides (guides.user_id) can view
CREATE POLICY "Participants view messages"
ON public.booking_messages FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_messages.booking_id
      AND (
        b.user_id = auth.uid()
        OR public.is_guide_owner(auth.uid(), b.guide_id)
        OR public.has_role(auth.uid(), 'admin')
      )
  )
);

-- Participants can send messages as themselves
CREATE POLICY "Participants send messages"
ON public.booking_messages FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_messages.booking_id
      AND (
        (b.user_id = auth.uid() AND sender_role = 'client')
        OR (public.is_guide_owner(auth.uid(), b.guide_id) AND sender_role = 'guide')
      )
  )
);

-- Recipients can mark as read (update read_at)
CREATE POLICY "Participants update read state"
ON public.booking_messages FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_messages.booking_id
      AND (b.user_id = auth.uid() OR public.is_guide_owner(auth.uid(), b.guide_id))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_messages.booking_id
      AND (b.user_id = auth.uid() OR public.is_guide_owner(auth.uid(), b.guide_id))
  )
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_messages;
ALTER TABLE public.booking_messages REPLICA IDENTITY FULL;

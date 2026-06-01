-- 1. Privyazka gida k auth user
ALTER TABLE public.guides ADD COLUMN user_id uuid;
CREATE INDEX idx_guides_user_id ON public.guides(user_id);

-- 2. Polya vremeni v bookings
ALTER TABLE public.bookings ADD COLUMN start_time time;
ALTER TABLE public.bookings ADD COLUMN duration_minutes integer NOT NULL DEFAULT 120;
ALTER TABLE public.bookings ADD COLUMN slot_id uuid;

-- 3. Tablica slotov dostupnosti
CREATE TABLE public.guide_availability_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id uuid NOT NULL,
  date date NOT NULL,
  start_time time NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 120,
  is_booked boolean NOT NULL DEFAULT false,
  booking_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_slots_guide_date ON public.guide_availability_slots(guide_id, date);
CREATE INDEX idx_slots_available ON public.guide_availability_slots(guide_id, date) WHERE is_booked = false;

-- GRANTs
GRANT SELECT ON public.guide_availability_slots TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guide_availability_slots TO authenticated;
GRANT ALL ON public.guide_availability_slots TO service_role;

-- RLS
ALTER TABLE public.guide_availability_slots ENABLE ROW LEVEL SECURITY;

-- Security definer helper: proverka chto user vladelec gida
CREATE OR REPLACE FUNCTION public.is_guide_owner(_user_id uuid, _guide_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.guides
    WHERE id = _guide_id AND user_id = _user_id
  )
$$;

-- Politiki slotov
CREATE POLICY "Slots viewable by everyone"
ON public.guide_availability_slots FOR SELECT
TO public
USING (true);

CREATE POLICY "Guide manages own slots"
ON public.guide_availability_slots FOR ALL
TO authenticated
USING (public.is_guide_owner(auth.uid(), guide_id))
WITH CHECK (public.is_guide_owner(auth.uid(), guide_id));

CREATE POLICY "Admin manages all slots"
ON public.guide_availability_slots FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Trigger updated_at
CREATE TRIGGER set_slots_updated_at
BEFORE UPDATE ON public.guide_availability_slots
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Politiki gida na svoi bookings (chtoby gid videl v kabinete)
CREATE POLICY "Guide views own bookings"
ON public.bookings FOR SELECT
TO authenticated
USING (public.is_guide_owner(auth.uid(), guide_id));

CREATE POLICY "Guide updates own bookings"
ON public.bookings FOR UPDATE
TO authenticated
USING (public.is_guide_owner(auth.uid(), guide_id))
WITH CHECK (public.is_guide_owner(auth.uid(), guide_id));

-- 5. Trigger: avto-pometka slota pri bronirovanii / osvobozhdenie pri otmene
CREATE OR REPLACE FUNCTION public.sync_slot_on_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Novyj booking so slotom
  IF TG_OP = 'INSERT' AND NEW.slot_id IS NOT NULL THEN
    UPDATE public.guide_availability_slots
    SET is_booked = true, booking_id = NEW.id
    WHERE id = NEW.slot_id AND is_booked = false;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Slot is already booked or does not exist';
    END IF;
  END IF;

  -- Otmena ili udalenie bookinga osvobozhdaet slot
  IF TG_OP = 'UPDATE' AND OLD.slot_id IS NOT NULL
     AND NEW.status IN ('cancelled','declined') AND OLD.status NOT IN ('cancelled','declined') THEN
    UPDATE public.guide_availability_slots
    SET is_booked = false, booking_id = NULL
    WHERE id = OLD.slot_id;
  END IF;

  IF TG_OP = 'DELETE' AND OLD.slot_id IS NOT NULL THEN
    UPDATE public.guide_availability_slots
    SET is_booked = false, booking_id = NULL
    WHERE id = OLD.slot_id;
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER bookings_sync_slot_ins
AFTER INSERT ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.sync_slot_on_booking();

CREATE TRIGGER bookings_sync_slot_upd
AFTER UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.sync_slot_on_booking();

CREATE TRIGGER bookings_sync_slot_del
BEFORE DELETE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.sync_slot_on_booking();

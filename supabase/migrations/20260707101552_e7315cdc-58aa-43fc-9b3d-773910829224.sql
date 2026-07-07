
-- 1. Расписание тура (weekday + start_time), из которого генерируются доступные слоты
CREATE TABLE public.tour_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id uuid NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6), -- 0=Sunday .. 6=Saturday (Postgres DOW)
  start_time time NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tour_id, weekday, start_time)
);

CREATE INDEX tour_schedules_tour_idx ON public.tour_schedules(tour_id) WHERE is_active;

GRANT SELECT ON public.tour_schedules TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tour_schedules TO authenticated;
GRANT ALL ON public.tour_schedules TO service_role;

ALTER TABLE public.tour_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tour_schedules public read"
  ON public.tour_schedules FOR SELECT
  USING (true);

CREATE POLICY "tour_schedules guide owner write"
  ON public.tour_schedules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tours t
      JOIN public.guides g ON g.id = t.guide_id
      WHERE t.id = tour_schedules.tour_id AND g.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tours t
      JOIN public.guides g ON g.id = t.guide_id
      WHERE t.id = tour_schedules.tour_id AND g.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE TRIGGER tour_schedules_set_updated_at
  BEFORE UPDATE ON public.tour_schedules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Настраиваемый буфер между турами гида (по умолчанию 60 минут)
ALTER TABLE public.guides
  ADD COLUMN buffer_minutes integer NOT NULL DEFAULT 60
    CHECK (buffer_minutes IN (30, 60, 90));

-- 3. Ручные блокировки времени гида (отпуск, болезнь, «занят»)
CREATE TABLE public.guide_time_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id uuid NOT NULL REFERENCES public.guides(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  reason text,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'ai')),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);

CREATE INDEX guide_time_blocks_guide_range_idx
  ON public.guide_time_blocks(guide_id, starts_at, ends_at);

GRANT SELECT ON public.guide_time_blocks TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guide_time_blocks TO authenticated;
GRANT ALL ON public.guide_time_blocks TO service_role;

ALTER TABLE public.guide_time_blocks ENABLE ROW LEVEL SECURITY;

-- публичное чтение нужно, чтобы генератор слотов (публичный endpoint) видел занятое;
-- reason не считаем секретом (гид сам решает, что писать)
CREATE POLICY "guide_time_blocks public read"
  ON public.guide_time_blocks FOR SELECT
  USING (true);

CREATE POLICY "guide_time_blocks owner write"
  ON public.guide_time_blocks FOR ALL
  TO authenticated
  USING (
    public.is_guide_owner(auth.uid(), guide_id)
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    public.is_guide_owner(auth.uid(), guide_id)
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE TRIGGER guide_time_blocks_set_updated_at
  BEFORE UPDATE ON public.guide_time_blocks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Расширенный триггер: буфер + блокировки
CREATE OR REPLACE FUNCTION public.bookings_prevent_time_conflict()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_new_start timestamptz;
  v_new_end   timestamptz;
  v_dur       int;
  v_buffer    int;
  v_conflict_id uuid;
  v_block_id uuid;
BEGIN
  IF NEW.status NOT IN ('pending', 'confirmed') THEN
    RETURN NEW;
  END IF;

  IF NEW.start_time IS NULL OR NEW.date IS NULL OR NEW.guide_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_dur := COALESCE(NEW.duration_minutes, 120);
  v_new_start := (NEW.date::text || ' ' || NEW.start_time::text)::timestamptz;
  v_new_end   := v_new_start + make_interval(mins => v_dur);

  SELECT COALESCE(buffer_minutes, 60) INTO v_buffer
  FROM public.guides WHERE id = NEW.guide_id;
  v_buffer := COALESCE(v_buffer, 60);

  -- Serialize concurrent inserts/updates for the same guide.
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.guide_id::text, 42));

  -- 4a. Пересечение с активной бронью гида (с симметричным буфером обеих сторон)
  SELECT b.id INTO v_conflict_id
  FROM public.bookings b
  WHERE b.guide_id = NEW.guide_id
    AND b.status IN ('pending', 'confirmed')
    AND b.start_time IS NOT NULL
    AND b.date IS NOT NULL
    AND b.id IS DISTINCT FROM NEW.id
    AND (b.date::text || ' ' || b.start_time::text)::timestamptz
        < v_new_end + make_interval(mins => 2 * v_buffer)
    AND ((b.date::text || ' ' || b.start_time::text)::timestamptz
         + make_interval(mins => COALESCE(b.duration_minutes, 120)))
        > v_new_start - make_interval(mins => 2 * v_buffer)
  LIMIT 1;

  IF v_conflict_id IS NOT NULL THEN
    RAISE EXCEPTION 'TIME_CONFLICT: guide already has a booking overlapping this time (buffer=%m)', v_buffer
      USING ERRCODE = 'exclusion_violation';
  END IF;

  -- 4b. Пересечение с ручной блокировкой гида (без буфера — блок точен)
  SELECT gb.id INTO v_block_id
  FROM public.guide_time_blocks gb
  WHERE gb.guide_id = NEW.guide_id
    AND gb.starts_at < v_new_end
    AND gb.ends_at   > v_new_start
  LIMIT 1;

  IF v_block_id IS NOT NULL THEN
    RAISE EXCEPTION 'TIME_BLOCKED: guide has manually blocked this time interval'
      USING ERRCODE = 'exclusion_violation';
  END IF;

  RETURN NEW;
END;
$function$;

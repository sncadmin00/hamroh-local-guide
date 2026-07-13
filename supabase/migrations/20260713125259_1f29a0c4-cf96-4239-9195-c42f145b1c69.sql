
-- 1. Columns
ALTER TABLE public.tours
  ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'draft'
    CHECK (moderation_status IN ('draft','pending_review','approved','rejected')),
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS moderated_at timestamptz,
  ADD COLUMN IF NOT EXISTS moderated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Backfill: everything currently live counts as approved; unpublished but with content stays draft.
UPDATE public.tours
  SET moderation_status = 'approved',
      moderated_at = COALESCE(moderated_at, updated_at, created_at)
  WHERE moderation_status = 'draft' AND published = true;

CREATE INDEX IF NOT EXISTS idx_tours_moderation_status
  ON public.tours (moderation_status, submitted_at DESC);

-- 2. Trigger: published=true requires moderation_status='approved'.
CREATE OR REPLACE FUNCTION public.tours_enforce_publish_gate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.published = true AND NEW.moderation_status <> 'approved' THEN
    RAISE EXCEPTION 'PUBLISH_NOT_ALLOWED: tour must be approved before it can be published'
      USING ERRCODE = 'check_violation';
  END IF;

  -- If moderation status transitions away from approved, force-hide.
  IF TG_OP = 'UPDATE'
     AND OLD.moderation_status = 'approved'
     AND NEW.moderation_status <> 'approved' THEN
    NEW.published := false;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tours_enforce_publish_gate ON public.tours;
CREATE TRIGGER trg_tours_enforce_publish_gate
  BEFORE INSERT OR UPDATE ON public.tours
  FOR EACH ROW EXECUTE FUNCTION public.tours_enforce_publish_gate();

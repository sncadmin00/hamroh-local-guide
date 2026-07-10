
-- Close public read on guide_time_blocks (reasons are private).
DROP POLICY IF EXISTS "guide_time_blocks public read" ON public.guide_time_blocks;

-- Owner can already read via "guide_time_blocks owner write" (FOR ALL) policy.
-- Add explicit SELECT policy for clarity.
CREATE POLICY "guide_time_blocks owner read"
  ON public.guide_time_blocks
  FOR SELECT
  TO authenticated
  USING (public.is_guide_owner(auth.uid(), guide_id) OR public.has_role(auth.uid(), 'admin'));

-- Revoke anon access to the table.
REVOKE ALL ON public.guide_time_blocks FROM anon;

-- Fix Function Search Path Mutable warnings on our plpgsql functions.
ALTER FUNCTION public.delete_email(text, bigint)      SET search_path = public, pg_temp;
ALTER FUNCTION public.enqueue_email(text, jsonb)      SET search_path = public, pg_temp;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb)   SET search_path = public, pg_temp;

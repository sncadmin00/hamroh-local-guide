
ALTER TABLE public.guide_experiences
  ADD COLUMN IF NOT EXISTS price_by_language jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE POLICY "Guide owner manages own experiences"
  ON public.guide_experiences
  FOR ALL
  TO authenticated
  USING (public.is_guide_owner(auth.uid(), guide_id))
  WITH CHECK (public.is_guide_owner(auth.uid(), guide_id));

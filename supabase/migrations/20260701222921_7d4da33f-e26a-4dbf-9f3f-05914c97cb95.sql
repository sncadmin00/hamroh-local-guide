
ALTER TABLE public.place_suggestions
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'client',
  ADD COLUMN IF NOT EXISTS submitted_by uuid,
  ADD COLUMN IF NOT EXISTS guide_id uuid REFERENCES public.guides(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS contact_email text NOT NULL DEFAULT '';

ALTER TABLE public.place_suggestions
  DROP CONSTRAINT IF EXISTS place_suggestions_source_check;
ALTER TABLE public.place_suggestions
  ADD CONSTRAINT place_suggestions_source_check CHECK (source IN ('client','guide','ai'));

CREATE INDEX IF NOT EXISTS idx_place_suggestions_source ON public.place_suggestions(source);
CREATE INDEX IF NOT EXISTS idx_place_suggestions_submitted_by ON public.place_suggestions(submitted_by);

GRANT SELECT, INSERT ON public.place_suggestions TO authenticated;
GRANT ALL ON public.place_suggestions TO service_role;

-- Allow authenticated users to submit their own suggestions
DROP POLICY IF EXISTS "Users can insert own suggestions" ON public.place_suggestions;
CREATE POLICY "Users can insert own suggestions"
  ON public.place_suggestions FOR INSERT
  TO authenticated
  WITH CHECK (
    submitted_by = auth.uid()
    AND source IN ('client','guide')
    AND status = 'pending'
  );

DROP POLICY IF EXISTS "Users can view own suggestions" ON public.place_suggestions;
CREATE POLICY "Users can view own suggestions"
  ON public.place_suggestions FOR SELECT
  TO authenticated
  USING (submitted_by = auth.uid());

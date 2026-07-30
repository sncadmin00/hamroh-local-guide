ALTER TABLE public.guides ADD COLUMN IF NOT EXISTS published boolean NOT NULL DEFAULT false;

-- Publish only genuine, claimed profiles; hide seed/test rows
UPDATE public.guides SET published = true
WHERE user_id IS NOT NULL AND lower(name) NOT LIKE '%test%';

UPDATE public.guides SET published = false
WHERE user_id IS NULL OR lower(name) LIKE '%test%';

CREATE INDEX IF NOT EXISTS guides_published_idx ON public.guides (published);

DROP POLICY IF EXISTS "Guides are viewable by everyone" ON public.guides;
DROP POLICY IF EXISTS "Public can view guides" ON public.guides;
DROP POLICY IF EXISTS "Anyone can view guides" ON public.guides;

CREATE POLICY "Public can view published guides"
ON public.guides FOR SELECT
USING (
  published = true
  OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'))
);

ALTER TABLE public.place_suggestions
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision;

-- Storage policies for place-suggestions bucket
CREATE POLICY "place-suggestions owner insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'place-suggestions'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "place-suggestions owner read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'place-suggestions'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "place-suggestions owner update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'place-suggestions'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "place-suggestions owner delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'place-suggestions'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin')
  )
);

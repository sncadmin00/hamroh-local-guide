
-- Public read for tour-photos
CREATE POLICY "tour-photos public read"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'tour-photos');

-- Guide writes only into their own folder {auth.uid()}/...
CREATE POLICY "tour-photos owner insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'tour-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "tour-photos owner update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'tour-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'tour-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "tour-photos owner delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'tour-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Admin full access
CREATE POLICY "tour-photos admin all"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'tour-photos' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'tour-photos' AND public.has_role(auth.uid(), 'admin'));

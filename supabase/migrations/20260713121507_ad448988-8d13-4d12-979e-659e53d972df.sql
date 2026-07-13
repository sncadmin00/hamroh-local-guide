
CREATE POLICY "Guide owners upload own avatar cover"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'guide-photos'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Guide owners update own avatar cover"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'guide-photos'
  AND (auth.uid())::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'guide-photos'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Guide owners delete own avatar cover"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'guide-photos'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

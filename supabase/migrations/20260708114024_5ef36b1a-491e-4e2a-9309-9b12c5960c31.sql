DROP POLICY IF EXISTS "traveler_media_read" ON storage.objects;
CREATE POLICY "traveler_media_read"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'traveler-media'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);
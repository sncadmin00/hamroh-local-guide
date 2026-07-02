
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS photos text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS guide_reply text,
  ADD COLUMN IF NOT EXISTS guide_reply_at timestamptz;

DROP POLICY IF EXISTS "traveler_media_read" ON storage.objects;
CREATE POLICY "traveler_media_read"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'traveler-media');

DROP POLICY IF EXISTS "traveler_media_insert_own_folder" ON storage.objects;
CREATE POLICY "traveler_media_insert_own_folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'traveler-media'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "traveler_media_update_own_folder" ON storage.objects;
CREATE POLICY "traveler_media_update_own_folder"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'traveler-media'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "traveler_media_delete_own_folder" ON storage.objects;
CREATE POLICY "traveler_media_delete_own_folder"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'traveler-media'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Guides can reply to their reviews" ON public.reviews;
CREATE POLICY "Guides can reply to their reviews"
ON public.reviews FOR UPDATE
TO authenticated
USING (public.is_guide_owner(auth.uid(), guide_id))
WITH CHECK (public.is_guide_owner(auth.uid(), guide_id));

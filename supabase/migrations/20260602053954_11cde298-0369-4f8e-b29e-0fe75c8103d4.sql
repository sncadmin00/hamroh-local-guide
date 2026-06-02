
-- 1) guide_availability_slots: hide booking_id from public via column-level grants
REVOKE SELECT ON public.guide_availability_slots FROM anon, authenticated;
GRANT SELECT (id, guide_id, date, start_time, duration_minutes, is_booked, created_at, updated_at)
  ON public.guide_availability_slots TO anon, authenticated;
GRANT ALL ON public.guide_availability_slots TO service_role;

-- 2) Storage: make application-photos/videos private (was public, allowed listing + anon read of PII)
UPDATE storage.buckets SET public = false WHERE id IN ('guide-application-photos', 'guide-application-videos');

-- Remove public read on application buckets
DROP POLICY IF EXISTS "Public read application photos" ON storage.objects;
DROP POLICY IF EXISTS "Public read application videos" ON storage.objects;

-- Only admins can read application uploads
CREATE POLICY "Admins read application photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'guide-application-photos' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins read application videos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'guide-application-videos' AND has_role(auth.uid(), 'admin'::app_role));

-- Tighten uploads: require objects to be created in an "applications/" prefix and limit anon to that prefix
DROP POLICY IF EXISTS "Anyone can upload application photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload application videos" ON storage.objects;

CREATE POLICY "Anyone can upload application photos to applications prefix"
  ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (
    bucket_id = 'guide-application-photos'
    AND (storage.foldername(name))[1] = 'applications'
  );

CREATE POLICY "Anyone can upload application videos to applications prefix"
  ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (
    bucket_id = 'guide-application-videos'
    AND (storage.foldername(name))[1] = 'applications'
  );

-- 3) guide-photos: keep public read for individual files but prevent broad listing via bucket privacy is not desired (they are displayed).
-- For guide-photos public read is intentional. No change.

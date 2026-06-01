
-- Add media fields to guide_applications
ALTER TABLE public.guide_applications
  ADD COLUMN IF NOT EXISTS portrait_url text,
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS photo_urls text[] NOT NULL DEFAULT '{}';

-- Storage buckets for application media (public read so admins can view directly)
INSERT INTO storage.buckets (id, name, public)
VALUES ('guide-application-photos', 'guide-application-photos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('guide-application-videos', 'guide-application-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Public read
CREATE POLICY "Public read application photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'guide-application-photos');

CREATE POLICY "Public read application videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'guide-application-videos');

-- Anyone can upload (applications are public submissions)
CREATE POLICY "Anyone can upload application photos"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'guide-application-photos');

CREATE POLICY "Anyone can upload application videos"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'guide-application-videos');

-- Admins can delete media if needed
CREATE POLICY "Admins delete application photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'guide-application-photos' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete application videos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'guide-application-videos' AND has_role(auth.uid(), 'admin'));

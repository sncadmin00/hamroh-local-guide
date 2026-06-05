
-- guide-identity bucket: only owner guide can upload/read own files, admins see all
CREATE POLICY "Guide reads own identity files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'guide-identity' AND EXISTS (
    SELECT 1 FROM public.guides g WHERE g.user_id = auth.uid() AND (storage.foldername(name))[1] = g.id::text
  ));
CREATE POLICY "Guide uploads own identity files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'guide-identity' AND EXISTS (
    SELECT 1 FROM public.guides g WHERE g.user_id = auth.uid() AND (storage.foldername(name))[1] = g.id::text
  ));
CREATE POLICY "Guide updates own identity files" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'guide-identity' AND EXISTS (
    SELECT 1 FROM public.guides g WHERE g.user_id = auth.uid() AND (storage.foldername(name))[1] = g.id::text
  ));
CREATE POLICY "Guide deletes own identity files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'guide-identity' AND EXISTS (
    SELECT 1 FROM public.guides g WHERE g.user_id = auth.uid() AND (storage.foldername(name))[1] = g.id::text
  ));
CREATE POLICY "Admins read identity files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'guide-identity' AND public.has_role(auth.uid(), 'admin'));

-- guide-intro-videos bucket: same model
CREATE POLICY "Guide reads own intro videos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'guide-intro-videos' AND EXISTS (
    SELECT 1 FROM public.guides g WHERE g.user_id = auth.uid() AND (storage.foldername(name))[1] = g.id::text
  ));
CREATE POLICY "Guide uploads own intro videos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'guide-intro-videos' AND EXISTS (
    SELECT 1 FROM public.guides g WHERE g.user_id = auth.uid() AND (storage.foldername(name))[1] = g.id::text
  ));
CREATE POLICY "Guide updates own intro videos" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'guide-intro-videos' AND EXISTS (
    SELECT 1 FROM public.guides g WHERE g.user_id = auth.uid() AND (storage.foldername(name))[1] = g.id::text
  ));
CREATE POLICY "Guide deletes own intro videos" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'guide-intro-videos' AND EXISTS (
    SELECT 1 FROM public.guides g WHERE g.user_id = auth.uid() AND (storage.foldername(name))[1] = g.id::text
  ));
CREATE POLICY "Admins read intro videos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'guide-intro-videos' AND public.has_role(auth.uid(), 'admin'));

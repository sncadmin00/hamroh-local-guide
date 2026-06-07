
CREATE POLICY "Guide owners upload tour covers"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'guide-photos'
  AND (storage.foldername(name))[1] = 'tours'
  AND public.is_guide_owner(auth.uid(), ((storage.foldername(name))[2])::uuid)
);

CREATE POLICY "Guide owners update tour covers"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'guide-photos'
  AND (storage.foldername(name))[1] = 'tours'
  AND public.is_guide_owner(auth.uid(), ((storage.foldername(name))[2])::uuid)
)
WITH CHECK (
  bucket_id = 'guide-photos'
  AND (storage.foldername(name))[1] = 'tours'
  AND public.is_guide_owner(auth.uid(), ((storage.foldername(name))[2])::uuid)
);

CREATE POLICY "Guide owners delete tour covers"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'guide-photos'
  AND (storage.foldername(name))[1] = 'tours'
  AND public.is_guide_owner(auth.uid(), ((storage.foldername(name))[2])::uuid)
);

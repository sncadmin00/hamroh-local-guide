
-- Allow guide owners to manage their own post images in the guide-photos bucket
-- under the posts/<guideId>/... prefix.

CREATE POLICY "Guide owners upload post photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'guide-photos'
  AND (storage.foldername(name))[1] = 'posts'
  AND public.is_guide_owner(auth.uid(), ((storage.foldername(name))[2])::uuid)
);

CREATE POLICY "Guide owners update post photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'guide-photos'
  AND (storage.foldername(name))[1] = 'posts'
  AND public.is_guide_owner(auth.uid(), ((storage.foldername(name))[2])::uuid)
)
WITH CHECK (
  bucket_id = 'guide-photos'
  AND (storage.foldername(name))[1] = 'posts'
  AND public.is_guide_owner(auth.uid(), ((storage.foldername(name))[2])::uuid)
);

CREATE POLICY "Guide owners delete post photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'guide-photos'
  AND (storage.foldername(name))[1] = 'posts'
  AND public.is_guide_owner(auth.uid(), ((storage.foldername(name))[2])::uuid)
);

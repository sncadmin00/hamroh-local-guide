
-- 1. Wipe legacy social-media posts (confirmed: no real data)
DELETE FROM public.guide_posts;

-- 2. Drop social-media columns and platform check
ALTER TABLE public.guide_posts DROP CONSTRAINT IF EXISTS guide_posts_platform_check;
ALTER TABLE public.guide_posts DROP COLUMN IF EXISTS platform;
ALTER TABLE public.guide_posts DROP COLUMN IF EXISTS url;
ALTER TABLE public.guide_posts DROP COLUMN IF EXISTS posted_at;

-- 3. Add video columns
ALTER TABLE public.guide_posts
  ADD COLUMN IF NOT EXISTS video_path       text,
  ADD COLUMN IF NOT EXISTS duration_seconds integer,
  ADD COLUMN IF NOT EXISTS width            integer,
  ADD COLUMN IF NOT EXISTS height           integer,
  ADD COLUMN IF NOT EXISTS size_bytes       bigint;

-- video_path becomes required going forward (table is empty, safe)
ALTER TABLE public.guide_posts ALTER COLUMN video_path SET NOT NULL;

-- Default media_type -> 'reel'
ALTER TABLE public.guide_posts ALTER COLUMN media_type SET DEFAULT 'reel'::post_media_type;

-- 4. Constraints (video limits)
ALTER TABLE public.guide_posts
  ADD CONSTRAINT guide_posts_duration_check
  CHECK (duration_seconds IS NULL OR (duration_seconds > 0 AND duration_seconds <= 90));

ALTER TABLE public.guide_posts
  ADD CONSTRAINT guide_posts_size_check
  CHECK (size_bytes IS NULL OR (size_bytes > 0 AND size_bytes <= 52428800)); -- 50 MB

ALTER TABLE public.guide_posts
  ADD CONSTRAINT guide_posts_caption_len_check
  CHECK (char_length(caption) <= 500);

-- 5. Enforce max 20 posts per guide via trigger
CREATE OR REPLACE FUNCTION public.guide_posts_enforce_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count int;
BEGIN
  SELECT count(*) INTO v_count FROM public.guide_posts WHERE guide_id = NEW.guide_id;
  IF v_count >= 20 THEN
    RAISE EXCEPTION 'POST_LIMIT_REACHED: max 20 posts per guide' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guide_posts_enforce_limit ON public.guide_posts;
CREATE TRIGGER trg_guide_posts_enforce_limit
BEFORE INSERT ON public.guide_posts
FOR EACH ROW EXECUTE FUNCTION public.guide_posts_enforce_limit();

-- 6. Storage RLS on bucket 'guide-posts'
-- Path convention: <guide_id>/<uuid>.<ext>  =>  foldername[1] == guide_id
CREATE POLICY "guide-posts: owner reads own"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'guide-posts'
  AND public.is_guide_owner(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "guide-posts: admin reads all"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'guide-posts'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "guide-posts: owner uploads"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'guide-posts'
  AND public.is_guide_owner(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "guide-posts: owner updates own"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'guide-posts'
  AND public.is_guide_owner(auth.uid(), ((storage.foldername(name))[1])::uuid)
)
WITH CHECK (
  bucket_id = 'guide-posts'
  AND public.is_guide_owner(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "guide-posts: owner deletes own"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'guide-posts'
  AND public.is_guide_owner(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

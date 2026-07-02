-- 1) Add media_type to guide_posts
DO $$ BEGIN
  CREATE TYPE public.post_media_type AS ENUM ('reel', 'article');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.guide_posts
  ADD COLUMN IF NOT EXISTS media_type public.post_media_type NOT NULL DEFAULT 'article';

-- Backfill: video platforms => reel
UPDATE public.guide_posts
SET media_type = 'reel'
WHERE platform IN ('instagram', 'tiktok', 'youtube')
  AND media_type = 'article';

-- 2) admin_reels table
CREATE TABLE IF NOT EXISTS public.admin_reels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  video_url text NOT NULL,
  thumbnail_url text,
  caption text NOT NULL DEFAULT '',
  posted_at timestamptz DEFAULT now(),
  sort_order integer NOT NULL DEFAULT 0,
  visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.admin_reels TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_reels TO authenticated;
GRANT ALL ON public.admin_reels TO service_role;

ALTER TABLE public.admin_reels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view visible admin reels" ON public.admin_reels;
CREATE POLICY "Public can view visible admin reels"
ON public.admin_reels FOR SELECT
USING (visible = true);

DROP POLICY IF EXISTS "Admins can manage admin reels" ON public.admin_reels;
CREATE POLICY "Admins can manage admin reels"
ON public.admin_reels FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_admin_reels_updated_at ON public.admin_reels;
CREATE TRIGGER update_admin_reels_updated_at
BEFORE UPDATE ON public.admin_reels
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
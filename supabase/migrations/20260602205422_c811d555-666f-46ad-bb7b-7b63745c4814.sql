CREATE TABLE public.guide_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guide_id UUID NOT NULL REFERENCES public.guides(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('instagram','facebook','tiktok','youtube','other')),
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  caption TEXT NOT NULL DEFAULT '',
  posted_at TIMESTAMPTZ,
  sort_order INTEGER NOT NULL DEFAULT 0,
  visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_guide_posts_guide ON public.guide_posts(guide_id, sort_order);

GRANT SELECT ON public.guide_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guide_posts TO authenticated;
GRANT ALL ON public.guide_posts TO service_role;

ALTER TABLE public.guide_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Visible guide posts viewable by everyone"
  ON public.guide_posts FOR SELECT
  USING (visible = true);

CREATE POLICY "Admins manage guide posts"
  ON public.guide_posts FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Guide owner manages own posts"
  ON public.guide_posts FOR ALL TO authenticated
  USING (is_guide_owner(auth.uid(), guide_id))
  WITH CHECK (is_guide_owner(auth.uid(), guide_id));

CREATE TRIGGER update_guide_posts_updated_at
  BEFORE UPDATE ON public.guide_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
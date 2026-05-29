
CREATE TABLE public.article_cities (
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  city_id UUID NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, city_id)
);

GRANT SELECT ON public.article_cities TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.article_cities TO authenticated;
GRANT ALL ON public.article_cities TO service_role;

ALTER TABLE public.article_cities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Article cities viewable by everyone"
ON public.article_cities FOR SELECT
USING (true);

CREATE POLICY "Admins manage article cities"
ON public.article_cities FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_article_cities_city ON public.article_cities(city_id);

CREATE TABLE public.social_embed_cities (
  embed_id UUID NOT NULL REFERENCES public.social_embeds(id) ON DELETE CASCADE,
  city_id UUID NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  PRIMARY KEY (embed_id, city_id)
);

GRANT SELECT ON public.social_embed_cities TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_embed_cities TO authenticated;
GRANT ALL ON public.social_embed_cities TO service_role;

ALTER TABLE public.social_embed_cities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Social embed cities viewable by everyone"
ON public.social_embed_cities FOR SELECT
USING (true);

CREATE POLICY "Admins manage social embed cities"
ON public.social_embed_cities FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_social_embed_cities_city ON public.social_embed_cities(city_id);


CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE public.article_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  chunk_index int NOT NULL,
  content text NOT NULL,
  embedding vector(1536) NOT NULL,
  model text NOT NULL DEFAULT 'openai/text-embedding-3-small',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX article_chunks_article_id_idx ON public.article_chunks(article_id);
CREATE INDEX article_chunks_embedding_idx ON public.article_chunks
  USING hnsw (embedding vector_cosine_ops);

GRANT SELECT ON public.article_chunks TO anon, authenticated;
GRANT ALL ON public.article_chunks TO service_role;

ALTER TABLE public.article_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chunks of published articles viewable by everyone"
  ON public.article_chunks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.articles a
    WHERE a.id = article_chunks.article_id AND a.published = true
  ));

CREATE POLICY "Admins manage article chunks"
  ON public.article_chunks FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.match_article_chunks(
  query_embedding vector(1536),
  match_count int DEFAULT 5
)
RETURNS TABLE (
  article_id uuid,
  article_title text,
  article_slug text,
  content text,
  similarity float
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    c.article_id,
    a.title,
    a.slug,
    c.content,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM public.article_chunks c
  JOIN public.articles a ON a.id = c.article_id
  WHERE a.published = true
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;

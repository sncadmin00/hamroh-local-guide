
CREATE TABLE public.languages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  code text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.languages TO anon;
GRANT SELECT ON public.languages TO authenticated;
GRANT ALL ON public.languages TO service_role;

ALTER TABLE public.languages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Languages viewable by everyone"
  ON public.languages FOR SELECT
  TO public USING (true);

CREATE POLICY "Admins manage languages"
  ON public.languages FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_languages_updated_at
  BEFORE UPDATE ON public.languages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.languages (name, code, sort_order) VALUES
  ('English', 'en', 1),
  ('Russian', 'ru', 2),
  ('Uzbek', 'uz', 3)
ON CONFLICT (name) DO NOTHING;

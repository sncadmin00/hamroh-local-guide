CREATE TABLE public.guide_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL,
  languages TEXT[] NOT NULL DEFAULT '{}',
  specialization TEXT NOT NULL DEFAULT '',
  experience_years INTEGER NOT NULL DEFAULT 0,
  about TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT INSERT ON public.guide_applications TO anon;
GRANT INSERT, SELECT, UPDATE, DELETE ON public.guide_applications TO authenticated;
GRANT ALL ON public.guide_applications TO service_role;

ALTER TABLE public.guide_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a guide application"
ON public.guide_applications FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins view all guide applications"
ON public.guide_applications FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update guide applications"
ON public.guide_applications FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete guide applications"
ON public.guide_applications FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER guide_applications_set_updated_at
BEFORE UPDATE ON public.guide_applications
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_guide_applications_status_created ON public.guide_applications (status, created_at DESC);
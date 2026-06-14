
CREATE TABLE public.guide_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  email text NOT NULL,
  name text,
  city text,
  source text NOT NULL DEFAULT 'manual',
  source_url text,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  sent_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sent_at timestamptz,
  opened_at timestamptz,
  registered_at timestamptz,
  application_id uuid REFERENCES public.guide_applications(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_guide_invitations_email ON public.guide_invitations(lower(email));
CREATE INDEX idx_guide_invitations_status ON public.guide_invitations(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.guide_invitations TO authenticated;
GRANT SELECT, UPDATE ON public.guide_invitations TO anon;
GRANT ALL ON public.guide_invitations TO service_role;

ALTER TABLE public.guide_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage invitations"
ON public.guide_invitations FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can read invitation by token"
ON public.guide_invitations FOR SELECT TO anon, authenticated
USING (true);

CREATE TRIGGER trg_guide_invitations_updated
BEFORE UPDATE ON public.guide_invitations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

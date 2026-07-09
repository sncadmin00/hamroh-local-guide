
CREATE TABLE public.city_suggestions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guide_id uuid REFERENCES public.guides(id) ON DELETE SET NULL,
  name text NOT NULL,
  region text,
  note text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_note text,
  created_city_id uuid REFERENCES public.cities(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX city_suggestions_user_id_idx ON public.city_suggestions(user_id);
CREATE INDEX city_suggestions_status_idx ON public.city_suggestions(status);

GRANT SELECT, INSERT, UPDATE ON public.city_suggestions TO authenticated;
GRANT ALL ON public.city_suggestions TO service_role;

ALTER TABLE public.city_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own city suggestions"
  ON public.city_suggestions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users create their own city suggestions"
  ON public.city_suggestions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins update city suggestions"
  ON public.city_suggestions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER city_suggestions_set_updated_at
  BEFORE UPDATE ON public.city_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

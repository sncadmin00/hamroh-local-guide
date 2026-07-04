ALTER TABLE public.spotlights
  ADD COLUMN IF NOT EXISTS guide_id uuid REFERENCES public.guides(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tour_id uuid REFERENCES public.tours(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS spotlights_guide_id_idx ON public.spotlights(guide_id);
CREATE INDEX IF NOT EXISTS spotlights_tour_id_idx ON public.spotlights(tour_id);
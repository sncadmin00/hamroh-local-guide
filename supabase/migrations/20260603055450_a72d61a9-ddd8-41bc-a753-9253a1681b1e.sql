
ALTER TABLE public.tours
  ADD CONSTRAINT tours_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.cities(id) ON DELETE RESTRICT;

ALTER TABLE public.tour_guides
  ADD CONSTRAINT tour_guides_tour_id_fkey FOREIGN KEY (tour_id) REFERENCES public.tours(id) ON DELETE CASCADE,
  ADD CONSTRAINT tour_guides_guide_id_fkey FOREIGN KEY (guide_id) REFERENCES public.guides(id) ON DELETE CASCADE;

ALTER TABLE public.tour_categories
  ADD CONSTRAINT tour_categories_tour_id_fkey FOREIGN KEY (tour_id) REFERENCES public.tours(id) ON DELETE CASCADE,
  ADD CONSTRAINT tour_categories_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;

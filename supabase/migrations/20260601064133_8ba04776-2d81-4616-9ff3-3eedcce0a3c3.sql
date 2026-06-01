ALTER TABLE public.guide_categories
  ADD CONSTRAINT guide_categories_guide_id_fkey FOREIGN KEY (guide_id) REFERENCES public.guides(id) ON DELETE CASCADE,
  ADD CONSTRAINT guide_categories_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;
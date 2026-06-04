-- Fix missing FK so PostgREST can embed tours into reviews
ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_tour_id_fkey FOREIGN KEY (tour_id) REFERENCES public.tours(id) ON DELETE CASCADE,
  ADD CONSTRAINT reviews_guide_id_fkey FOREIGN KEY (guide_id) REFERENCES public.guides(id) ON DELETE CASCADE,
  ADD CONSTRAINT reviews_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;

-- Tours pricing model
ALTER TABLE public.tours
  ADD COLUMN pricing_mode text NOT NULL DEFAULT 'fixed' CHECK (pricing_mode IN ('fixed','by_group')),
  ADD COLUMN base_language text NOT NULL DEFAULT 'Russian',
  ADD COLUMN language_multipliers jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN group_prices jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN children_free_under integer NOT NULL DEFAULT 16;

-- Backfill base_language from first available language
UPDATE public.tours
  SET base_language = COALESCE(languages[1], 'Russian')
  WHERE languages IS NOT NULL AND array_length(languages, 1) >= 1;

-- Backfill group_prices with current price_from as fixed price
UPDATE public.tours
  SET group_prices = jsonb_build_object('fixed', price_from)
  WHERE price_from > 0;

-- Bookings: family / category
ALTER TABLE public.bookings
  ADD COLUMN adults integer NOT NULL DEFAULT 1,
  ADD COLUMN children integer NOT NULL DEFAULT 0,
  ADD COLUMN group_category text CHECK (group_category IN ('private','small','group','large') OR group_category IS NULL);

-- Backfill adults from existing guests
UPDATE public.bookings SET adults = GREATEST(guests, 1);
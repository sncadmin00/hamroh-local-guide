ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'ru'
    CHECK (locale IN ('ru','uz','en'));

ALTER TABLE public.guides
  ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'ru'
    CHECK (locale IN ('ru','uz','en'));
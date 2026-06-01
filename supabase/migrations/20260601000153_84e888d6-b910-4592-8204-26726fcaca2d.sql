ALTER TABLE public.bookings ADD COLUMN source TEXT NOT NULL DEFAULT 'web';
ALTER TABLE public.bookings ADD CONSTRAINT bookings_source_check CHECK (source IN ('web','instagram','facebook','telegram','whatsapp','other'));
CREATE INDEX idx_bookings_source ON public.bookings(source);
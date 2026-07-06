DROP POLICY IF EXISTS "Anon can create guest booking" ON public.bookings;
DROP POLICY IF EXISTS "Authenticated can create own booking" ON public.bookings;
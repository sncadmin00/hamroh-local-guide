
## Tsel

Klient ostavlyaet otzyv na **tur** (a ne na gida). Sredniy reyting tura = po ego otzyvam. Sredniy reyting gida = po vsem otzyvam vsex ego turov.

## Izmeneniya v baze

1. **Ochistit `reviews`** — udalit vse starye zapisi.
2. **`reviews` table:**
   - Dobavit `tour_id uuid NOT NULL` (chto na kakoy tur otzyv).
   - Ostavit `guide_id` (denormalizatsiya dlya bystryx zaprosov i agregatsii).
   - Ostavit `booking_id` (svyaz s konkretnym bookingom — odin booking = odin otzyv).
   - Unique constraint: `(booking_id)` — odin otzyv na booking.
3. **`tours` table:** dobavit `rating numeric DEFAULT 5` i `reviews_count integer DEFAULT 0`.
4. **RLS reviews INSERT policy** — obnovit: trebovat chto `tour_id` sovpadaet s `bookings.tour_id`, booking prinadlezhit polzovatelyu i v statuse `completed`.
5. **Funktsii / triggery:**
   - `recompute_tour_rating(_tour_id)` — peresechet `tours.rating` i `tours.reviews_count`.
   - `recompute_guide_rating(_guide_id)` — uzhe est, ostavit (schitaet po `reviews.guide_id`, vse otzyvy gida).
   - Trigger `reviews_after_change` — rasshirit: vyzyvat **oba** pererascheta (tour + guide).

## Server functions

- `submitTourReview({ bookingId, rating, comment })` — proverit ownership + completed status, vstavit otzyv s `tour_id` i `guide_id` iz bookinga.
- `getTourReviews(tourId)` — spisok otzyvov tura (publichno).
- `getGuideReviews(guideId)` — spisok vsex otzyvov gida s ukazaniem `tour.title` dlya kazhdogo.

## UI

1. **Stranica tura** (`/tours/{slug}`):
   - Blok "Reyting tura" — zvezdy + kolichestvo.
   - Spisok otzyvov pod opisaniem tura.
   - Knopka "Ostavit otzyv" — vidna polzovatelyu u kotorogo est completed booking na etot tur i eshyo net otzyva.

2. **Stranica gida** (`/guides/{slug}`):
   - Sushestvuyushiy obshiy reyting (uzhe est) — ostaetsya.
   - Spisok otzyvov rasshirit: pokazyvat *"Otzyv na tur: {tour.title}"* nad kazhdym otzyvom (klikabelnaya ssylka na tur).

3. **Kartochka tura** (na glavnoy / `/tours` / poiske):
   - Pokazyvat zvezdy + kolichestvo otzyvov tura.

4. **Lichnyy kabinet klienta** (`/bookings`):
   - Dlya kazhdogo `completed` bookinga bez otzyva — knopka "Ostavit otzyv o ture".
   - Modal s zvezdami (1–5) + tekstom.

5. **Admin** (`/admin` → Reviews) i **Guide portal** (`/guide`):
   - Pokazyvat k kakomu turu otnositsya otzyv.

## Tehnicheskie detali

- `reviews.guide_id` ostaetsya — dlya skorosti i sushestvuyushix zaprosov.
- Uravnenie: kazhdyy review imeet `(booking_id, tour_id, guide_id)`, gde poslednie dva berutsya iz bookinga.
- Trigger pri INSERT/UPDATE/DELETE reviews → peresechet `tours.rating/reviews_count` **i** `guides.rating/reviews`.
- Starye reviews udalyayutsya, posle migratsii vse `tours.rating = 5`, `reviews_count = 0` i `guides.rating` peresechitaetsya.

## Files to edit/create

- Migration: ochistit reviews, alter `tours` + `reviews`, nove funktsii/triggery, obnovit RLS.
- `src/lib/reviews.functions.ts` (novyy) — submit / list server fns.
- `src/routes/tours.$slug.tsx` — blok reytinga + spisok otzyvov + CTA.
- `src/routes/guides.$slug.tsx` — pokazyvat nazvanie tura nad kazhdym otzyvom.
- `src/routes/bookings.tsx` (ili gde lichnyy kabinet) — knopka + modal "Ostavit otzyv".
- `src/components/ReviewForm.tsx` (novyy) — pereispolzuemaya forma.
- Kartochki turov (`TourCard` ili analog) — dobavit zvezdy.
- `src/routes/admin.tsx`, `src/routes/guide.tsx` — pokazat tour.title v spiske otzyvov.

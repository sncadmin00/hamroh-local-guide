## Idea

Sejchas klient broniruet **gida** — nepoyatno chto on pokajet i pochemu cena takaya. Pereydem na model: **kajdyy gid sozdayot svoi tury, klient broniruet tur**. Profil gida = vitrina ego turov. Booking vsegda privyazan k konkretnomu turu.

## Novaya model

**Tour = produkt:**
- Vladelets — odin gid (`tours.guide_id`)
- Cena po yazykam (Uzbek, Rus, English, …)
- Transport vklyuchen / net
- Goroda gde provoditsya (mojet byt neskolko)
- Dlitelnost, opisanie, foto, highlights, vklyucheno/ne vklyucheno

**Gid:**
- Mojet rabotat v neskolkix gorodax (sejchas tol'ko 1)
- Profil pokazyvaet ego tury
- Bronirovat samogo gida nelzya — tol'ko ego tury

**Booking:**
- Vsegda imeet `tour_id`
- Cena schitaetsya iz `tour.price_by_language[lang] × guests`

## Chto izmenitsya dlya polzovatelya

**Klient:**
- Kartochka tura pokazyvaet: foto, gid, gorod(a), dlitelnost, transport (znachok), yazyki s cenoy ($45 EN · $35 RU · $30 UZ)
- Knopka "Bronirovat" na strannice tura, ne u gida
- V forme bronirovaniya: vybor yazyka (s cenoy), kolichestvo lyudey, data/slot — vse kak sejchas, no privyazka k turu

**Gid (v kabinete):**
- Vkladka "Moi tury" (vmesto "Tours & prices")
- Sozdat tur: nazvanie, gorod(a), dlitelnost, opisanie, foto, highlights, vklyucheno, transport (checkbox), cena po yazykam
- Vidit zayavki/bookingi po svoim turam

**Profil gida (publichnyy):**
- Bio, yazyki, goroda gde rabotaet, otzyvy
- Spisok ego turov (kartochki) — otsyuda bronirovat
- Knopki "Bronirovat gida" net

## Tehnicheskie izmeneniya (DB)

```text
tours:
  + guide_id uuid NOT NULL (vladelets)
  + price_by_language jsonb        -- {"en":45,"ru":35,"uz":30}
  + transport_included bool
  + languages text[]               -- yazyki na kotorix provoditsya
  - tour_guides (tablica udalyaetsya)

guides:
  + cities (text[] slugov ILI cherez novuyu tablicu guide_cities)
  -- guides.city_id ostayotsya kak osnovnoy gorod

bookings:
  + tour_id uuid NOT NULL          -- glavnaya privyazka
    guide_id — ostayotsya (deriviruetsya iz tour, dlya filtrov/notifikaciy)
    + language text
    -- 'experience' kak svobodnyy tekst uxodit

guide_experiences:
  - migriruem v tours, tablitsu udalyaem
```

**RLS:**
- `tours` insert/update/delete: vladelets gid (cherez `is_guide_owner`) ILI admin
- Publichno vidny tol'ko `published = true`

**Migraciya dannyx:**
- Kajdyy ryad iz `guide_experiences` → `tours` (s `guide_id`, `title`, `duration_hours`, `price_from`, `price_by_language`, `published=true`, `city_id` iz `guides.city_id`)
- Sushestvuyushie `tours` bez privyazki k gidu — pereveshivayem na pervogo gida iz `tour_guides` (esli ego net, na pervogo gida tex je gorodov ili pomechaem nepublished)
- `bookings.tour_id` — popytat'sya soposavit po `experience` tekstu, ostatok ostavlyaem NULL (`tour_id` v starix bookingax → vremenno nullable)

## Kod (clyuchevyye fayly)

- `src/lib/guide-portal.functions.ts` — `listMyTours / upsertTour / deleteTour` vmesto experiences; pole `transport_included`, `languages`, `cities`
- `src/components/admin/ToursPanel.tsx` — admin vidit vse tury, mojet menyat vladel'tsa/skryvat
- `src/routes/guide.tsx` — vkladka "Moi tury" s editorom (po obraztsu tekuschego ExperienceEditor)
- `src/routes/tours_.$slug.tsx` — chipy yazykov-cen, znachok transporta, gid-vladelets v sidebar, knopka **"Bronirovat" → `/book/$tourId`**
- `src/components/home/TopTours.tsx`, `src/routes/tours.tsx` — chipy yazyko-cen v kartochke, znachok transporta
- `src/routes/guides_.$guideId.tsx` — sektsiya "Tury etogo gida" (kartochki, ssylki na `/tours/{slug}`); ubrat CTA "Bronirovat gida"
- `src/routes/book.$guideId.tsx` → **`src/routes/book.$tourSlug.tsx`** — forma broniruet tur:
  - vmesto `useGuide` → `useTour`
  - yazyk + ceny iz `tour.price_by_language`
  - sloty zagrujayem po `tour.guide_id`
  - `createBooking` poluchaet `tour_id` (i deriviruet `guide_id` na servere)
- `src/lib/booking.functions.ts` — `bookingSchema` prinimaet `tour_id`, validatsiya/server podstavlyaet `guide_id`, `total` perescityvaem po `tour.price_by_language` (ne doveryaem klientu)
- `src/lib/content-queries.ts` — `useTours/useTour` vozvraschayut `guide`, `price_by_language`, `transport_included`, `languages`; udalyayem mapping `experiences` u gida
- Stranica `/book/$guideId` ostayotsya tol'ko redirektom na pervyy tur gida (dlya starix ssylok)

## Vne plana

- Razdelnaya cena za "tour s transportom" vs "bez" (poka prosto flag — yesli nado dve seny, sdelaem otdelnymi turami)
- Privyazka tura k konkretnym mestam (places) — mojno potom
- Pravo gida bronirovat tur drugogo gida — net, tol'ko svoy

## Posle utverjdeniya

Sdelayu v takom poryadke:
1. Migratsiya BD (struktura + perenos dannyx iz guide_experiences) — pokaju vam SQL na podtverjdenie
2. Server-funktsii (tour CRUD, booking po tour_id)
3. Kabinet gida (Moi tury)
4. Publichnye stranicy turov (chipy/transport)
5. Stranica bronirovaniya po turu + redirekt staroy ssylki
6. Profil gida (spisok turov, ubrat broniru gida)

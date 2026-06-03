
# Tours kak otdelnyy razdel + Spotlight banner v adminke

Dve nezavisimye chasti. Mozhno delat parallelno ili po ocheredi — skazhi, esli xochesh tolko odno snachala.

---

## Chast 1. Tours kak otdelnaya sushnost

Sejchas v proekte est `guides`, `cities`, `places`, `articles`, `categories` (eto tegi dlya gidov: food, history...). **Net otdelnoy tablitsy turov** — to chto vyglyadit kak "tur", lezhit v `guide_experiences` (privyazany k odnomu gidu: title, duration, price).

Predlagayu sdelat **Tours** polnotsennoy sushnostyu:

### Baza dannyx — novaya migratsiya
- Tablitsa `tours`: `id`, `slug`, `title`, `short_description`, `description_md`, `cover_url`, `city_id` (FK), `guide_id` (FK, nullable — tur mozhet vesti odin iz neskolkix gidov), `duration_hours`, `price_from`, `category_ids` (cherez stykovuyu tablitsu), `highlights[]`, `included[]`, `not_included[]`, `published`, `sort_order`, `created_at`, `updated_at`.
- Stykovaya tablitsa `tour_guides` (mnogo-ko-mnogim: odin tur mogut vesti neskolko gidov).
- Stykovaya tablitsa `tour_categories` (privyazka k sushestvuyushim `categories`).
- RLS: publichnoe chtenie tolko published, admin — vse, GRANT-y dlya `anon`/`authenticated`/`service_role` po pravilam proekta.

### Frontend
- **`/tours`** — spisok turov s filtrami po gorodu i kategorii (kartochki s foto, dlitelnost, tsena ot, gorod).
- **`/tours/$slug`** — stranitsa tura: opisanie, fotografii, gid(y), chto vklyucheno, knopka "Zabronirovat" → veduet na `/book/$guideId?tour=$slug` (ili sobstvennyy flow bronirovaniya tura).
- Ssylka **Tours** v `SiteHeader` ryadom s Guides/Cities.
- Na glavnoy: blok "Populyarnye tury" (3-4 kartochki) — mozhno dobavit potom.
- i18n klyuchi EN/UZ/RU.

### Admin
- `/admin` → novaya vkladka "Tours": spisok, sozdat/redaktirovat/udalit, zagruzka foto v storage bucket `tour-photos`, privyazka gidov i kategoriy, toggle `published`.

### Vne skoupa (poka)
- Otdelnyy flow bookinga turov (ispolzuem sushestvuyushiy `/book/$guideId` s parametrom tura). Polnotsennyy tour booking — sleduyushaya iteratsiya.

---

## Chast 2. Spotlight banner v adminke

Sejchas spotlight items zaxardkozheny v `src/lib/spotlights.ts`. Perenosim v BD.

### Baza dannyx — novaya migratsiya
- Tablitsa `spotlights`: `id`, `kind` (enum: `new_guide` | `new_route` | `news` | `new_tour`), `title` (text), `description` (text), `image_url`, `href` (text — vnutrenniy URL kuda vedet), `is_active` (bool), `sort_order`, `published_at`, `expires_at` (nullable), `created_at`, `updated_at`.
- (Opitsionalno) tablitsa `spotlight_translations` dlya EN/UZ/RU — ili prosto polya `title_en/uz/ru`, `description_en/uz/ru`. **Rekomenduyu vtoroy variant** — proshe.
- RLS: publichnoe chtenie tolko aktivnyx i ne istekshix, admin — vse.

### Frontend
- `src/lib/spotlights.ts` udalit, zamenit na hook `useSpotlights()` v `content-queries.ts` (Supabase select aktivnyx, otsortirovannyx po `sort_order`).
- `SpotlightBanner.tsx` chitaet iz hooka, beret `title/description` po tekushemu lokalu (`title_ru` / `title_en` / `title_uz`), label po `kind`.
- Esli spiska net — banner ne pokazyvaetsya.

### Admin
- `/admin` → novaya vkladka "Spotlight" (ili "Banner novostei"):
  - Spisok vsex spotlight, drag-and-drop sort_order ili strelki.
  - Sozdat/redaktirovat: kind (vybor iz 4), 3 yazyka tit/desc, image upload v bucket `spotlights`, href (vybor iz guides / cities / tours / custom URL), is_active toggle, expires_at (opisalno).
  - Udalit.

---

## Voprosy pered startom

1. **Delaem obe chasti seychas, ili tolko odnu?** (Tours + Spotlight admin / tolko Tours / tolko Spotlight)
2. **Tours i guides — kakaya svyaz?** Variant A: tur privyazan k 1 gidu (proshe). Variant B: mnogo gidov mogut vesti odin tur (gibche, no slozhnee admin).
3. **Booking tura** — poka veduem na bronirovanie gida (s pomekoy "tur: ..."), ili nuzhen otdelnyy flow s privyazkoy k touru? *Rekomenduyu pervoe poka.*
4. **Spotlight perevod** — 3 polya na yazyk v odnoy tablitse (proshe), ili otdelnaya tablitsa `spotlight_translations`? *Rekomenduyu pervoe.*

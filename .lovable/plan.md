## Top Tours na glavnoy

### Chto delaem
Sozdayem `src/components/home/TopTours.tsx` po obraztsu `FeaturedGuides.tsx`, no **gorizontalnaya karusel i na mobile, i na desktop** (kak prosili).

- Berem dannye iz sushchestvuyushchego `useTours()` hooka, filtruem `published`, sortiruem po `sort_order`, beryom top 8.
- Kazhdaya kartochka: `cover_url`, title, gorod, dlitelnost (`X ch`), cena (`ot $Y`), --> `Link to="/tours/$slug"`.
- Karusel: `flex snap-x snap-mandatory gap-4 overflow-x-auto`, kartochka `w-72 shrink-0`. Tonkiy scrollbar.
- Zagolovok "Top tours" + ssylka "Smotret vse →" na `/tours`.
- Esli turov net — komponent vozvrashchaet `null` (kak FeaturedGuides).

### i18n
Dobavlyaem klyuchi v `src/lib/i18n.tsx`:
- `topTours.title` (Top tury / Top tours / Top turlar)
- `topTours.subtitle`
- `topTours.viewAll`
- `topTours.from` ("ot")
- `topTours.hours` ("ch" / "h" / "soat")

### Vstavka v glavnuyu
V `src/routes/index.tsx` dobavlyaem `<TopTours />` **srazu posle** `<FeaturedGuides />`.

### Chto NE delaem
Ne menyaem `FeaturedGuides`, ne trogaem `/tours` stranicu, ne menyaem schemu BD.
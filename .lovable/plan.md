## Cel

Pod AI-poiskom na glavnoy zamenit chetyre otdelnyh gorizontalnyh sekcii odnoy kompaktnoy sekciey s tabs na desktop. Na mobile povedenie ne menyaem.

## Chto menyaetsya

**Desktop / tablet (>= 768px):**
Vmesto stopki `FeaturedGuides` -> `TopTours` -> `Browse by interest` -> `PopularCities` poyavlyaetsya odna sekciya `ExploreTabs` s 4 tabs sverhu:

```text
+--------------------------------------------------+
|  [Top guides] [Top tours] [Popular cities] [Explore]
|                                                  |
|  <kontent aktivnogo taba>                        |
+--------------------------------------------------+
```

- Top guides -> grid kartochek gidov (sushchestvuyushchiy `GuideCard`, top-6 po reytingu)
- Top tours -> grid kartochek turov (logika iz `TopTours`)
- Popular cities -> chipy gorodov + blok "auto-detected" (logika iz `PopularCities`)
- Explore -> chipy kategoriy "Browse by interest" iz `index.tsx`

Tabs vystroeny po centru, pod nimi "View all" ssylka v pravom uglu, vedushchaya na sootvetstvuyushchiy razdel (/guides, /tours, /guides s gorodom, /guides s kategoriey).

**Mobile (<768px):**
Vse ostaetsya kak seychas - `FeaturedGuides`, `TopTours`, "Browse by interest", `PopularCities` renderyatsya stopkoy s gorizontalnym scroll vnutri kazhdoy. Tabs ne pokazyvayutsya.

**Become a guide CTA** ostaetsya otdelnoy sekciey vnizu stranicy bez izmeneniy.

## Tehnicheskie detali

1. Novyy komponent `src/components/home/ExploreTabs.tsx`:
   - Ispolzuet `useIsMobile()` iz `src/hooks/use-mobile.tsx`.
   - Esli mobile -> rendert posledovatelno `<FeaturedGuides />`, `<TopTours />`, `<BrowseByInterest />`, `<PopularCities />` (chtoby logika ne dublirovalas).
   - Esli desktop -> rendert `<Tabs>` iz `src/components/ui/tabs.tsx` s 4 panelyami.
2. Vydelit "Browse by interest" iz `src/routes/index.tsx` v otdelnyy komponent `src/components/home/BrowseByInterest.tsx` (chistyy refactor, bez izmeneniya razmetki), chtoby ego mozhno bylo perepolzovat i v tabs, i v mobile-stopke.
3. V `src/routes/index.tsx` zamenit blok `<FeaturedGuides /> <TopTours /> {categories...} <PopularCities />` na odin `<ExploreTabs />`.
4. Vnutri tab-paneley perepolzuem sushchestvuyushchuyu logiku iz `FeaturedGuides`/`TopTours`/`PopularCities` - extragiruem grid/list chasti v "presentational" pod-komponenty, chtoby izbezhat dublirovaniya:
   - `FeaturedGuidesGrid` (chistyy grid bez wrapping section/zagolovka)
   - `TopToursGrid`
   - `PopularCitiesContent`
   - `BrowseByInterestList`
   Zagolovki `h2 + subtitle` i `View all` link ostayutsya v `ExploreTabs` ryadom s tabs (ne dublirovat).
5. Perevody dlya tab-labels v `src/lib/i18n.tsx`:
   - `explore.tabs.guides` = "Top guides"
   - `explore.tabs.tours` = "Top tours"
   - `explore.tabs.cities` = "Popular cities"
   - `explore.tabs.explore` = "Explore"
   (+ uz/ru varianty)

## Chto NE menyaem

- Mobile verstka i `BecomeGuideCTA` ostayutsya kak est.
- Hero, AI-poisk, `SpotlightBanner`, `LatestPosts`, `FeaturedReviews`, footer - bez izmeneniy.
- Marshrutizaciya, dannye, RLS - bez izmeneniy.

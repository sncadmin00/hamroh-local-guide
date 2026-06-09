## Tsel
Privesti glavnuyu k maketu: minimum blokov, vse v stile Airbnb-borderless, foto gidov v krugleshkax.

## Novaya struktura glavnoy (`src/routes/index.tsx`)

```text
SiteHeader
HeroSearch                       (ostavlyaem kak est)
─────────
Kategorii (Interesy)             ← BrowseByInterest
Spotlight Gid (1 za raz)         ← NEW: karusel top-rated, autoplay 6s + strelki
Spotlight Tur (1 za raz)         ← NEW: karusel top-rated, autoplay 6s + strelki
Booking CTA blok                 ← NEW: bolshaya kartochka -> /book
FeaturedReviews                  (ostavlyaem)
Banner "Stat gidom"              (perenosim vniz, uzhe est)
SiteFooter
```

## Chto udalyaem s glavnoy
- `SpotlightBanner` (Whats New) — udalit blok i import
- `ExploreTabs` — ubrat (tabs s tours/guides/cities/explore)
- `WhyHamroh`, `HomeFaq` — ubrat (uproshchaem)
- `TrustBar` — ubrat (uproshchaem)
- Otdelnye sekcii `TopTours`, `FeaturedGuides`, `PopularCities` na glavnoy bolshe ne zovutsya

(Komponenty ostayutsya v repo — mogut ispolzovatsya v drugix mestax; tolko ubiraem ix import/render iz `index.tsx`.)

## Novye komponenty

### `src/components/home/SpotlightGuideCarousel.tsx`
- Beret `useGuides()`, sortiruet po `rating desc`, beret top 5
- Pokazyvaet po **odnomu** gidu s krupnym foto v **krugleshke** (`aspect-square rounded-full`)
- Pod foto: imya, gorod, reyting, yazyki, knopka "Smotret profil" -> `/guides/$guideId`
- Avtoproletka kazhdye 6 sekund, pauza na hover/focus, strelki sleva/sprava, dots vnizu
- Logika autoplay = kak v `SpotlightBanner` (useEffect + setInterval + paused state)

### `src/components/home/SpotlightTourCarousel.tsx`
- Beret `useTours()`, sortiruet po `rating desc` (ili `price_from`/recently), top 5
- Pokazyvaet po odnomu turu: bolshoe foto (rounded-2xl, **ne krug**), nazvanie, gorod, dlitelnost, cena, knopka "Podrobnee" -> `/tours/$slug`
- Avtoproletka 6s + strelki + dots, ta zhe mexanika

### `src/components/home/BookingCtaBlock.tsx`
- Krupnaya kartochka po centru: zagolovok ("Gotovy zabronirovat tur?"), korotky tekst, knopka -> `/book`
- Bez formy — tolko CTA so ssylkoy (po vyboru polzovatelya)
- Stilistika sovpadaet s sushchestvuyushchim banner gida (gradient + rounded-3xl)

## Izmeneniya v sushchestvuyushchix kartochkax

### `GuideCard` (`src/components/GuideCard.tsx`)
- Foto: `aspect-square rounded-full` vmesto `aspect-[4/5] rounded-2xl`
- Ubrat badges (Verified/Instant) i WishlistHeart s foto — chistyy krugleshok
- Pod krugleshkom (po centru): imya, gorod, malenkaya stroka s reytingom
- Ubrat Multi-city/Bilingual ikonki — maksimalno chisto
- Verified badge mozhno ostavit malenkim znachkom ryadom s imenem (ili udalit polnostyu)

Vlияет na vse mesta gde renderitsya `GuideCard` (`FeaturedGuides`, `/guides`, `ExploreTabs`). Eto ok — soglasno trebovaniyu "v kartochkax foto v krugleshok".

## i18n
Dobavit klyuchi v `src/lib/i18n.tsx` dlya 3 yazykov (en/ru/uz):
- `home.spotlightGuide.title`, `home.spotlightGuide.cta`
- `home.spotlightTour.title`, `home.spotlightTour.cta`
- `home.bookingCta.title`, `home.bookingCta.subtitle`, `home.bookingCta.button`

## Fayly

**Sozdat:**
- `src/components/home/SpotlightGuideCarousel.tsx`
- `src/components/home/SpotlightTourCarousel.tsx`
- `src/components/home/BookingCtaBlock.tsx`

**Izmenit:**
- `src/routes/index.tsx` — perepisat sostav glavnoy
- `src/components/GuideCard.tsx` — krugleshok + chistka
- `src/lib/i18n.tsx` — novye klyuchi

**Ne trogat:** `HeroSearch`, `FeaturedReviews`, banner "Stat gidom" (uzhe est v index.tsx), kabinety, admin, stranicy `/guides`, `/tours`, `/book` — soglasno predydushchemu reshenyu po ob'yomu.

## Vne ob'yoma
- Redizayn detalnyx stranic gida/tura i bookinga uzhe sdelan v predydushchix iteracyax — zdes ne trogaem.
- Komponenty `ExploreTabs`/`WhyHamroh`/`HomeFaq`/`TrustBar`/`SpotlightBanner` ostayutsya v repo (na sluchay vozvrata), prosto ne ispolzuyutsya na glavnoy.

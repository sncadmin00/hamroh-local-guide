# Plan: 5 ulushenij glavnoy stranicy Hamroh

## 1. Dobavit H1 i perekomponovat hero
**Fayl:** `src/routes/index.tsx`

- Dobavit krupnyy zagolovok H1 nad statistikoy: "Naydite proverennogo mestnogo gida za 30 sekund" (s perevodami v `i18n`)
- Podzagolovok pod nim: "AI podberyot vam ideal'nogo gida v Uzbekistane i ne tol'ko"
- Umen'shit verkhniy padding (`py-10 md:py-24` → `py-6 md:py-16`)
- Peremestit' statistiku + trust-bar **pod** AI-input (sayichas oni sverkhu i otvlekayut ot glavnogo CTA — inputa)
- Poryadok: SpotlightBanner → H1 → podzagolovok → AI-input → tagline → statistika → trust-bar → "how it works" steps

## 2. Skeleton-loadery vmesto "Loading..."
**Fayly:** `src/components/home/FeaturedGuides.tsx`, `TopTours.tsx`, `PopularCities.tsx`, `src/components/home/ExploreTabs.tsx`

- Zamenit' tekstovyy `<EmptyState>Loading…</EmptyState>` na shimmer-karochki ispol'zuya `Skeleton` iz `@/components/ui/skeleton`
- Pokazyvat' 3-6 skeleton-karochek s temi je proportsiyami (aspect-ratio), chto i nastoyaschie karochki
- Razlichit' "zagrujaetsya" (skeleton) vs "pusto" (drugoy state s ikonkoy)

## 3. Novye sektsii "Pochemu Hamroh" + FAQ
**Novye fayly:**
- `src/components/home/WhyHamroh.tsx` — 4 karochki s ikonkami: Proverennye gidy / Pryamaya svyaz / Bezopasnaya oplata / Besplatnaya otmena
- `src/components/home/HomeFaq.tsx` — 5-6 voprosov v `Accordion` iz shadcn (Kak rabotaet? Kak oplachivat'? Mojno li otmenit'? i t.d.)

**Vstavit' v** `src/routes/index.tsx` mejdu `ExploreTabs` i `LatestPosts`:
```
<ExploreTabs />
<WhyHamroh />
<LatestPosts />
<FeaturedReviews />
<HomeFaq />
<BecomeGuideCTA />
```

Dobavit' JSON-LD `FAQPage` schema v `head()` glavnoy stranicy dlya SEO.

## 4. Pochinit' header
**Fayl:** `src/components/SiteHeader.tsx`

- "Find a guide" → "Guides" (chtoby ne perenosilos' na 2 stroki)
- "BOOK" → "Book" (ubrat' kaps, sdelat' kak ostal'nye punkty)
- Na mobile spryatat' ikonku heart v menu (ostavit' tol'ko EN, gamburger, user)
- Dobavit' `whitespace-nowrap` na nav-linki

## 5. Garmonizirovat' "Become a guide" banner
**Fayl:** `src/components/home/BecomeGuideCTA.tsx`

- Zamenit' temno-siniy gradient na brendovyy: ot `#8BB5A9` (sage) k `#D5A08D` (terracotta)
- Ili variant: teplyy beje fon s tekstom temnym i CTA-knopkoy sage
- Sokhranit' okruglyye uglovaya i shadow, no obnovit' tsveta pod paletu sayta

## Tekhnicheskie zametki
- Vse novye stroki teksta dobavlyayutsya v `src/lib/i18n.tsx` dlya vseh podderjivaemyh yazykov (en, ru, uz)
- Dlya skeletonov ispol'zovat' suschestvuyuschiy `Skeleton` komponent
- FAQ Accordion uje est' v `src/components/ui/accordion.tsx`
- WhyHamroh ikonki vzyat' iz `lucide-react` (ShieldCheck, MessageCircle, CreditCard, RefreshCw)
- Posle dobavleniya FAQ obnovit' JSON-LD v `head()` route `/` dobavit' `FAQPage` schema

## Chto ne menyaem
- AI-input i ego stilizatsiya (rabotaet horosho)
- Logika `ExploreTabs` na desktope
- Karochki gorodov (uje pochineny)
- Spotlight banner

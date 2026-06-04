## Ideya

Sejchas tury — produkt, a gidy — ispolniteli. V UI vse naoborot: snachala gidy, potom tury. Pomenyaem poryadok vezde, gde oni stoyat ryadom.

## Chto menyaetsya

**Header navigatsiya (`SiteHeader.tsx`)**
Poryadok ssylok: Tury → Naydi gida → Bronirovat → Stat' gidom → FAQ
(sejchas: Naydi gida → Tury → ...)

**Glavnaya, desktop tabs (`ExploreTabs.tsx`)**
Poryadok i defolt: `tours` → `guides` → `cities` → `explore`. Defoltnyy tab — `tours`.

**Glavnaya, mobile sekcii (`ExploreTabs.tsx`)**
Poryadok: `TopTours` → `FeaturedGuides` → `PopularCities`
(sejchas: FeaturedGuides → TopTours → PopularCities)

**SEO/teksty glavnoy (`routes/index.tsx`, `i18n`)**
Podzagolovok i meta-description sdvigayutsya v storonu "naydi tur" (a ne "naydi gida"). H1 ostavlyaem kak est' — eto AI-chat, on universalen. Konkretnye stroki podberu pri realizatsii (RU/UZ/EN).

## Vne plana (po umolchaniyu ne trogaem)

- Profil gida `guides_.$guideId.tsx` — tam gid eto kontekst, sektsiya "Tury etogo gida" uje pervaya posle bio.
- `/guides` i `/tours` stranicy spiskov — ostayutsya kak est'.
- Tablicy, RLS, server-funktsii — nichego ne menyaetsya, eto chisto UI.

OK?
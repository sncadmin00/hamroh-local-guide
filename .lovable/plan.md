# Plan: "Book an experience" + IP geolokaciya

## Chto poyavitsya

### 1. Sticky knopka v header
- V `SiteHeader` dobavlyaem zametnuyu CTA "Book an experience" (s ikonkoy compass/sparkle), vidnuyu na vsex stranicax.
- Mobilno: kompaktnaya versiya (ikonka + korotkiy tekst).
- Vedet na novy route `/book`.
- Perevody EN/RU/UZ: "Book an experience" / "Zabronirovat opyt" / "Tajriba bron qilish".

### 2. Novaya stranica `/book` (wizard "vybor → rezultaty")

**Verkh stranicy — 3 bolshie kartochki vybora:**
```text
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   🌍 Strana  │  │   🏙 Gorod   │  │   ✨ Interes │
│  Uzbekistan  │  │  Samarkand   │  │  Gastronomy  │
└──────────────┘  └──────────────┘  └──────────────┘
```
- Kartochki = popovers/dropdowns s poiskom (kak `CityPicker`).
- Strana poka odna (Uzbekistan), no struktura gotova k masshtabu.
- "Gorod" zavisit ot strany; "Interes" — vse kategorii iz `categories`.
- Kazhdy filtr mozhno ochistit (×).

**Nizh — rezultaty s tabami: Vse | Gidy | Tury**
- "Vse" — smeshannaya lenta (gidy i tury vmeste), sortirovka po reytingu/populyarnosti.
- "Gidy" — `GuideCard` grid (kak na `/guides`).
- "Tury" — `TourCard` grid (kak na `/tours`).
- Logika filtraciи:
  - Tolko interes → vse gidy + tury etoy kategorii vo vsex gorodax.
  - Interes + gorod → tolko v etom gorode.
  - Tolko gorod → vse gidy/tury goroda.
  - Nichego ne vybrano → vse opublikovannye, otsortirovano po blizosti k IP-gorodu polzovatelya.
- Schyotchik: "N experiences found".

**URL-sostoyanie:** `/book?country=uz&city=samarkand&category=food&tab=all` — chtoby ssylki byli shareable.

### 3. IP geolokaciya

**Backend:** novy server function `detectLocation` v `src/lib/geo.functions.ts`.
- Beret IP iz `getRequestHeader('cf-connecting-ip')` / `x-forwarded-for` (Cloudflare Worker).
- Resolvit cherez besplatniy IP-API (predlojenie: `ipapi.co/{ip}/json/` ili `ip-api.com` — ne trebuyut klyucha, rabotayut iz Worker). Kesh v session storage na storone klienta na 24 chasa.
- Vozvrashaet `{ country, city, lat, lng }`.
- Privyazku k bligayshemu gorodu iz nashey BD delaem cherez `nearestCityNames(cities, lat, lng, 1)` (uzhe est v `src/data/cities.ts`).

**Ispolzovanie:**
1. **Na glavnoy (`/`):** v `PopularCities` dobavlyaem v nachalo bloka "Near you: {city}" — odna kompaktnaya kartochka s vyborom goroda po IP.
2. **V `/book` wizard:** pri otkrytii avto-predzapolnyaem polya Strana + Gorod iz IP (esli polzovatel ne prishel s parametrami v URL). Polzovatel mozhet legko smenit. Pokazyvaem nenavyazchivuyu metku "Auto-detected by your location · change".
3. **Fallback:** esli IP-API ne otvetil ili polzovatel za VPN — prosto pokazyvaem vse, bez avtovybora. Nikakix oshibok.

**Privatnost:** IP ne sokhranyaem v BD, tolko ispolzuem v moment zaprosa. Dobavim v footer/privacy stroku "We use your IP only to suggest nearby cities."

## Tekhnicheskie detali

**Novy/izmenyaemye fayly:**
- `src/components/SiteHeader.tsx` — knopka "Book an experience".
- `src/routes/book.tsx` — novy route s wizard + tabami.
- `src/lib/geo.functions.ts` — server fn `detectLocation`.
- `src/hooks/useDetectedLocation.ts` — React-hook s kesh v sessionStorage.
- `src/components/home/PopularCities.tsx` — sektsiya "Near you".
- `src/lib/i18n.tsx` — novye stroki (EN/RU/UZ): book.cta, book.title, book.country, book.city, book.interest, book.tab.all/guides/tours, book.nearYou, book.autoDetected, book.change, book.noResults.
- `src/lib/content-queries.ts` — pri neobxodimosti dobavit hook `useTours()` esli ego eshyo net dlya peremennoy lenty.

**Bez izmeneniy v BD** — vse dannye uzhe est (`guides`, `tours`, `cities`, `categories`, `guide_categories`, `tour_categories`).

**IP-API zapas:** `ipapi.co` daet 1000 zaprosov/den besplatno bez klyucha, no esli upremsya — zameneem na `ip-api.com` (45 req/min bez klyucha) ili dobavim `IPAPI_KEY` v secrets.

## Chego NE delaem (chtoby ne razduvat)
- Ne stroim multi-country UI (Strana poka tolko Uzbekistan, no struktura est).
- Ne menyaem AI-poisk na glavnoy — knopka "Book" eto vtoroy put, ne zamena.
- Ne trogaem `/guides` i `/tours` — oni ostayutsya kak est.

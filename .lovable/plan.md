## Problem
На мобиле (390px) карточки в горизонтальных скроллах (Featured Guides, Top Tours) имеют ширину `w-72` (288px) — почти весь экран, и картинки `aspect-[4/3]` получаются ~216px высотой. Выглядит непропорционально большим.

Города (Popular Cities) тоже занимают много вертикали — `aspect-[3/4]` в 2 колонки.

## Changes

**1. `src/components/home/FeaturedGuides.tsx`**
- Mobile scroll card: `w-72` → `w-60` (288 → 240px), чтобы вторая карточка явно выглядывала справа (peek = affordance скролла).

**2. `src/components/home/TopTours.tsx`**
- Mobile scroll card: `w-72` → `w-60`.
- Desktop остаётся как есть (тот же `w-72` достаточно компактен на ≥md).

**3. `src/components/home/PopularCities.tsx`**
- Mobile aspect: `aspect-[3/4]` → `aspect-[4/5]` (короче по высоте, картинки меньше). Desktop `md:aspect-[4/5]` остаётся.

**4. Sections vertical padding (опционально, для общей компактности на мобиле)**
- `FeaturedGuides`, `TopTours`, `PopularCities`: `py-16 md:py-20` → `py-10 md:py-20`.

## Out of scope
- Десктопная сетка/раскладка.
- Tabs (ExploreTabs) — на мобиле уже не показываются.
- Контент/тексты карточек.

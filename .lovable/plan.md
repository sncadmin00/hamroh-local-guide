## Status

Admin uje umeet privyazyvat tur k kategoriyam (`ToursPanel.tsx` — chipy + zapis v `tour_categories`). U gida v kabinete (`src/routes/guide.tsx`) etogo net.

## Chto delaem

**`src/lib/guide-portal.functions.ts`**
- `listMyTours` — dobavit v select `tour_categories(category_id)` i v vozvrat polu `category_ids: string[]` u kajdogo tura.
- `upsertTourSchema` — dobavit `category_ids: z.array(z.string().uuid()).max(20).default([])`.
- `upsertTour.handler` — posle insert/update tura: `delete from tour_categories where tour_id = X`, zatem `insert` parami `{tour_id, category_id}` dlya kajdogo iz `category_ids`. RLS na `tour_categories` tol'ko dlya adminov — poetomu dlya etoy chasti ispolzuem `supabaseAdmin` (vladelets tura uje proveren ranshe v handlere).

**`src/routes/guide.tsx` (`TourEditor`)**
- Pokazat kategorii cherez `useCategories()` v vide chipov (kak v admin-panele).
- Lokalnyy state `selectedCats: string[]`, init iz `initial?.category_ids`.
- V `onSave` peredavat `category_ids: selectedCats`.
- Tip `Tour` rasshirit `category_ids: string[]`.

## Vne plana

- Migraciya RLS dlya `tour_categories` chtoby vladelets tura mog pisat napryamuyu — ne delaem; ispolzuem `supabaseAdmin` v server-fn (proshe i bezopasno).
- Skripty avtomaticheskogo razlojeniya sushestvuyushchih 20 turov po kategoriyam — vruchnuyu cherez UI.

OK?
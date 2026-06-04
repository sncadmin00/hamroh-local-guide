## Rekomendacii poxojyx turov

Dobavit blok "Poxojiye tury" vnizu stranicy `/tours/<slug>`.

### Logika podbora
1. Sperva ishchem tury s **toy je kategoriey** (lubaya iz kategoriy tekushchego tura).
2. Esli nedostatochno — dobavlyaem tury iz **togo je goroda**.
3. Isklyuchaem tekushchiy tur, berem do 4 sht.

### Izmeneniya v kode

**`src/lib/content-queries.ts`** — dobavit hook `useSimilarTours(tour)`:
- Zapros vseh published turov (libo perebrat `useTours()` i otfiltrovat na kliyente).
- Score: +2 za sovpadenie kategorii, +1 za sovpadenie goroda.
- Sortirovka po score, slice(0, 4).

**`src/routes/tours_.$slug.tsx`** — pod osnovnym kontentom (posle `</div>` zakryvayushchego grid, pered `</main>`) dobavit sekciyu:
- Zagolovok "Poxojiye tury" / `t("tours.similar")`.
- Setka 2 kolonki na mobile, 4 na desktop.
- Karty v tom je stile, chto i na `/tours` (kompaktnye: foto, gorod, dlitelnost, nazvanie, cena ot).
- Esli rekomendaciy net — sekciya ne renderitsya.

**`src/lib/i18n.ts`** — dobavit klyuch `tours.similar` (ru/en/uz).

### Tehnicheskiye detali
- Vynesti razmetku karty turu v melkiy lokalnyy komponent `TourCard` vnutri faila marshruta (ili pereispolzovat sushchestvuyushchuyu razmetku iz `tours.tsx` kopiey — kratkoy, bez vynesenia v shared, chtoby ne menyat drugiye fayly).
- RLS i zaprosy ne zatragivayutsya.

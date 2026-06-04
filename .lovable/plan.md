## Ideya

V sekciyu `TopTours` na glavnoy dobavit gorizontal'nyy ryad chipov-kategoriy nad spiskom turov. Klik po chipu — filtruet karusel klient-saydno (po `tour.tour_categories[].categories.slug`). Chip "Vse" sbrasyvaet.

## Chto delaem

**`src/components/home/TopTours.tsx`**
- Dergaem `useCategories()` ryadom s `useTours()`.
- Lokal'nyy state `active: string | null` (null = "Vse").
- Pokazyvaem tol'ko te kategorii, u kotoryh est' hotya by odin opublikovannyy tur (chto by ne bylo pustyh chipov).
- Chipy v gorizontal'nom skrolle (kak v `BrowseByInterest`), aktivnyy — tyomnyy fon.
- Filtruem `tours` po `active`, berem `slice(0, 8)`. Esli posle filtra pusto — pokazat' nebol'shuyu zaglushku "v etoy kategorii poka net turov".
- Sortirovka kak sejchas (po `sort_order`, kotoryy uje delaet zapros) — "luchshie" zadayut admin/gid cherez sort. Otdel'nyy rating-sort ne vvodim.

**i18n**
- Dobavit klyuch `topTours.all` ("Vse" / "Hammasi" / "All") dlya chipa-sbros.
- Imena kategoriy — cherez `tCategory(slug, name)` kak v `BrowseByInterest`.

## Vne plana

- Sortirovka po reytingu/populyarnosti — net (pole `rating` na turah otsutstvuet).
- Filtr na desktop-tabe "Tours" v `ExploreTabs` — ne trogaem, tam vsego 6 kartochek.
- Server-side filtr ili otdel'nye URL — net, vse v pamyati, dannye uje zagrujeny.

OK?
## Dobavit demo-dannye: 4 tura + 4 banera

Zaseedim bazu cherez `INSERT` (data, ne migration), chtoby srazu uvidet kak vyglyadit Tours i Spotlight banner. Vsyo legko udalit potom iz adminki.

### 4 Spotlight banera
Razniye `kind` chtoby pokazat vse varianty znachka:
1. **new_guide** — "Novyj gid v Samarkande" → `/guides`
2. **new_route** — "Novyj marshrut po Bukhare" → `/tours`
3. **news** — "Hamroh zapuskaet Tury" → `/tours`
4. **new_tour** — "Gastronomicheskij tur v Tashkente" → `/tours`

Kazhdyj s title/description na 3 yazykah (en/ru/uz), `image_url` iz Unsplash (uzbekistan/samarkand temy), `is_active=true`, `sort_order` 1..4.

### 4 Fake tour
Privyazka k sushchestvuyushchim gorodam (vozmu pervye iz `cities`), `published=true`:
1. **Samarkand Classic** — 6 chasov, ot $40, highlights: Registan, Gur-Emir, Shah-i-Zinda
2. **Bukhara Old Town Walk** — 4 chasa, ot $30, highlights: Lyabi-Hauz, Ark, Kalyan
3. **Tashkent Food Tour** — 3 chasa, ot $25, highlights: Chorsu Bazaar, plov-centr, chaykhana
4. **Khiva Inside the Walls** — 5 chasov, ot $35, highlights: Ichan-Kala, Kalta-Minor, Juma Mosque

Kazhdyj tur s `cover_url` (Unsplash), `short_description`, `description_md`, `highlights[]`, `included[]` (gid, voda, transfer), `not_included[]` (vhodnye bilety, obed). 

**Privyazka gidov:** k kazhdomu turu privyazhu 1-2 sushchestvuyushchih gida iz `guides` (po `city_id` tura) cherez `tour_guides`. Esli v gorode net gidov — tur sozdam bez privyazki, knopka "Book" pokazhet pervogo dostupnogo gida iz lyubogo goroda kak fallback (ili skroyu knopku).

### Technicheskie detali
- Vse vstavki cherez `supabase--insert` (eto data, ne schema).
- Snachala `SELECT` iz `cities` i `guides` chtoby vzyat realnye UUID — potom INSERT s nimi.
- Slugy: `samarkand-classic`, `bukhara-old-town`, `tashkent-food`, `khiva-inside-walls`.
- Esli zahochesh udalit demo-dannye — prosto v `/admin/tours` i `/admin/spotlight` udalit ih po odnomu, ili ya pozzhe sdelayu odin SQL na ochistku po slug/title prefiksu.

### Chto NE delaem
- Ne menyaem schemu, ne trogaem kod komponentov, ne dobavlyaem novye stranicy. Tolko seed data.
## Hybrid search bar: AI text + date range

Zamenyaem 3 polya (Where / When / Guests) na 2 polya: bolshoe AI-pole + range dat (From → To). Gorod, kolichestvo gostey i prochee AI vyderet iz svobodnogo teksta.

### Layout (desktop pill / mobile stacked)

```text
[ 🧭  Describe your trip — e.g. "2 of us in Samarkand…" ] | [📅 From] | [📅 To] | [🔍 Search]
```

- AI-pole rastyagivaetsya (`flex-1`), zanimaet osnovnoe mesto
- From / To — kompaktnye date inputs s `min` ot segodnyashney daty; To dolzhna byt' ≥ From
- Knopka Search ostaetsya kak seychas

### Changes

**`src/components/home/HeroSearch.tsx`**
- Sostoyanie: `describe: string`, `from: string`, `to: string` (ISO yyyy-mm-dd). Ubrat' `where`, `when`, `guests`.
- Icons: zamenit' `MapPin` → `Sparkles` dlya AI-polya, ostavit' `Calendar` × 2.
- `buildPrompt()`: berem `describe` kak osnovu, dobavlyaem date range frazoy ("from X to Y" / "s X po Y" / "X dan Y gacha") esli dany. Esli `describe` pustoy — ispolzuem fallback `t("hero.search.aiHint")` ili blokiruem submit.
- Validatsiya: `from >= today`, `to >= from`. Esli oba pustye — vse ravno otpravlyaem (AI sprosit datu).
- Submit flow — bez izmeneniy (createThread → /ai/$threadId, guest → /login s pendingAiPrompt).

**`src/lib/i18n.tsx`** — dobavit' klyuchi, ostavit' staryie ne tronutymi:
- `hero.search.describe` — placeholder bolshogo polya
  - en: "Describe your trip — city, interests, who's coming…"
  - ru: "Opishite poezdku — gorod, interesy, kto edet…"
  - uz: "Sayohatingizni tasvirlang — shahar, qiziqishlar, kim boradi…"
- `hero.search.from` — en: "From", ru: "S", uz: "Dan"
- `hero.search.to` — en: "To", ru: "Po", uz: "Gacha"
- `hero.search.dateRange` (dlya promta) — en: "from {from} to {to}", ru: "s {from} po {to}", uz: "{from} dan {to} gacha"

### Out of scope
- Calendar popover (Shadcn DatePicker) — poka native `<input type="date">` kak seychas; mozhno proapgreidit' otdelno.
- Avtokomplit gorodov — ne nuzhen, AI parsit svobodnyy tekst.
- Polya `guests` net — AI sprosit pri neobkhodimosti v chate.
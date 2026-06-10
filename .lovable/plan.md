# Bolshoy AI-poisk v hero + stranica /search s filtrami

## Idea

Geroynaya stranica = odno bolshoe pole "Where are you going?" (AI). Pri otpravke perehodim ne v chat, a na novuyu stranicu **/search** s polnymi filtrami: daty, gorod, kategorii, yazyk, instant-book. AI-zapros polzovatelya peredayem kak `?q=...` i pokazyvayem nad rezultatami chip "Your request" + knopku "Ask AI about this trip" (otkroet AI-thread s tem zhe promptom).

## Izmeneniya

### 1. `src/components/home/HeroSearch.tsx` (uprostit)
- Udalit polya `from` / `to`, ostavit tolko bolshoe pole `describe` s ikonkoy `Sparkles` i knopku Search.
- Pole rastyanut na vsyu shirinu pill-a, placeholder: `t("hero.search.describe")` (uzhe yest, mozhno utochnit na "Where are you going? Tell us about your trip…").
- `onSubmit`: ubrat sozdanie AI-threada i `pendingAiPrompt`. Vmesto etogo `navigate({ to: "/search", search: { q: describe.trim() } })`. Pustoy zapros — prosto perehod na /search bez `q`.

### 2. `src/routes/search.tsx` (novyy fayl)
- `createFileRoute("/search")` s `validateSearch` (zod + `fallback`):
  - `q?: string` — AI-fraza polzovatelya
  - `city?: string`, `category?: string`, `lang?: string`, `from?: string` (ISO), `to?: string` (ISO), `guests?: number`, `instant?: boolean`
- `head()`: title "Search guides — Hamroh", description.
- Layout: `SiteHeader` / `SiteFooter` + dve zony:
  - **Top bar**: esli `q` zapolnen — chip `Sparkles "{q}"` i knopka "Ask AI about this trip" (sozdaet thread cherez `createThread`, kladet prompt v sessionStorage, navigate na `/ai/$threadId`; nezalogirennyy → `/login` s `pendingAiPrompt`, kak ranshe rabotal hero).
  - **Filtry**: `CityPicker`, kategorii (chips, kak v `/guides`), yazyk select, daty (dva native `<input type="date">` s `min={todayISO}` i `min={from||todayISO}`), `guests` number, checkbox "Instant book". Vse menyayut `search`-params cherez `navigate({ search: (prev) => ({ ...prev, ... }) })`.
  - **Rezultaty**: pereiispolzuyem `useGuides()` iz `@/lib/content-queries` i `GuideCard`. Filtruem po city/category/lang/instant na kliente (kak `/guides`). Daty i guests poka **ne** filtruyut bazu (net polya availability), prosto perekladyvayutsya v AI-prompt pri klike "Ask AI" — ostavlyaem kommentariy TODO.

### 3. `src/lib/i18n.tsx` (klyuchi)
Dobavit i perevesti (en/ru/uz):
- `search.title` ("Find your guide" / "Найдите своего гида" / "Hamrohingizni toping")
- `search.yourRequest` ("Your request")
- `search.askAi` ("Ask AI about this trip")
- `search.noResults`, `search.filters.dates`, `search.filters.guests`, `search.filters.language`, `search.filters.instant`
- Obnovit `hero.search.describe` placeholder: "Where are you going? Describe your trip…" (+ ru/uz).

### 4. `src/components/SiteHeader.tsx` (esli nuzhno)
Proverit — yest li link na /search v menu. **Ne dobavlyaem** novyy punkt, polzovatel popadayet tuda iz hero ili cherez glubokuyu ssylku.

## Vne ramok
- Ne menyayem `/guides` (ostayetsya kak yest), `/explore`, AI-flow `/ai/$threadId`.
- Ne dobavlyaem realnuyu fil'traciyu po datam — net polya v `guides`/`tours` dlya availability. Daty rabotayut tolko kak kontekst dlya AI.
- Ne dobavlyaem map-view, sortirovku po rating itd. — eto sleduyushchiy iteracionnyy shag.

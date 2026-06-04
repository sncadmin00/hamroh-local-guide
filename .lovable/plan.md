
# Hamroh Guide Assistant — polnyi MVP

Stroim **vse tri sloya odnovremenno**: vizualnyi kalendar (Today/Week), AI chat-assistant, Google Calendar 2-way sync. Mobile-first PWA, ustanavlivaetsya na home screen, rabotaet plavno bez native app.

---

## Chto poluchit gid

1. **Today screen** — vertikalnyi timeline na segodnya (auto-tury + manualnye eventy + free time)
2. **Week screen** — horizontal scroll po dnyam + mesyac heat-map
3. **AI chat** — "Zavtra v 10 vstrecha", "Skolko zarabotal v mae", "Zablokirui pyatnicu" — na russkom/uzbekskom/anglyiskom
4. **Daily brief** — utrom v 7:00 v Telegram: tury, pogoda, svobodnoe vremya
5. **Google Calendar sync** — lichnye eventy iz Google avtomaticheski poyavlyayutsya kak "busy", tury iz Hamroh push'atsya v Google
6. **CRM na evente** — tap na booking → kartochka klienta (istoria turov, $, otzyvy, zametki)
7. **Income tracker** — avtomaticheski schitaet zarabotok po mesyacam
8. **PWA installation** — "Add to Home Screen", ikonka kak u app

---

## Razdely raboty

### 1. Database (1 migration)

```text
calendar_events           # universalnyi event (booking | personal | block | reminder)
  ├─ guide_id, type, title, starts_at, ends_at, all_day
  ├─ booking_id (nullable, link na bookings)
  ├─ google_event_id (nullable, dlya sync)
  ├─ location, notes, color
  └─ created_at, updated_at

guide_google_calendar     # OAuth tokeny per gid
  ├─ guide_id, access_token, refresh_token, expires_at
  ├─ calendar_id, sync_token (incremental sync)
  └─ last_synced_at

guide_client_notes        # zametki po klientam (CRM)
  ├─ guide_id, client_user_id
  ├─ notes, tags, last_tour_at
  └─ created_at, updated_at

guide_ai_threads          # AI chat history
  └─ guide_id, messages (jsonb)
```

Plus extension `bookings` view → automatic insertion в `calendar_events` cherez trigger kogda booking confirmed.

### 2. Server functions (TanStack)

- `guide-calendar.functions.ts` — list/create/update/delete events, get day/week view
- `guide-google-sync.functions.ts` — OAuth flow, pull events from Google, push tours to Google
- `guide-ai-assistant.functions.ts` — chat endpoint cherez Lovable AI Gateway (`google/gemini-3-flash-preview`) s tool calling:
  - `create_event`, `delete_event`, `block_time`
  - `get_schedule(date)`, `get_income(period)`
  - `get_client_info(client_id)`
- `guide-daily-brief.functions.ts` — utrenniy push v Telegram (cron 7:00 po city timezone)
- `guide-crm.functions.ts` — agregaciya history klienta + notes

### 3. UI (mobile-first)

**Routes:**
- `/guide` — uje est, dobavlyaem 4 tab'a: **Today** / **Week** / **AI** / **Me**
- `/guide/event/$eventId` — bottom sheet: detali + edit + CRM klienta
- `/guide/ai` — full-screen chat (AI Elements: Conversation, Message, PromptInput, Tool, Shimmer)
- `/guide/settings/google-calendar` — connect/disconnect Google

**Komponenty:**
- `TodayTimeline.tsx` — vertikalnyi spisok po chasam s color-coded events
- `WeekStrip.tsx` — horizontal swipe po 7 dnyam + month heat-map snizu
- `EventSheet.tsx` — vaul bottom sheet s edit form
- `ClientCRMCard.tsx` — history + notes per klient
- `AIChatWindow.tsx` — AI Elements primitives
- `DailyBriefCard.tsx` — utrenniy summary na Today

**Design:**
- Mobile-first (>=320px), max-width 640px na desktop
- Bottom nav (4 ikonki), vsegda na ekrane
- Swipe gestures cherez `@use-gesture/react`
- Plavnye perehody cherez Framer Motion
- Touch targets >=44px, vse semanticheskie tokeny iz `styles.css`

### 4. PWA setup

- `vite-plugin-pwa` s `generateSW`, `registerType: "autoUpdate"`
- Manifest s ikonkoi Hamroh, theme color, `display: "standalone"`
- Single registration wrapper s preview guards (skip esli iframe, `id-preview--*`, `?sw=off`)
- NetworkFirst dlya HTML, CacheFirst dlya hashed assets
- Apple touch icons + meta tags

### 5. Google Calendar integration

Tak kak **kajdyi gid podklyuchaet svoy lichnyi calendar** (a ne nash workspace) — **per-user OAuth**, ne connector:
- Sozdaem OAuth credentials v Google Cloud Console
- User secrets: `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`
- Flow: `/api/public/google/oauth/start` → Google consent → `/api/public/google/oauth/callback` → save tokens v `guide_google_calendar`
- Sync: incremental cherez `syncToken`, krushok kajdye 15 min cherez `pg_cron`
- Konflikty: Hamroh tury = master (zashishyenye); Google eventy = "busy" sloy (chitayem, ne pishem)

### 6. AI assistant

- Provider: Lovable AI Gateway (`google/gemini-3-flash-preview` — bystryi, deshyovyi, dostatochno umnyi dlya 6 tools)
- System prompt na 3 yazykah (RU/UZ/EN), s instructions po formatu otvetov i tone of voice
- Tools (AI SDK `tool()` s zod schemami):
  - `createEvent({ date, time, title, duration })`
  - `deleteEvent({ eventId })`
  - `blockTime({ from, to, reason })`
  - `getSchedule({ date })`
  - `getIncome({ period: "week" | "month" | "year" })`
  - `getClientInfo({ clientId | name })`
- Voice input: Web Speech API (knopka mikrofona v PromptInput)
- Tools render cherez `Tool`/`ToolHeader`/`ToolContent`, collapsed by default
- History per gid v `guide_ai_threads` (one conversation, dlya prostoty — gid ne nuzhdaetsya v threads)

### 7. Daily brief

- pg_cron job v 7:00 (local guide timezone) → server route `/api/public/hooks/daily-brief`
- Dlya kajdogo gida s eventami segodnya:
  - Sobiraem: tury, vstrechi, pogoda (Open-Meteo API, besplatno), free time
  - Format: kratkii Telegram message + push (esli installed PWA)

---

## Etapy realizacii (poryadok kommitov)

1. **Migration + types** — vse tablicy + RLS + grants + triggery
2. **PWA infrastructure** — manifest, service worker s guards, install prompt
3. **Today + Week UI** — bez AI poka, no s manualnymi eventami i auto-bookings
4. **EventSheet + CRM** — tap → bottom sheet + client history
5. **Google Calendar OAuth + sync** — connect flow + 2-way sync + cron
6. **AI chat** — server fn + AI Elements UI + 6 tools + voice
7. **Daily brief** — cron + Telegram + push
8. **Income tracker** — page v "Me" tab + AI tool

---

## Chestnye trade-offs

- **iOS push** rabotaet tolko esli polzovatel sdelal "Add to Home Screen" (iOS 16.4+). Dlya nadejnosti dubliruem v Telegram bot.
- **Background voice** ("Hey Hamroh") — nevozmojno bez native app. Mikrofon tolko kogda chat otkryt.
- **Gemini Flash i russkii/uzbekskii** — srednyaya kachestvo. System prompt + few-shot examples na 3 yazykah, no inogda budet smeshno otvechat. Esli ploho → swap na `google/gemini-3-pro-preview` (dorozhe v 5x, no luchshe yazyk).
- **Google OAuth setup** — trebuet od menya tvoego soglasiya na Google Cloud Console: ya popro'su API keys cherez `add_secret` posle sozdaniya credentials. Esli ne hochesh seichas — propuskaem etap 5, dobavlyaem pozje.
- **Phase 3 (Logistics AI s real-time GPS, busyness analytics, demand prediction)** — ne v etot MVP. Eto sleduyushaya volna posle togo, kak budet 50+ aktivnyh gidov dlya dannyh.

---

## Tehnicheskie detali

**Stack additions:**
- `vite-plugin-pwa` (PWA)
- `@use-gesture/react` (swipe)
- `framer-motion` (uje est? proverim)
- AI Elements: `bun x ai-elements@latest add conversation message prompt-input shimmer tool`
- Google OAuth: napishem rukami cherez `fetch` (legkii flow, ne stoit dependency)

**Secrets (popro'shu cherez add_secret kogda dojdyom do etapa):**
- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`

**Razmer raboty:** ~10-12 fayilov novih + edits k 4-5 sushestvuyushim. Vse pomestitsya v odin bolshoy commit (po etapam, sekvenchialno).

---

## Vopros pered startom

1. **Google Calendar seichas ili pozje?** Esli seichas — nujno chto by ty sozdal OAuth credentials v Google Cloud Console (~5 min, ya raspishu po shagam). Esli pozje — propuskaem etap 5, vse ostalnoe rabotaet.

2. **AI yazyk po umolchaniyu — russkii?** Ili avtoopredelyat po profilyu gida?

3. **Gotov chto by ya nachal s migration + PWA + Today/Week (etapy 1-3)?** Eto ~30-40 min raboty, daet rabochii kalendar bez AI. Potom srazu prodolju s AI i Google.

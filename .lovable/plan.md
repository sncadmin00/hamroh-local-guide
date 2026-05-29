## AI Search for Hamroh

Add an "Ask AI" button to the home hero and header that opens a dedicated AI search page. Users can type natural-language queries like *"a Korean-speaking guide in Samarkand for food tours"*, and the AI returns matching guides with reasoning. Each query starts a thread that's saved to the database, with a sidebar to revisit past searches.

### User flow

1. New **"Ask AI"** button next to the search bar on home + in the header
2. Clicking it goes to `/ai` → creates a new thread, navigates to `/ai/$threadId`
3. Page shows: thread sidebar (left), chat transcript (center), prompt input (bottom)
4. AI streams a response that recommends specific guides from our catalog, with clickable guide cards rendered inline
5. Past threads listed in the sidebar, click to revisit

### Backend (Lovable Cloud)

Enable Lovable Cloud. Tables:
- `ai_threads` — id, user_id, title (auto-generated from first message), created_at, updated_at
- `ai_messages` — id (uuid), thread_id, role, parts (jsonb for UIMessage parts), created_at

RLS scoped to `auth.uid()`. Anonymous users get a lightweight email/Google login gate before using AI (required for per-user history).

### AI implementation

- AI SDK + Lovable AI Gateway, model `google/gemini-3-flash-preview`
- Server route `src/routes/api/chat.ts` with `streamText` + `toUIMessageStreamResponse`
- System prompt includes the full guide catalog (small dataset) so the model can recommend specific guides by ID
- One tool: `recommendGuides({ guideIds: string[] })` — the UI renders these as `GuideCard`s inline in the assistant message
- `onFinish` persists the assistant `UIMessage` to `ai_messages`

### Frontend

- AI Elements: install `conversation`, `message`, `prompt-input`, `shimmer`, `tool`
- New routes:
  - `src/routes/ai.tsx` — layout with thread sidebar + `<Outlet />`, creates thread and redirects on `/ai`
  - `src/routes/ai.$threadId.tsx` — chat window keyed by threadId
- Server functions in `src/lib/ai-threads.functions.ts`: `listThreads`, `createThread`, `getThreadMessages`, `deleteThread`
- Add "Ask AI" button to `SiteHeader` and the home hero search bar (sparkles icon, gradient accent)
- Auth: add minimal `/login` (email + Google) since threads require a user; gate `/ai/*` behind `_authenticated`-style check

### Technical notes

- `attachSupabaseAuth` middleware registered in `src/start.ts` so chat route receives the bearer token
- Database generates UUIDs for messages; AI SDK `msg_...` IDs not stored
- Render `message.parts` (text + tool parts), not flat content
- Assistant messages have no background; user bubbles use `primary` / `primary-foreground`
- Replace agent identity icon (no Sparkles as primary mark) — generate a small Hamroh AI mascot image for empty state

### Files to create/edit

- New: `src/routes/ai.tsx`, `src/routes/ai.$threadId.tsx`, `src/routes/api/chat.ts`, `src/routes/login.tsx`, `src/lib/ai-threads.functions.ts`, `src/lib/ai-gateway.server.ts`, AI Elements under `src/components/ai-elements/`, assets/ai-mascot
- Edit: `src/components/SiteHeader.tsx` (Ask AI button), `src/routes/index.tsx` (hero Ask AI CTA), `src/start.ts` (attach auth middleware), migration for `ai_threads` + `ai_messages`

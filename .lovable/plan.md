# Plan: AI-first home page

## Goal
Make the main page primarily an AI assistant entry point. Remove the Uzbekistan-specific hero photo. Move everything else (guides, cities, how it works, featured guides) behind a menu.

## 1. New main page (`src/routes/index.tsx`)

- Replace current hero + sections with a single focused screen:
  - **Background**: minimal solid (use `--background` / subtle gradient from existing tokens). No `hero-bukhara.jpg`.
  - **Header**: simplified `SiteHeader` (see §2).
  - **Center stack**:
    - Logo / wordmark "Hamroh"
    - H1: "Find your local guide" (short, no country reference)
    - Brief subtitle (one line)
    - **Full chat interface** — working chat box wired to the existing AI thread infrastructure (`createThread` + redirect to `/ai/$threadId` on first send, reusing logic from `src/routes/ai.tsx`). User starts typing on `/` and is taken into the conversation seamlessly.
    - Small text link below input: "Prefer to browse? Find a guide manually →" linking to `/guides`.
- Remove from index: cities grid, features grid, featured guides grid, big CTA section, secondary search bar, all city/hero imagery imports.

## 2. Navigation (`src/components/SiteHeader.tsx`)

- Collapse top-nav links into a single **menu** (Sheet/dropdown using shadcn `Sheet` for mobile-first since current viewport is 390px).
- Menu contents:
  - Find a guide → `/guides`
  - Cities → new `/cities` route
  - How it works → new `/how-it-works` route
  - Featured guides → can live on `/guides` (no separate route needed)
- Keep wordmark on left. Remove "Ask AI" + "Explore" buttons from header (AI is now the home page itself).

## 3. New routes for moved content

Extract sections currently on index into their own pages with proper `head()` metadata:

- `src/routes/cities.tsx` — the cities grid (Tashkent/Samarkand/Bukhara cards).
- `src/routes/how-it-works.tsx` — the features grid (verified guides, languages, instant booking, local experiences) + CTA block.
- `/guides` already exists; featured guides display stays there.

## 4. Chat wiring on home

Reuse existing serverFns (`createThread`, chat at `/api/chat`). On submit from the home input:
1. If user is not authenticated → navigate to `/login` with redirect back.
2. If authenticated → call `createThread`, then `navigate({ to: '/ai/$threadId', params: { threadId } })` and pass the first message via search param or sessionStorage so `/ai/$threadId` sends it immediately.

(Keeps `/ai` as the full conversation surface; home is the entry prompt.)

## 5. Cleanup

- Remove unused imports in `index.tsx` (hero/city images, `GuideCard`, `guides` data, unused icons).
- Keep `hero-bukhara.jpg` and city images for now (used on `/cities` page).

## Technical notes

- Routes follow flat naming: `src/routes/cities.tsx`, `src/routes/how-it-works.tsx`.
- Menu uses shadcn `Sheet` (already installed) for a slide-in panel; works well at 390px viewport.
- No new dependencies, no schema changes.
- Auth check on home reuses `supabase.auth.getUser()` pattern from `src/routes/ai.tsx`.

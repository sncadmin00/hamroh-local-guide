
# Spotlight news carousel with photos

Replace the small spotlight pill with a wider, more visual banner that rotates through multiple announcements (new guides, new routes, news). Users can swipe / click arrows to browse older ones.

## Layout

```
┌─────────────────────────────────────────────────────────────┐
│  [photo]   NEW GUIDE                              ●●○○○     │
│  [ 80px ]  Aziz from Nukus — tours to the Aral Sea          │
│  [round ]  "First guide covering the dried seabed"     →    │
└─────────────────────────────────────────────────────────────┘
        ← prev                                       next →
```

- Full width of the hero container, ~96–110px tall on desktop, stacked / 88px on mobile (≤640px).
- Left: round/rounded-square photo of the guide or destination (64–80px).
- Middle: tiny uppercase label ("NEW GUIDE" / "NEW ROUTE" / "NEWS") + bold one-line title + muted one-line description.
- Right: arrow icon. Whole banner is clickable → guide profile or article.
- Bottom: row of dot indicators showing how many items + which is active.
- Auto-rotates every ~6s, pauses on hover/focus. Arrow buttons on hover (desktop) and swipe gesture (mobile, touch drag).
- Subtle gradient background (`from-[#8BB5A9]/10 to-[#D5A08D]/10`), soft border, rounded-2xl, gentle shadow.
- Crossfade transition between slides (200–300ms opacity + slight translate).

## Data

Hardcode 3–4 spotlight items in `src/lib/spotlights.ts` for now (id, label key, title, description, image, href). All text via i18n keys so EN/UZ/RU work. Photos: use existing guide photos from `src/assets/` if available, otherwise placeholder gradients.

Later we can swap this list for a Supabase query (`spotlights` table with `is_active`, `published_at`).

## Files

- **New** `src/components/home/SpotlightBanner.tsx` — carousel component (no external deps; plain React state + setInterval + touch handlers).
- **New** `src/lib/spotlights.ts` — static data array.
- **`src/routes/index.tsx`** — replace the current spotlight `<Link>` (lines 158–168) with `<SpotlightBanner />`. Keep the stats line under the headline as is.
- **`src/lib/i18n.tsx`** — add keys for 3–4 spotlight items (label + title + description) in EN/UZ/RU. Drop now-unused `hero.spotlight.label` / `hero.spotlight.text` keys.

## Out of scope
- No backend table yet (static array). Easy to wire later.
- Stats line, mini-steps, AI input, and other sections stay untouched.

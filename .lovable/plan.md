## Goal

Make the top banner feel like a feed of fresh updates ("новинки с огоньком"), and remove the Hamroh H logo block that sits above it and competes for attention.

## Changes

### 1. `src/routes/index.tsx`
- Remove the brand H logo block (lines 152–157) — the circular gradient tile with the H image. The SpotlightBanner becomes the first visual element in the hero.

### 2. `src/components/home/SpotlightBanner.tsx`
Give the banner a clear "fresh / hot" feel without making it loud:

- **Header strip above slides**: small inline label "🔥 What's new" (i18n: use existing-style key like `spot.whatsNew`) on the left + slide counter (`1 / N`) on the right. Soft uppercase tracking, muted color.
- **Kind label gets a fire dot**: prepend a small pulsing orange dot (`bg-orange-500 animate-pulse`) before the existing kind label (NEW GUIDE / NEW ROUTE / NEWS / NEW TOUR). Keeps the teal text, just adds a "live" cue.
- **Warmer accent**: shift the card's background gradient from teal→peach to a slightly warmer peach/amber tint so it visually reads as "new", and add a thin top accent line (1px gradient) to separate it from the page.
- **Subtle "NEW" ribbon** on the image (top-left corner of the thumbnail): tiny rounded pill `NEW` in white-on-orange, only ~10px font, so it's noticeable but not loud.
- Keep autoplay, swipe, dots, arrows, and overall layout unchanged.

No new dependencies. No copy or data-model changes beyond one i18n key for "What's new".

## Out of scope
- No changes to how spotlights are fetched or rendered (still `useSpotlights`).
- No layout shift of the AI search field or "How it works" steps.

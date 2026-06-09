## Update GuideCard

Restore guide info while keeping the new circular photo style.

**`src/components/GuideCard.tsx`** — Rework layout:
- Card stays a square block (no borders, no background, no shadow) — just padding and centered content.
- Photo: circular (`rounded-full`), centered at top, ~60-70% of card width (e.g. `w-32 h-32` or `aspect-square max-w-[160px]`).
- Below the photo, restore guide data:
  - Name + verified `BadgeCheck`
  - City (with subtle location styling)
  - Rating (Star + value + review count)
  - Languages (short list, e.g. "EN · RU · UZ")
  - Price per day (e.g. "from $X/day")
- All text centered, no card chrome (no border / bg / shadow).
- Keep `Link` wrapper to `/guides/$guideId`.

No other files changed. No data/business-logic changes.
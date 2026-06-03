
# Combine spotlight banner (option 1) + stats line (option 3)

Add two compact elements above the "Find your local guide" headline on the homepage.

## Layout

```
[ 🔥 New guide in Nukus — tours to the Aral Sea  → ]   ← spotlight banner (thin pill)

           Find your local guide                        ← existing headline
   1,240 guides · 47 cities · 12,000 travelers          ← stats line (small, muted)

           [ AI search input ]                          ← existing
           [ suggestion chips ]
           [ 1 Tell · 2 Match · 3 Book ]                ← existing mini steps
```

## Changes

**`src/routes/index.tsx`**
- Above the headline `<h1>`, add a centered pill banner: subtle bg (`bg-[#8BB5A9]/10`), small emoji + text + arrow, `rounded-full px-4 py-1.5 text-sm`, clickable → links to the featured guide's profile (or `/guides` for now).
- Directly under the headline / tagline, add a one-line stats row: `text-sm text-slate-500`, three items separated by `·` dots, wraps on mobile.
- Mobile (≤480px): banner stays single line with truncation; stats wrap to two lines if needed.

**`src/lib/i18n.tsx`**
- Add 4 new keys, translated for all supported languages:
  - `hero.spotlight.label` — "New guide" / "Новый гид" / etc.
  - `hero.spotlight.text` — "Tours to the Aral Sea from Nukus" (placeholder; can be data-driven later)
  - `hero.stats.guides`, `hero.stats.cities`, `hero.stats.travelers` — number labels
- Stats numbers themselves stay hardcoded for now (1,240 / 47 / 12,000) — easy to swap to real backend counts later.

## Out of scope
- No backend query yet — spotlight content and stats numbers are static placeholders in i18n. We can wire to Supabase counts / a `featured_guide` flag in a follow-up.
- No changes to AI input, suggestions, mini steps, or other sections.

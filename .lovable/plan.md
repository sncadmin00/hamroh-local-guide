# Pricing model: group categories + language %

## Model

Each tour has:
- **Base language** (e.g. Russian) = 100%
- **Language multipliers**: e.g. `{ "English": 25, "French": 50 }` (means +25%, +50%)
- **Pricing mode**: `fixed` (one price for any group) OR `by_group` (per category)
- **Group prices** (only if `by_group`): fixed price per category
  - `private` — up to 2
  - `small` — up to 6
  - `group` — up to 12
  - `large` — up to 25
  - Guide picks which categories to offer (1 or more)
- **Children rule**: `children_free_under` (default 16). Children below this don't count toward group size.

Final price formula:
```
final = base_price_for_selected_category × (1 + language_multiplier / 100)
```

If adults > max in all offered categories → show "Contact guide" button (opens chat / Telegram).

## Database changes

`tours` table — new columns:
- `pricing_mode text default 'fixed'` — `'fixed' | 'by_group'`
- `base_language text` — the 100% reference language (e.g. `'Russian'`)
- `language_multipliers jsonb default '{}'` — `{ "English": 25 }` meaning +25%
- `group_prices jsonb default '{}'` — `{ "private": 80, "small": 120, "group": 200 }` (USD, in base language)
- `children_free_under integer default 16`

Keep `price_from` (used as min/display price). Drop reliance on `price_by_language` — migrate existing values into the new shape, leave the old column for now (we can remove later).

`bookings` table — new columns:
- `adults integer default 1`
- `children integer default 0`
- `group_category text` — `'private' | 'small' | 'group' | 'large' | null` (null = fixed)

`guests` becomes a computed display value (adults + children) but kept for back-compat.

## Server changes

**`upsertTour`** (`src/lib/guide-portal.functions.ts`):
- Accept `pricing_mode`, `base_language`, `language_multipliers`, `group_prices`, `children_free_under`.
- Validation: if `by_group`, at least one group price > 0; multipliers in [-50, 500].
- Compute `price_from` = minimum of group_prices (or single fixed price) in base language.

**`createBooking`** (`src/lib/booking.functions.ts`):
- Accept `adults`, `children`, `group_category`, `language`.
- Recompute price server-side:
  - Get `base_price` from `group_prices[category]` (or fixed price).
  - Get multiplier from `language_multipliers[language]` (0 if base language).
  - `total = round(base_price × (1 + mult/100))`.
  - Validate: `adults <= max_for_category`. If not → reject with "Contact guide".
- Save `adults`, `children`, `group_category`.

## UI changes

**Guide tour editor** (`src/components/admin/ToursPanel.tsx` + `src/lib/guide-portal.functions.ts` form on `/guide`):
- Radio: "Fixed price" / "Price by group size"
- If fixed: one price field (in base language)
- If by group: 4 checkboxes for categories, each enabled checkbox shows a price field
- Base language dropdown
- Language multipliers: row per additional language with `+ %` field
- Children-free-under number input (default 16)

**Tour detail page** (`src/routes/tours_.$slug.tsx`):
- Show pricing block:
  - If fixed: "From $X" + language switcher recalculates
  - If by group: table of categories with prices, language switcher applies %
- Booking form: adults / children / category / language pickers; show computed total.
- If adults exceed all offered categories → "Contact guide" CTA.

**Tour cards** (`src/components/home/TopTours.tsx`): use `price_from` as today.

**My bookings** (`src/routes/my-bookings.tsx`, `src/routes/guide.tsx`): show `adults + children` and category badge.

## Migration of existing data

For existing tours: set `pricing_mode = 'fixed'`, `base_language` from `languages[0]` or `'Russian'`, copy `price_from` into a fallback. Existing `price_by_language` values stay readable; new bookings ignore them.

## Files touched

- New migration: tours columns + bookings columns
- `src/lib/guide-portal.functions.ts` — upsertTour schema/logic
- `src/lib/booking.functions.ts` — createBooking price computation
- `src/lib/content-queries.ts` — include new fields in TOUR_SELECT
- `src/routes/guide.tsx` (or wherever the guide tour form lives) — UI
- `src/routes/tours_.$slug.tsx` — pricing display + booking form
- `src/routes/book.$slug.tsx` — booking form
- `src/routes/my-bookings.tsx`, `src/routes/guide.tsx` — display adults/children/category

## Out of scope

- Removing the old `price_by_language` column (defer until UI fully migrated).
- Per-person pricing (we chose fixed-per-group).

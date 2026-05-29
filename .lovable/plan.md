## Goal
Replace the flat city pill row on `/guides` with a scalable dropdown (combobox) that supports many future cities and surfaces 3–4 location-based suggestions at the top.

## UX
- Trigger button labeled with current selection (e.g. "All cities" / "Tashkent"), opens a Popover with a Command (searchable combobox) — already available in `src/components/ui/command.tsx` + `popover.tsx`.
- Inside the popover:
  - **Suggested near you** group — 3–4 cities. Detect via `navigator.geolocation` once on mount; reverse-geocode with a lightweight free endpoint (Open-Meteo / BigDataCloud client-side reverse geocode, no key) and rank cities by haversine distance to known city coordinates. Fallback when permission denied or offline: show first 3 cities as "Popular".
  - **All cities** group — full searchable list (currently 3, ready to grow).
  - "All cities" reset option at top.
- Selecting a city updates the existing `city` search param (keeps URL state + Zod schema).

## Data
- Add `src/data/cities.ts` exporting `{ name: City; lat: number; lng: number }[]` for Tashkent, Samarkand, Bukhara. Future cities are added here only; the dropdown and `City` enum read from this single source.
- Update `src/routes/guides.tsx` Zod enum to derive from the cities list (still validates).

## Files
- `src/data/cities.ts` (new) — city list with coordinates.
- `src/components/CityPicker.tsx` (new) — controlled combobox component (value, onChange, includes geo-suggestions logic).
- `src/routes/guides.tsx` — replace pill row with `<CityPicker />`; keep search-param sync.

## Out of scope
- Adding new cities (just the mechanism).
- Server-side geolocation; all detection is client-side and optional.

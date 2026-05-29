## Geo-Neutral Rebrand — Remove Uzbekistan References

Remove all country-specific branding so the app reads as a generic local-guide platform ready for any city in the world.

### Files to change

1. **src/routes/__root.tsx**
   - Title: `Trusted local guides in Uzbekistan` → `Trusted local guides, anywhere`
   - Description / og:description: remove `Tashkent, Samarkand, and Bukhara` references; keep the rest.
   - og:title: same as title.

2. **src/routes/guides.tsx**
   - Meta description: `across Uzbekistan` → remove phrase.
   - Subtitle: `ready to show you Uzbekistan` → `ready to show you around`.

3. **src/routes/explore.tsx**
   - Meta + og descriptions: `from across Uzbekistan` → `from around the world`.
   - Page subtitle: `from across Uzbekistan` → `from around the world`.
   - `cityLabel` fallback: `Uzbekistan` → `All cities`.

4. **src/routes/api/chat.ts**
   - System prompt: remove `in Uzbekistan` from the AI persona description.
   - Rules: `unrelated to Uzbekistan travel` → `unrelated to travel`.

5. **src/routes/ai.$threadId.tsx**
   - Update suggestion chips to remove city names:
     - `in Tashkent` → generic phrasing or remove.
     - `in Samarkand` → remove.
     - `in Bukhara` → remove.

6. **src/styles.css**
   - Update comment `Uzbek turquoise — Samarkand tile blue` to a neutral description.

### Out of scope
- No database migrations needed.
- No UI layout changes.
- City data in the database remains as-is; only user-facing copy changes.
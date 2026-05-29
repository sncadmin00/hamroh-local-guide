# Merge Cities → Explore

Turn `/explore` into the single discovery hub. A city dropdown at the top filters articles, guide recommendations, and social embeds for the selected city. Default selection auto-picks the nearest city via geolocation.

## Database changes

Add many-to-many tagging so articles and social embeds can be tied to multiple cities.

- New table `article_cities` (`article_id`, `city_id`, PK on both, FKs cascade).
- New table `social_embed_cities` (`embed_id`, `city_id`, PK on both, FKs cascade).
- RLS: public `SELECT`; admins manage. GRANTs for `anon`, `authenticated`, `service_role`.
- No changes to existing `articles` / `social_embeds` / `guides` columns (guides already have `city_id`).

Articles/embeds with **no** city tags are treated as global and shown for every city.

## Frontend changes

### `/explore` (rewrite)
- Sticky city `<CityPicker>` at the top (reuse existing component).
- Default value: nearest city via geolocation (already implemented in CityPicker); fallback to first city if denied.
- City stored in URL search param `?city=<name>` via TanStack search params (zod-validated, shareable, survives refresh).
- Sections, each filtered by selected city:
  1. **Latest articles** — joined with `article_cities`; include rows with no city tags as global.
  2. **Guides in {city}** — query `guides` where `cities.name = <selected>`; link to existing `/guides/$guideId` and a "See all guides in {city}" link to `/guides?city=…`.
  3. **From our socials** — joined with `social_embed_cities`; include untagged as global.
- Empty states per section ("No articles for {city} yet").

### Header / nav
- Remove the **Cities** link from `SiteHeader` (EN/UZ/RU strings stay but unused entry removed from nav array).
- Keep the **Explore** link.

### `/cities` route
- Delete `src/routes/cities.tsx`. The route tree regenerates automatically.
- Any in-app `<Link to="/cities">` is replaced with `<Link to="/explore">`.

### Admin (`/admin`)
- **Articles** tab: add a multi-select of cities (checkboxes) when creating/editing an article — writes to `article_cities`.
- **Social** tab: same multi-select for embeds — writes to `social_embed_cities`.
- "No cities selected" = global (shown everywhere).

## Out of scope
- No changes to guide data model (already city-scoped).
- No new article fields beyond city tags.
- Translations stay as-is; the removed "Cities" nav entry is simply not rendered.

## Files touched
- New: `supabase/migrations/<timestamp>_article_social_cities.sql`
- New helpers in `src/lib/content-queries.ts` (article+city, embed+city joins)
- Rewrite: `src/routes/explore.tsx`
- Edit: `src/components/SiteHeader.tsx`, `src/routes/admin.tsx`
- Delete: `src/routes/cities.tsx`

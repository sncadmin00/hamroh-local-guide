Add a readable headline and subtitle inside the hero section, positioned above the search pill on the homepage (`/`).

### Current state
- `HeroSearch.tsx` renders the hero background image and the search form, but no visible headline text.
- i18n keys `hero.search.title` and `hero.search.subtitle` already exist with translations in EN / RU / UZ.

### Proposed changes

1. **Render the existing i18n headline in `HeroSearch.tsx`**
   - Insert `hero.search.title` (multiline, uses `\n`) and `hero.search.subtitle` above the search form, inside the existing `relative z-10` container.
   - Style:
     - Title: white text, `font-display`, large bold size, text-shadow for readability over the photo.
     - Subtitle: white text, slightly smaller, lighter weight, with subtle text-shadow.
   - Ensure the title/subtitle container has enough top padding so it sits clearly below the sticky `SiteHeader` and above the search pill.

2. **Preserve the overlap behavior**
   - The search form already uses `translate-y-12 md:translate-y-16` to overlap the hero/content boundary.
   - Keep that intact; simply place the text between the top of the container and the search form.

3. **Mobile & accessibility**
   - Reduce font size on mobile (`text-3xl` → `md:text-5xl` pattern).
   - Ensure `text-shadow` or `drop-shadow` contrast passes over both light and dark areas of the hero image.

### Files to change
- `src/components/home/HeroSearch.tsx` — add title/subtitle markup and styling.
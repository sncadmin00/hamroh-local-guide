## Plan: Integrate categories across admin, homepage, and city pages

Build on the existing `categories` and `guide_categories` tables (already created with 6 starter categories).

### 1. Admin panel — manage categories and assign to guides

In `src/routes/admin.tsx` (or a new admin section):
- Add a "Categories" tab with CRUD: list, create, edit (name, slug, icon, description, sort_order), delete
- In the existing guide editor, add a multi-select to attach/detach categories via `guide_categories`
- Use `lucide-react` icon names as strings (stored in `categories.icon`), render dynamically

### 2. Homepage — category cards

In `src/routes/index.tsx`:
- Add a "Browse by interest" section showing all categories as cards (icon + name + short description)
- Each card links to `/guides?category=<slug>`
- Fetch via a new `useCategories()` hook in `src/lib/content-queries.ts`

### 3. Guides page — category filter

In `src/routes/guides.tsx`:
- Add `category` to `validateSearch`
- Add category chips/dropdown next to existing City/Language/Instant filters
- Extend the `useGuides()` query to also load each guide's `guide_categories(category_id)`
- Filter client-side by selected category slug
- Reuse on `/explore` if desired (optional, can skip for now)

### Technical notes

- New hook `useCategories()` → `select * from categories order by sort_order`
- Extend `GUIDE_SELECT` to include `guide_categories(category_id, categories(slug, name))`
- Add `categories: { slug: string; name: string }[]` to the `Guide` type in `src/data/guides.ts`
- Icons: use a small `<Icon name={...} />` wrapper that maps string → lucide component (with fallback)
- No new migrations needed — schema and seeds are already in place

### Out of scope (for later)

- Dedicated `/categories/<slug>` SEO landing pages
- Showing categories on the explore page
- Advertising/UTM tracking

Want me to proceed with all three, or start with one?

## Explore page + social links

### New routes
- `/explore` — main page with three sections:
  1. **Featured articles** — list/grid of blog posts from new DB table
  2. **Featured guides & cities** — pulls top guides + cities (existing tables)
  3. **Social feed** — grid of admin-curated embeds (Instagram/TikTok/YouTube)
- `/explore/$slug` — individual article page (SEO-friendly, own meta)

### Navigation
- Add "Explore" link to main header/nav
- Add footer (new component) with placeholder social icon links (Instagram, TikTok, YouTube, X) — easy to swap URLs later

### Admin
Extend existing admin area with two new sections:
- **Articles** — create/edit/delete: title, slug, cover image, excerpt, body (markdown), published flag
- **Social embeds** — paste post URL, choose platform, sort order, visible flag

### Database (new tables)
- `articles` — title, slug, excerpt, cover_url, body_md, published, published_at, sort_order
- `social_embeds` — platform (instagram|tiktok|youtube|x), url, caption, sort_order, visible
- Public SELECT for published/visible rows; admin full access via `has_role`
- Reuse existing `guide-photos` storage bucket (or add `article-covers`) for cover uploads

### Data fetching
- Public read via `createServerFn` + `supabaseAdmin` scoped to `published=true` / `visible=true` (loaders run during SSR with no auth token)
- Admin CRUD via `createServerFn` + `requireSupabaseAuth` with `has_role` check

### Social embeds rendering
- Instagram/TikTok: official `<blockquote>` embed + their embed.js script
- YouTube: native iframe
- X/Twitter: `<blockquote>` + widgets.js

### SEO
- `/explore` head: title, description, og tags
- `/explore/$slug` head: per-article title, description, og:image = cover_url

### Out of scope (later)
- Auto-fetching social posts via APIs
- Real social URLs (placeholders shipped now)

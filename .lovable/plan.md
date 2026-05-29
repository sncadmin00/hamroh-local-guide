## Goal

Replace the hardcoded `src/data/cities.ts` and `src/data/guides.ts` with database-backed content, and add an admin panel where you can add/edit/delete cities and guides (with photo upload) through a friendly UI.

## What gets built

### 1. Database (Lovable Cloud)

Three tables:

- **`cities`** — name, lat, lng, slug, sort_order
- **`guides`** — name, city_id (FK), tagline, bio, languages[], specialties[], price_per_day, rating, reviews, verified, instant_book, photo_url, slug
- **`guide_experiences`** — guide_id, title, description, duration, price (one guide → many experiences)
- **`user_roles`** — separate roles table with `admin` enum (per security best practice)

Public read access (so the site works for everyone), admin-only write access via a `has_role()` security-definer function.

A **storage bucket** `guide-photos` (public read, admin write) for uploaded guide photos.

### 2. Authentication

- Email + password login + Google sign-in (the standard Lovable Cloud defaults).
- First user you sign up gets manually promoted to `admin` (one-time SQL insert I'll walk you through, or auto-promote the very first signup).
- `/login` page.

### 3. Admin panel (`/admin`, protected)

- **`/admin/cities`** — table of cities, add/edit/delete dialog with name + map coordinate picker (or just lat/lng inputs).
- **`/admin/guides`** — table of guides with search/filter, "Add guide" form with all fields, photo drag-and-drop upload to storage, multi-select for languages/specialties, repeater for experiences, edit and delete.
- Sidebar layout, uses existing shadcn components for consistent look.

### 4. Site reads from database

- Replace `src/data/cities.ts` and `src/data/guides.ts` consumers with TanStack Query hooks that fetch from Supabase.
- Keep the same shape so the existing Find a Guide / city pages keep working with no visual changes.
- One-time seed migration copies your current 4 cities and existing guides into the database so nothing disappears.

### 5. Header

Small "Admin" link visible only when signed in as an admin.

## Out of scope (can do later)

- Translating guide content into UZ/RU (admin would enter one language; could add later as separate `guide_translations` table).
- Bulk CSV import.
- Image cropping/resizing in-browser (photos uploaded as-is).

## Technical notes

- Stack: TanStack Start server functions (`createServerFn` with `requireSupabaseAuth`) for all writes; public reads can go directly via the browser Supabase client since RLS allows anon SELECT.
- Roles stored in `user_roles` table with `app_role` enum and `has_role(uuid, app_role)` security-definer function — never on profiles, to prevent privilege escalation.
- Photo uploads go to `guide-photos` storage bucket; the public URL is stored on the guide row.
- Existing `src/data/*.ts` files get deleted after seed migration runs.

Confirm and I'll start with the migration + auth, then build the admin UI, then swap the site over to live data.
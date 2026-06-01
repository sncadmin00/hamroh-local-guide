# Guide Application Flow

## What to build

1. **New table `guide_applications`** (via migration) with RLS:
   - `id`, `created_at`, `status` (pending/approved/rejected)
   - `full_name`, `email`, `phone`, `city`, `languages` (text[]), `specialization`, `experience_years`, `about` (bio), `user_id` (nullable)
   - RLS: anyone (anon + authenticated) can INSERT; only admins can SELECT/UPDATE
   - GRANTs for anon (insert), authenticated (insert), service_role (all)

2. **Form on `/become-a-guide`**:
   - Replace the decorative "Apply now" button with a real form (react-hook-form + zod)
   - Fields: name, email, phone, city (select from `cities`), languages (multi-input), specialization, years of experience, short bio
   - Submit → insert into `guide_applications`
   - Success toast + thank-you state ("We'll review within 2 business days")
   - i18n strings for EN/RU/UZ

3. **Admin view at `/admin`**:
   - Add an "Applications" tab/section listing pending applications
   - Show all fields + Approve / Reject buttons (updates `status`)
   - Admin-only (existing `has_role` check)

## Out of scope
- Email notifications (can be added later)
- Auto-creating a `guides` row on approval (admin does that manually for now)

## Add Admin Account Settings Page

Create a `/settings` page (admin-only) where the logged-in admin can update their email and password.

### Route
- New file `src/routes/_authenticated/settings.tsx` (protected by existing auth layout)
- Gate with admin role check; non-admins get redirected to `/`

### UI
Two simple cards using existing shadcn components:
1. **Update email** — input for new email + "Save" button → `supabase.auth.updateUser({ email })`. Show toast that a confirmation link is sent to the new address.
2. **Update password** — new password + confirm password → `supabase.auth.updateUser({ password })`. Min 8 chars, must match.

Both forms use react-hook-form + zod for validation, with loading states and toast feedback (sonner).

### Navigation
Add a "Settings" link in the header (visible only when logged in as admin) pointing to `/settings`, plus a "Sign out" button.

### Files
- create `src/routes/_authenticated/settings.tsx`
- edit header component to show Settings/Sign out for admin

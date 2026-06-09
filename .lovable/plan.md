## Add guide-certificate question + licensed badge

### 1. Database (migration)

**`public.guide_applications`** — add:
- `has_certificate boolean NOT NULL DEFAULT false`
- `certificate_url text` (storage path; signed for admin view)

**`public.guides`** — add:
- `licensed boolean NOT NULL DEFAULT false`
- `license_url text` (copied from the application on approval)
- `licensed_at timestamptz`

No data migration on existing rows (everyone starts `licensed=false`). The `identity_verified` column stays and keeps its current meaning (we verified ID), but it no longer drives the "Licensed" stat.

### 2. Storage

Reuse the existing private `guide-application-photos` bucket for certificate uploads (accept image + PDF). No new bucket needed.

### 3. Application form (`src/routes/become-a-guide.tsx`)

In the certifications/credentials step add:
- Yes/No question: "Do you have an official tour-guide certificate or license?"
- If Yes → file upload (image or PDF, ≤10 MB) → uploaded to `guide-application-photos`, path saved as `certificate_url`.
- On submit, persist `has_certificate` + `certificate_url` alongside the existing fields.

Translations: add strings for the question, helper text, "Upload certificate", "Replace", "Remove" in EN/RU/UZ keys used by the existing form.

### 4. Admin review (`src/routes/admin.tsx`)

In the application review card:
- New row: "Guide certificate" → shows applicant's answer, link/preview of the uploaded file (signed URL), plus a "Confirm license" / "Reject" toggle.
- Approval flow (`src/lib/guide-approval.functions.ts`): when the admin approves an application, if `has_certificate` is true AND admin confirmed it, copy `certificate_url` → `guides.license_url`, set `licensed = true`, `licensed_at = now()`. Otherwise leave `licensed = false`.
- Existing guide admin editor: add a "Licensed" toggle so admins can flip the flag manually later (with optional license file replacement).

### 5. Profile page (`src/routes/guides_.$guideId.tsx`)

- Switch the "Licensed guide" stat from `guide.identityVerified` to `guide.licensed`.
- Label stays "Licensed" when true, "—" / "Not licensed" when false (final wording: "Licensed" / "Pending").
- Active-state coloring already handled.

Update `src/data/guides.ts` + `src/lib/content-queries.ts` mapping: add `licensed: boolean`, `licenseUrl: string | null`, read from new columns.

### 6. Out of scope (this turn)

- Public display of the certificate file (kept admin-only).
- Notifying applicants of certificate approval/rejection (can be a follow-up).

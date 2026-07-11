
ALTER TABLE public.emergency_contacts
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'emergency'
    CHECK (category IN ('emergency','useful'));

ALTER TABLE public.emergency_contacts DROP CONSTRAINT IF EXISTS emergency_contacts_kind_check;
ALTER TABLE public.emergency_contacts ADD CONSTRAINT emergency_contacts_kind_check
  CHECK (kind IN ('police','ambulance','fire','tourist_police','consulate','embassy','representation','other'));

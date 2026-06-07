
-- Auto-generate referral_code for guides based on slug/name
CREATE OR REPLACE FUNCTION public.generate_guide_referral_code(_base text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base text;
  v_candidate text;
  v_suffix int := 0;
BEGIN
  -- normalize: lowercase, replace non-alphanumeric with nothing, max 20 chars
  v_base := lower(regexp_replace(coalesce(_base, ''), '[^a-zA-Z0-9]+', '', 'g'));
  IF v_base = '' OR v_base IS NULL THEN
    v_base := 'guide';
  END IF;
  v_base := left(v_base, 20);
  v_candidate := v_base;

  WHILE EXISTS (SELECT 1 FROM public.guides WHERE referral_code = v_candidate) LOOP
    v_suffix := v_suffix + 1;
    v_candidate := v_base || v_suffix::text;
  END LOOP;

  RETURN v_candidate;
END;
$$;

CREATE OR REPLACE FUNCTION public.guides_set_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.referral_code IS NULL OR NEW.referral_code = '' THEN
    NEW.referral_code := public.generate_guide_referral_code(COALESCE(NEW.slug, NEW.name));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guides_set_referral_code ON public.guides;
CREATE TRIGGER trg_guides_set_referral_code
BEFORE INSERT ON public.guides
FOR EACH ROW
EXECUTE FUNCTION public.guides_set_referral_code();

-- Backfill existing guides without a code
UPDATE public.guides
SET referral_code = public.generate_guide_referral_code(COALESCE(slug, name))
WHERE referral_code IS NULL OR referral_code = '';

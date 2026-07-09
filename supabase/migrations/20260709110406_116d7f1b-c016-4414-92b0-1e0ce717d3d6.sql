CREATE OR REPLACE FUNCTION public.prevent_booking_financial_tampering()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    IF NEW.total IS DISTINCT FROM OLD.total
      OR NEW.tour_price IS DISTINCT FROM OLD.tour_price
      OR NEW.service_fee_amount IS DISTINCT FROM OLD.service_fee_amount
      OR NEW.commission_amount IS DISTINCT FROM OLD.commission_amount
      OR NEW.guide_payout_amount IS DISTINCT FROM OLD.guide_payout_amount
      OR NEW.service_fee_status IS DISTINCT FROM OLD.service_fee_status
      OR NEW.service_fee_paid_at IS DISTINCT FROM OLD.service_fee_paid_at
      OR NEW.statement_id IS DISTINCT FROM OLD.statement_id
      OR NEW.offer_version IS DISTINCT FROM OLD.offer_version
      OR NEW.offer_accepted_at IS DISTINCT FROM OLD.offer_accepted_at
    THEN
      RAISE EXCEPTION 'Guides cannot modify booking financial or settlement fields';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_booking_financial_tampering ON public.bookings;
CREATE TRIGGER prevent_booking_financial_tampering
BEFORE UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.prevent_booking_financial_tampering();

CREATE OR REPLACE FUNCTION public.prevent_guide_trust_field_tampering()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    IF NEW.verified IS DISTINCT FROM OLD.verified
      OR NEW.identity_verified IS DISTINCT FROM OLD.identity_verified
      OR NEW.intro_video_verified IS DISTINCT FROM OLD.intro_video_verified
      OR NEW.licensed IS DISTINCT FROM OLD.licensed
      OR NEW.rating IS DISTINCT FROM OLD.rating
      OR NEW.reviews IS DISTINCT FROM OLD.reviews
      OR NEW.completed_tours_count IS DISTINCT FROM OLD.completed_tours_count
      OR NEW.avg_response_minutes IS DISTINCT FROM OLD.avg_response_minutes
    THEN
      RAISE EXCEPTION 'Guides cannot modify verification, trust, rating, or metrics fields';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_guide_trust_field_tampering ON public.guides;
CREATE TRIGGER prevent_guide_trust_field_tampering
BEFORE UPDATE ON public.guides
FOR EACH ROW
EXECUTE FUNCTION public.prevent_guide_trust_field_tampering();
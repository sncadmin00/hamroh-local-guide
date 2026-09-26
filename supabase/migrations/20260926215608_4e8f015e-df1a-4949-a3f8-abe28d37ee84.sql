-- 1. Storage: compare the OBJECT's folder, not guides.name
DO $$
DECLARE b text; op text; nm text;
BEGIN
  FOREACH b IN ARRAY ARRAY['guide-identity','guide-intro-videos'] LOOP
    FOREACH op IN ARRAY ARRAY['reads','uploads','updates','deletes'] LOOP
      nm := 'Guide '||op||' own '||CASE WHEN b='guide-identity' THEN 'identity files' ELSE 'intro videos' END;
      EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', nm);
    END LOOP;
  END LOOP;
END $$;

CREATE POLICY "Guide reads own identity files" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id='guide-identity' AND EXISTS (SELECT 1 FROM public.guides g WHERE g.user_id=auth.uid() AND (storage.foldername(objects.name))[1]=g.id::text));
CREATE POLICY "Guide uploads own identity files" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='guide-identity' AND EXISTS (SELECT 1 FROM public.guides g WHERE g.user_id=auth.uid() AND (storage.foldername(objects.name))[1]=g.id::text));
CREATE POLICY "Guide updates own identity files" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id='guide-identity' AND EXISTS (SELECT 1 FROM public.guides g WHERE g.user_id=auth.uid() AND (storage.foldername(objects.name))[1]=g.id::text))
WITH CHECK (bucket_id='guide-identity' AND EXISTS (SELECT 1 FROM public.guides g WHERE g.user_id=auth.uid() AND (storage.foldername(objects.name))[1]=g.id::text));
CREATE POLICY "Guide deletes own identity files" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id='guide-identity' AND EXISTS (SELECT 1 FROM public.guides g WHERE g.user_id=auth.uid() AND (storage.foldername(objects.name))[1]=g.id::text));

CREATE POLICY "Guide reads own intro videos" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id='guide-intro-videos' AND EXISTS (SELECT 1 FROM public.guides g WHERE g.user_id=auth.uid() AND (storage.foldername(objects.name))[1]=g.id::text));
CREATE POLICY "Guide uploads own intro videos" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='guide-intro-videos' AND EXISTS (SELECT 1 FROM public.guides g WHERE g.user_id=auth.uid() AND (storage.foldername(objects.name))[1]=g.id::text));
CREATE POLICY "Guide updates own intro videos" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id='guide-intro-videos' AND EXISTS (SELECT 1 FROM public.guides g WHERE g.user_id=auth.uid() AND (storage.foldername(objects.name))[1]=g.id::text))
WITH CHECK (bucket_id='guide-intro-videos' AND EXISTS (SELECT 1 FROM public.guides g WHERE g.user_id=auth.uid() AND (storage.foldername(objects.name))[1]=g.id::text));
CREATE POLICY "Guide deletes own intro videos" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id='guide-intro-videos' AND EXISTS (SELECT 1 FROM public.guides g WHERE g.user_id=auth.uid() AND (storage.foldername(objects.name))[1]=g.id::text));

-- 2. Guides cannot raise their own verification / trust fields (only lower them on re-submit)
CREATE OR REPLACE FUNCTION public.prevent_guide_trust_field_tampering()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    IF NEW.verified IS DISTINCT FROM OLD.verified
      OR NEW.published IS DISTINCT FROM OLD.published
      OR NEW.user_id IS DISTINCT FROM OLD.user_id
      OR NEW.verified_languages IS DISTINCT FROM OLD.verified_languages
      OR (NEW.identity_verified IS DISTINCT FROM OLD.identity_verified AND NEW.identity_verified IS TRUE)
      OR (NEW.intro_video_verified IS DISTINCT FROM OLD.intro_video_verified AND NEW.intro_video_verified IS TRUE)
      OR (NEW.licensed IS DISTINCT FROM OLD.licensed AND NEW.licensed IS TRUE)
      OR (NEW.licensed_at IS DISTINCT FROM OLD.licensed_at AND NEW.licensed_at IS NOT NULL)
      OR (NEW.identity_rejected_reason IS DISTINCT FROM OLD.identity_rejected_reason AND NEW.identity_rejected_reason IS NOT NULL)
      OR (NEW.intro_video_rejected_reason IS DISTINCT FROM OLD.intro_video_rejected_reason AND NEW.intro_video_rejected_reason IS NOT NULL)
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
$function$;

-- 3. Sensitive guide columns hidden from anon/authenticated API roles
REVOKE SELECT ON public.guides FROM anon, authenticated;
GRANT SELECT (id, slug, name, city_id, photo_url, tagline, bio, languages, specialties, price_per_day,
  rating, reviews, verified, instant_book, sort_order, created_at, updated_at, user_id, locale, referral_code,
  extra_city_ids, verified_languages, identity_verified, identity_submitted_at, intro_video_url,
  intro_video_verified, intro_video_submitted_at, completed_tours_count, avg_response_minutes,
  has_transport, transport_seats, cover_url, licensed, licensed_at, buffer_minutes, published)
ON public.guides TO anon, authenticated;
GRANT ALL ON public.guides TO service_role;

-- 4. Guides cannot change booking financial / pricing inputs
CREATE OR REPLACE FUNCTION public.prevent_booking_financial_tampering()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
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
      OR NEW.payment_method IS DISTINCT FROM OLD.payment_method
      OR NEW.guide_id IS DISTINCT FROM OLD.guide_id
      OR NEW.user_id IS DISTINCT FROM OLD.user_id
      OR NEW.tour_id IS DISTINCT FROM OLD.tour_id
      OR NEW.guests IS DISTINCT FROM OLD.guests
      OR NEW.adults IS DISTINCT FROM OLD.adults
      OR NEW.children IS DISTINCT FROM OLD.children
      OR NEW.group_category IS DISTINCT FROM OLD.group_category
    THEN
      RAISE EXCEPTION 'Guides cannot modify booking financial or settlement fields';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
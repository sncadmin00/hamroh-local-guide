/**
 * Shared booking-creation logic — the single source of truth for both:
 *   • the TanStack server function (`createBooking` in booking.functions.ts, used by the web app)
 *   • the Supabase Edge Function (`create-booking`, used by the mobile app via functions.invoke)
 *
 * Any change to booking pricing, validation, status, or side-effects (emails,
 * telegram, notifications, google mirror) MUST be made here so both callers
 * stay in lockstep.
 */
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { enqueueTransactionalEmail } from "@/lib/email/enqueue.server";
import { normalizeLocale } from "@/lib/email-templates/_i18n";
import { bookingDetailsText, sendTelegramMessage } from "@/lib/telegram-notifications.server";
import { createNotification } from "@/lib/notifications.server";
import { mirrorBookingToGoogle } from "@/lib/google-calendar.server";

const APP_BASE_URL = "https://hamrohim.com";

export const bookingSchema = z
  .object({
    tour_id: z.string().uuid(),
    slot_id: z.string().uuid().nullable().optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
    duration_minutes: z.number().int().min(30).max(720).optional(),
    adults: z.number().int().min(1).max(50),
    children: z.number().int().min(0).max(50).default(0),
    // Client-chosen pricing mode. Optional — if the tour has exactly one mode
    // enabled, server picks it automatically.
    pricing_mode: z.enum(["fixed", "per_person", "by_group"]).optional(),
    // Legacy field, ignored by the new pricing engine.
    group_category: z.enum(["private", "small", "group", "large"]).nullable().optional(),
    language: z.string().min(1).max(40).optional(),
    customer_name: z.string().min(1).max(200),
    customer_email: z.string().email().optional().or(z.literal("")),
    customer_telegram_user_id: z.number().int().positive().optional(),
    customer_telegram_chat_id: z.number().int().optional(),
    customer_telegram_username: z.string().max(255).optional(),
    notes: z.string().max(2000).optional(),
    source: z.string().max(64).optional(),
    locale: z.enum(["ru", "uz", "en"]).optional(),
    payment_method: z.enum(["cash", "online"]).default("cash"),
    offer_version: z.string().min(1).max(40),
    offer_accepted: z.literal(true),
  })
  .refine((d) => d.customer_email || d.customer_telegram_chat_id, {
    message: "Email or Telegram contact is required",
  });

export type BookingInput = z.infer<typeof bookingSchema>;

export type PricingMode = "fixed" | "per_person" | "by_group";
export type GroupTier = { min: number; max: number; price: number };

type TourPricingFields = {
  pricing_modes: string[] | null;
  fixed_price: number | null;
  per_person_price: number | null;
  group_tiers: GroupTier[] | null;
  max_guests: number | null;
  // Legacy fallback
  pricing_mode?: string | null;
  group_prices?: Record<string, number> | null;
  price_from?: number | null;
};

const LEGACY_GROUP_MAX: Record<string, number> = {
  private: 2, small: 6, group: 12, large: 25,
};

/**
 * Normalize a tour's pricing configuration, applying legacy backfill so tours
 * that haven't been re-saved still work.
 */
export function readTourPricing(tour: TourPricingFields): {
  available_modes: PricingMode[];
  fixed_price: number | null;
  per_person_price: number | null;
  group_tiers: GroupTier[];
  max_guests: number | null;
} {
  const declared = Array.isArray(tour.pricing_modes) ? tour.pricing_modes : [];
  const modes = declared.filter((m): m is PricingMode =>
    m === "fixed" || m === "per_person" || m === "by_group",
  );

  let fixedPrice = tour.fixed_price != null ? Number(tour.fixed_price) : null;
  let perPerson = tour.per_person_price != null ? Number(tour.per_person_price) : null;
  let tiers: GroupTier[] = Array.isArray(tour.group_tiers)
    ? tour.group_tiers.map((t) => ({
        min: Number(t.min), max: Number(t.max), price: Number(t.price),
      }))
    : [];
  let maxGuests = tour.max_guests != null ? Number(tour.max_guests) : null;

  // Legacy fallback: if no modes declared, derive from old columns
  if (modes.length === 0) {
    const gp = (tour.group_prices ?? {}) as Record<string, number>;
    if (tour.pricing_mode === "by_group") {
      let prev = 0;
      for (const cat of ["private", "small", "group", "large"]) {
        const price = Number(gp[cat] ?? 0);
        if (price > 0) {
          tiers.push({ min: prev + 1, max: LEGACY_GROUP_MAX[cat], price });
          prev = LEGACY_GROUP_MAX[cat];
        }
      }
      if (tiers.length > 0) {
        modes.push("by_group");
        if (maxGuests == null) maxGuests = prev;
      }
    } else {
      const price = Number(gp.fixed ?? tour.price_from ?? 0);
      if (price > 0) {
        modes.push("fixed");
        fixedPrice = price;
      }
    }
  }

  return {
    available_modes: modes,
    fixed_price: fixedPrice,
    per_person_price: perPerson,
    group_tiers: tiers,
    max_guests: maxGuests,
  };
}

/** Find the tier whose range contains `adults`. Returns null if none matches. */
export function findTier(tiers: GroupTier[], adults: number): GroupTier | null {
  return tiers.find((t) => adults >= t.min && adults <= t.max) ?? null;
}

/**
 * Compute the base price for a booking given the chosen mode. Throws with a
 * human-readable message on any pricing error. Also returns the resolved mode
 * (useful when caller omitted it and only one was available).
 */
export function computeBasePrice(
  pricing: ReturnType<typeof readTourPricing>,
  adults: number,
  chosenMode: PricingMode | undefined,
): { base_price: number; pricing_mode: PricingMode; resolved_tier: GroupTier | null } {
  if (pricing.available_modes.length === 0) {
    throw new Error("Tour price is not set.");
  }
  if (pricing.max_guests != null && adults > pricing.max_guests) {
    throw new Error(`This tour accepts up to ${pricing.max_guests} guests.`);
  }

  let mode: PricingMode;
  if (chosenMode) {
    if (!pricing.available_modes.includes(chosenMode)) {
      throw new Error("Selected pricing option is not available for this tour.");
    }
    mode = chosenMode;
  } else if (pricing.available_modes.length === 1) {
    mode = pricing.available_modes[0];
  } else {
    throw new Error("Please choose a pricing option.");
  }

  if (mode === "fixed") {
    if (!pricing.fixed_price || pricing.fixed_price <= 0) {
      throw new Error("Tour price is not set.");
    }
    return { base_price: pricing.fixed_price, pricing_mode: mode, resolved_tier: null };
  }
  if (mode === "per_person") {
    if (!pricing.per_person_price || pricing.per_person_price <= 0) {
      throw new Error("Tour price is not set.");
    }
    return {
      base_price: Math.round(pricing.per_person_price * adults),
      pricing_mode: mode,
      resolved_tier: null,
    };
  }
  // by_group
  const tier = findTier(pricing.group_tiers, adults);
  if (!tier) {
    throw new Error("This group size is not offered for this tour.");
  }
  return { base_price: tier.price, pricing_mode: mode, resolved_tier: tier };
}

export type BookingCoreResult = { id: string; status: string };

export const quoteSchema = z.object({
  tour_id: z.string().uuid(),
  adults: z.number().int().min(1).max(50),
  children: z.number().int().min(0).max(50).default(0),
  pricing_mode: z.enum(["fixed", "per_person", "by_group"]).optional(),
  language: z.string().min(1).max(40).nullable().optional(),
});
export type QuoteInput = z.infer<typeof quoteSchema>;

export type PriceQuote = {
  base_price: number;
  language_multiplier_pct: number;
  subtotal: number;
  service_fee: number;
  service_fee_rate: number;
  total: number;
  currency: string;
  pricing_mode: PricingMode;
  available_modes: PricingMode[];
  resolved_tier: GroupTier | null;
  max_guests: number | null;
};

/**
 * Server-authoritative price quote — the exact same math createBookingCore
 * uses, without creating a booking.
 */
export async function quoteBookingCore(input: QuoteInput): Promise<PriceQuote> {
  const { data: tour, error: tourErr } = await supabaseAdmin
    .from("tours")
    .select(
      "id, price_from, pricing_mode, base_language, language_multipliers, group_prices, pricing_modes, fixed_price, per_person_price, group_tiers, max_guests, published",
    )
    .eq("id", input.tour_id)
    .maybeSingle();
  if (tourErr) throw new Error(tourErr.message);
  if (!tour || !(tour as any).published) throw new Error("Tour not available");

  const pricing = readTourPricing(tour as any);
  const { base_price, pricing_mode, resolved_tier } = computeBasePrice(
    pricing,
    input.adults,
    input.pricing_mode,
  );

  const langMults = ((tour as any).language_multipliers ?? {}) as Record<string, number>;
  const baseLanguage = (tour as any).base_language as string | null;
  const lang = input.language ?? null;
  const mult = !lang || lang === baseLanguage ? 0 : Number(langMults[lang] ?? 0);
  const subtotal = Math.round(base_price * (1 + mult / 100));

  const { data: sfSetting } = await supabaseAdmin
    .from("app_settings")
    .select("value")
    .eq("key", "hamroh_service_fee_rate")
    .maybeSingle();
  const sfRaw = (sfSetting as any)?.value;
  const serviceFeeRate = typeof sfRaw === "number" ? sfRaw : Number(sfRaw);
  const effectiveServiceFeeRate =
    Number.isFinite(serviceFeeRate) && serviceFeeRate >= 0 && serviceFeeRate < 1
      ? serviceFeeRate
      : 0.05;
  const fee = Math.round(subtotal * effectiveServiceFeeRate);
  const total = subtotal + fee;

  return {
    base_price,
    language_multiplier_pct: mult,
    subtotal,
    service_fee: fee,
    service_fee_rate: effectiveServiceFeeRate,
    total,
    currency: "USD",
    pricing_mode,
    available_modes: pricing.available_modes,
    resolved_tier,
    max_guests: pricing.max_guests,
  };
}

/**
 * Create a booking with full server-authoritative validation, pricing,
 * and side-effects. Callers MUST pass an already-resolved user id
 * (or null for guest bookings); this function never trusts client-supplied
 * user_id fields.
 *
 * Throws Error with a human-readable message on validation failure.
 * DB triggers handle: commission/payout math, slot reservation,
 * calendar event mirror.
 */
export async function createBookingCore(
  data: BookingInput,
  authedUserId: string | null,
): Promise<BookingCoreResult> {
  const clientLocale = normalizeLocale(data.locale);

  // Verify accepted offer version is the current one
  const { data: currentOffer, error: offerErr } = await supabaseAdmin
    .from("legal_offers")
    .select("version")
    .eq("is_current", true)
    .maybeSingle();
  if (offerErr) throw new Error(offerErr.message);
  if (!currentOffer || (currentOffer as any).version !== data.offer_version) {
    throw new Error(
      "The public offer has been updated. Please reload and accept the current version.",
    );
  }
  const offerAcceptedAtIso = new Date().toISOString();

  // Load tour authoritatively — never trust client-side price.
  const { data: tour, error: tourErr } = await supabaseAdmin
    .from("tours")
    .select(
      "id, guide_id, title, price_from, price_by_language, pricing_mode, base_language, language_multipliers, group_prices, pricing_modes, fixed_price, per_person_price, group_tiers, max_guests, children_free_under, duration_hours, published",
    )
    .eq("id", data.tour_id)
    .maybeSingle();
  if (tourErr) throw new Error(tourErr.message);
  if (!tour || !tour.published) throw new Error("Tour not available");

  const langMults = ((tour as any).language_multipliers ?? {}) as Record<string, number>;
  const baseLanguage = (tour as any).base_language as string | null;

  const pricing = readTourPricing(tour as any);
  const { base_price: basePrice, pricing_mode: resolvedMode, resolved_tier: resolvedTier } =
    computeBasePrice(pricing, data.adults, data.pricing_mode);

  const lang = data.language ?? null;
  const mult = !lang || lang === baseLanguage ? 0 : Number(langMults[lang] ?? 0);
  const subtotal = Math.round(basePrice * (1 + mult / 100));

  // Prevent guides from booking their own tour
  if (authedUserId) {
    const { data: guideOwner } = await supabaseAdmin
      .from("guides")
      .select("user_id")
      .eq("id", (tour as any).guide_id)
      .maybeSingle();
    if (guideOwner?.user_id && guideOwner.user_id === authedUserId) {
      throw new Error("You cannot book your own tour.");
    }
  }

  // Fetch current service fee rate from app_settings
  const { data: sfSetting } = await supabaseAdmin
    .from("app_settings")
    .select("value")
    .eq("key", "hamroh_service_fee_rate")
    .maybeSingle();
  const sfRaw = (sfSetting as any)?.value;
  const serviceFeeRate = typeof sfRaw === "number" ? sfRaw : Number(sfRaw);
  const effectiveServiceFeeRate =
    Number.isFinite(serviceFeeRate) && serviceFeeRate >= 0 && serviceFeeRate < 1
      ? serviceFeeRate
      : 0.05;
  const fee = Math.round(subtotal * effectiveServiceFeeRate);
  const total = subtotal + fee;

  const totalGuests = data.adults + data.children;
  const isInstant = !!data.slot_id;
  const experienceLabel = data.language ? `${tour.title} (${data.language})` : tour.title;

  // Compute response deadline based on how soon the tour starts
  let expiresAt: string | null = null;
  if (!isInstant) {
    const rawTime = data.start_time ?? "12:00";
    const normalizedTime = rawTime.length >= 8 ? rawTime.slice(0, 8) : `${rawTime}:00`;
    const tourStart = new Date(`${data.date}T${normalizedTime}`);
    const hoursUntilTour = (tourStart.getTime() - Date.now()) / 3600000;
    let responseHours = 24;
    if (hoursUntilTour < 24) responseHours = 2;
    else if (hoursUntilTour < 48) responseHours = 12;
    const deadlineMs = Math.min(
      Date.now() + responseHours * 3600000,
      tourStart.getTime() - 30 * 60000,
    );
    expiresAt = new Date(Math.max(deadlineMs, Date.now() + 30 * 60000)).toISOString();
  }

  const insertPayload = {
    tour_id: tour.id,
    guide_id: tour.guide_id,
    slot_id: data.slot_id ?? null,
    experience: experienceLabel,
    language: data.language ?? null,
    date: data.date,
    start_time: data.start_time ?? null,
    duration_minutes:
      data.duration_minutes ?? Math.round(Number(tour.duration_hours) * 60) ?? 120,
    guests: totalGuests,
    adults: data.adults,
    children: data.children,
    group_category: resolvedCategory ?? data.group_category ?? null,
    customer_name: data.customer_name,
    customer_email: data.customer_email || null,
    customer_telegram_user_id: data.customer_telegram_user_id ?? null,
    customer_telegram_chat_id: data.customer_telegram_chat_id ?? null,
    customer_telegram_username: data.customer_telegram_username ?? null,
    notes: data.notes ?? "",
    tour_price: subtotal,
    total,
    payment_method: data.payment_method,
    source: data.source ?? "web",
    user_id: authedUserId,
    status: isInstant ? "confirmed" : "pending",
    locale: clientLocale,
    expires_at: expiresAt,
    offer_version: data.offer_version,
    offer_accepted_at: offerAcceptedAtIso,
  };
  const { data: row, error } = await supabaseAdmin
    .from("bookings")
    .insert(insertPayload)
    .select("id, status")
    .single();
  if (error) {
    // Trigger bookings_prevent_time_conflict raises with "TIME_CONFLICT:" prefix
    if (error.message?.includes("TIME_CONFLICT")) {
      const err = new Error("This time is already booked. Please choose another time.");
      (err as any).code = "TIME_CONFLICT";
      throw err;
    }
    throw new Error(error.message);
  }

  // Fire-and-forget transactional emails / telegram notifications
  try {
    const { data: guide } = await supabaseAdmin
      .from("guides")
      .select("name, user_id, locale, notification_email")
      .eq("id", tour.guide_id)
      .maybeSingle();

    const guideName = guide?.name ?? undefined;
    const guideLocale = normalizeLocale(guide?.locale);
    const status = (row.status as "confirmed" | "pending") ?? "pending";

    let notificationEmail = data.customer_email || null;
    if (!notificationEmail && authedUserId) {
      const { data: clientTelegram } = await supabaseAdmin
        .from("telegram_accounts")
        .select("email")
        .eq("user_id", authedUserId)
        .maybeSingle();
      notificationEmail = clientTelegram?.email ?? null;
    }
    if (notificationEmail) {
      await enqueueTransactionalEmail({
        supabase: supabaseAdmin,
        templateName: "booking-confirmation-client",
        recipientEmail: notificationEmail,
        templateData: {
          customerName: data.customer_name,
          guideName,
          experience: experienceLabel,
          date: data.date,
          startTime: data.start_time,
          guests: totalGuests,
          total,
          bookingUrl: `${APP_BASE_URL}/my-bookings`,
          status,
          locale: clientLocale,
        },
        idempotencyKey: `booking-client-${row.id}`,
      });
    }

    let clientChatId = data.customer_telegram_chat_id ?? null;
    if (!clientChatId && authedUserId) {
      const { data: clientTelegram } = await supabaseAdmin
        .from("telegram_accounts")
        .select("telegram_chat_id")
        .eq("user_id", authedUserId)
        .maybeSingle();
      clientChatId = clientTelegram?.telegram_chat_id ?? null;
    }
    await sendTelegramMessage(
      clientChatId,
      bookingDetailsText({
        title: status === "confirmed" ? "Booking confirmed" : "Booking request received",
        guideName,
        experience: experienceLabel,
        date: data.date,
        startTime: data.start_time,
        guests: totalGuests,
        status,
        url: `${APP_BASE_URL}/my-bookings`,
      }),
    );

    if (authedUserId) {
      await createNotification(supabaseAdmin, {
        userId: authedUserId,
        type: "booking_status",
        entityId: row.id,
        entityType: "booking",
        title: status === "confirmed" ? "Booking confirmed" : "Booking request sent",
        body: guideName ? `${experienceLabel} with ${guideName}` : experienceLabel,
        icon: status === "confirmed" ? "✅" : "📅",
        link: `/my-bookings`,
      });
    }

    if (guide?.user_id) {
      let guideEmail: string | null | undefined = (guide as any).notification_email;
      if (!guideEmail) {
        const { data: guideUser } = await supabaseAdmin.auth.admin.getUserById(guide.user_id);
        guideEmail = guideUser?.user?.email ?? null;
      }
      if (guideEmail) {
        await enqueueTransactionalEmail({
          supabase: supabaseAdmin,
          templateName: "booking-new-guide",
          recipientEmail: guideEmail,
          templateData: {
            guideName,
            customerName: data.customer_name,
            customerEmail: data.customer_email || "Telegram",
            experience: experienceLabel,
            date: data.date,
            startTime: data.start_time,
            guests: totalGuests,
            total,
            notes: data.notes,
            bookingUrl: `${APP_BASE_URL}/guide`,
            status,
            locale: guideLocale,
          },
          idempotencyKey: `booking-guide-${row.id}`,
        });
      }
      const { data: guideTelegram } = await supabaseAdmin
        .from("telegram_accounts")
        .select("telegram_chat_id")
        .eq("user_id", guide.user_id)
        .maybeSingle();
      await sendTelegramMessage(
        guideTelegram?.telegram_chat_id,
        bookingDetailsText({
          title: "New booking request",
          customerName: data.customer_name,
          experience: experienceLabel,
          date: data.date,
          startTime: data.start_time,
          guests: totalGuests,
          status,
          url: `${APP_BASE_URL}/guide`,
        }),
      );

      await createNotification(supabaseAdmin, {
        userId: guide.user_id,
        type: "booking_new",
        entityId: row.id,
        entityType: "booking",
        title: status === "confirmed" ? "New booking" : "New booking request",
        body: `${data.customer_name} — ${experienceLabel}`,
        icon: "📅",
        link: `/guide`,
      });
    }
  } catch (e) {
    console.error("Booking email enqueue failed", e);
  }

  // Mirror confirmed bookings to Google Calendar (best-effort)
  try {
    if ((row.status as string) === "confirmed") {
      await mirrorBookingToGoogle(row.id);
    }
  } catch (e) {
    console.error("[booking] google mirror failed", e);
  }

  return row as BookingCoreResult;
}

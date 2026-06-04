import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { enqueueTransactionalEmail } from "@/lib/email/enqueue.server";
import { normalizeLocale } from "@/lib/email-templates/_i18n";
import { bookingDetailsText, sendTelegramMessage } from "@/lib/telegram-notifications.server";
import { getOptionalUserId } from "@/lib/optional-auth.server";
import { mirrorBookingToGoogle } from "@/lib/google-calendar.server";

const APP_BASE_URL = "https://hamrohim.com";

// Public: list available slots for a guide on a specific date (or upcoming)
export const getGuideSlots = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z.object({
      guide_id: z.string().uuid(),
      from_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const from = data.from_date ?? new Date().toISOString().slice(0, 10);
    const { data: rows, error } = await supabaseAdmin
      .from("guide_availability_slots")
      .select("id, date, start_time, duration_minutes")
      .eq("guide_id", data.guide_id)
      .eq("is_booked", false)
      .gte("date", from)
      .order("date", { ascending: true })
      .order("start_time", { ascending: true })
      .limit(50);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const bookingSchema = z.object({
  tour_id: z.string().uuid(),
  slot_id: z.string().uuid().nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  duration_minutes: z.number().int().min(30).max(720).optional(),
  adults: z.number().int().min(1).max(50),
  children: z.number().int().min(0).max(50).default(0),
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
}).refine((data) => data.customer_email || data.customer_telegram_chat_id, {
  message: "Email or Telegram contact is required",
});

const GROUP_MAX: Record<"private" | "small" | "group" | "large", number> = {
  private: 2,
  small: 6,
  group: 12,
  large: 25,
};

export const createBooking = createServerFn({ method: "POST" })
  .inputValidator((input) => bookingSchema.parse(input))
  .handler(async ({ data }) => {
    const clientLocale = normalizeLocale(data.locale);
    const authedUserId = await getOptionalUserId();

    // Load tour authoritatively — never trust client-side price.
    const { data: tour, error: tourErr } = await supabaseAdmin
      .from("tours")
      .select("id, guide_id, title, price_from, price_by_language, pricing_mode, base_language, language_multipliers, group_prices, children_free_under, duration_hours, published")
      .eq("id", data.tour_id)
      .maybeSingle();
    if (tourErr) throw new Error(tourErr.message);
    if (!tour || !tour.published) throw new Error("Tour not available");

    const pricingMode = (tour as any).pricing_mode === "by_group" ? "by_group" : "fixed";
    const groupPrices = ((tour as any).group_prices ?? {}) as Record<string, number>;
    const langMults = ((tour as any).language_multipliers ?? {}) as Record<string, number>;
    const baseLanguage = (tour as any).base_language as string | null;

    let basePrice = 0;
    if (pricingMode === "by_group") {
      if (!data.group_category) throw new Error("Please choose a group size.");
      const max = GROUP_MAX[data.group_category];
      if (data.adults > max) {
        throw new Error("Your group is larger than this category. Please contact the guide.");
      }
      basePrice = Number(groupPrices[data.group_category] ?? 0);
      if (basePrice <= 0) throw new Error("This group size is not offered for this tour.");
    } else {
      basePrice = Number(groupPrices.fixed ?? tour.price_from ?? 0);
      if (basePrice <= 0) throw new Error("Tour price is not set.");
    }

    const lang = data.language ?? null;
    const mult = !lang || lang === baseLanguage ? 0 : Number(langMults[lang] ?? 0);
    const subtotal = Math.round(basePrice * (1 + mult / 100));
    const fee = Math.round(subtotal * 0.08);
    const total = subtotal + fee;

    const totalGuests = data.adults + data.children;
    const isInstant = !!data.slot_id;
    const experienceLabel = data.language ? `${tour.title} (${data.language})` : tour.title;

    // Compute response deadline based on how soon the tour starts
    let expiresAt: string | null = null;
    if (!isInstant) {
      const tourStart = new Date(`${data.date}T${data.start_time ?? "12:00"}:00`);
      const hoursUntilTour = (tourStart.getTime() - Date.now()) / 3600000;
      let responseHours = 24;
      if (hoursUntilTour < 24) responseHours = 2;
      else if (hoursUntilTour < 48) responseHours = 12;
      // Cap so deadline never exceeds tour start
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
      duration_minutes: data.duration_minutes ?? Math.round(Number(tour.duration_hours) * 60) ?? 120,
      guests: totalGuests,
      adults: data.adults,
      children: data.children,
      group_category: data.group_category ?? null,
      customer_name: data.customer_name,
      customer_email: data.customer_email || null,
      customer_telegram_user_id: data.customer_telegram_user_id ?? null,
      customer_telegram_chat_id: data.customer_telegram_chat_id ?? null,
      customer_telegram_username: data.customer_telegram_username ?? null,
      notes: data.notes ?? "",
      total,
      source: data.source ?? "web",
      user_id: authedUserId,
      status: isInstant ? "confirmed" : "pending",
      locale: clientLocale,
      expires_at: expiresAt,
    };
    const { data: row, error } = await supabaseAdmin
      .from("bookings")
      .insert(insertPayload)
      .select("id, status")
      .single();
    if (error) throw new Error(error.message);

    // Fire-and-forget transactional emails / telegram notifications
    try {
      const { data: guide } = await supabaseAdmin
        .from("guides")
        .select("name, user_id, locale")
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
      await sendTelegramMessage(clientChatId, bookingDetailsText({
        title: status === "confirmed" ? "Booking confirmed" : "Booking request received",
        guideName,
        experience: experienceLabel,
        date: data.date,
        startTime: data.start_time,
        guests: totalGuests,
        status,
        url: `${APP_BASE_URL}/my-bookings`,
      }));

      if (guide?.user_id) {
        const { data: guideUser } = await supabaseAdmin.auth.admin.getUserById(guide.user_id);
        const guideEmail = guideUser?.user?.email;
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
        await sendTelegramMessage(guideTelegram?.telegram_chat_id, bookingDetailsText({
          title: "New booking request",
          customerName: data.customer_name,
          experience: experienceLabel,
          date: data.date,
          startTime: data.start_time,
          guests: totalGuests,
          status,
          url: `${APP_BASE_URL}/guide`,
        }));
      }
    } catch (e) {
      console.error("Booking email enqueue failed", e);
    }

    return row;
  });

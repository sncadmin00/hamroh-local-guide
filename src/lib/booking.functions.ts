import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { enqueueTransactionalEmail } from "@/lib/email/enqueue.server";
import { normalizeLocale } from "@/lib/email-templates/_i18n";
import { bookingDetailsText, sendTelegramMessage } from "@/lib/telegram-notifications.server";

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
  guide_id: z.string().uuid(),
  slot_id: z.string().uuid().nullable().optional(),
  experience: z.string().min(1).max(255),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  duration_minutes: z.number().int().min(30).max(720).optional(),
  guests: z.number().int().min(1).max(50),
  customer_name: z.string().min(1).max(200),
  customer_email: z.string().email().optional().or(z.literal("")),
  customer_telegram_user_id: z.number().int().positive().optional(),
  customer_telegram_chat_id: z.number().int().optional(),
  customer_telegram_username: z.string().max(255).optional(),
  notes: z.string().max(2000).optional(),
  total: z.number().min(0),
  source: z.string().max(64).optional(),
  user_id: z.string().uuid().nullable().optional(),
  locale: z.enum(["ru", "uz", "en"]).optional(),
}).refine((data) => data.customer_email || data.customer_telegram_chat_id, {
  message: "Email or Telegram contact is required",
});

export const createBooking = createServerFn({ method: "POST" })
  .inputValidator((input) => bookingSchema.parse(input))
  .handler(async ({ data }) => {
    const clientLocale = normalizeLocale(data.locale);
    // Instant booking if slot picked, otherwise pending request
    const isInstant = !!data.slot_id;
    const insertPayload = {
      guide_id: data.guide_id,
      slot_id: data.slot_id ?? null,
      experience: data.experience,
      date: data.date,
      start_time: data.start_time ?? null,
      duration_minutes: data.duration_minutes ?? 120,
      guests: data.guests,
      customer_name: data.customer_name,
      customer_email: data.customer_email || null,
      customer_telegram_user_id: data.customer_telegram_user_id ?? null,
      customer_telegram_chat_id: data.customer_telegram_chat_id ?? null,
      customer_telegram_username: data.customer_telegram_username ?? null,
      notes: data.notes ?? "",
      total: data.total,
      source: data.source ?? "web",
      user_id: data.user_id ?? null,
      status: isInstant ? "confirmed" : "pending",
      locale: clientLocale,
    };
    const { data: row, error } = await supabaseAdmin
      .from("bookings")
      .insert(insertPayload)
      .select("id, status")
      .single();
    if (error) throw new Error(error.message);

    // Fire-and-forget transactional emails
    try {
      const { data: guide } = await supabaseAdmin
        .from("guides")
        .select("name, user_id, locale")
        .eq("id", data.guide_id)
        .maybeSingle();

      const guideName = guide?.name ?? undefined;
      const guideLocale = normalizeLocale(guide?.locale);
      const status = (row.status as "confirmed" | "pending") ?? "pending";

      let notificationEmail = data.customer_email || null;
      if (!notificationEmail && data.user_id) {
        const { data: clientTelegram } = await supabaseAdmin
          .from("telegram_accounts")
          .select("email")
          .eq("user_id", data.user_id)
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
            experience: data.experience,
            date: data.date,
            startTime: data.start_time,
            guests: data.guests,
            total: data.total,
            bookingUrl: `${APP_BASE_URL}/my-bookings`,
            status,
            locale: clientLocale,
          },
          idempotencyKey: `booking-client-${row.id}`,
        });
      }

      let clientChatId = data.customer_telegram_chat_id ?? null;
      if (!clientChatId && data.user_id) {
        const { data: clientTelegram } = await supabaseAdmin
          .from("telegram_accounts")
          .select("telegram_chat_id")
          .eq("user_id", data.user_id)
          .maybeSingle();
        clientChatId = clientTelegram?.telegram_chat_id ?? null;
      }
      await sendTelegramMessage(clientChatId, bookingDetailsText({
        title: status === "confirmed" ? "Booking confirmed" : "Booking request received",
        guideName,
        experience: data.experience,
        date: data.date,
        startTime: data.start_time,
        guests: data.guests,
        status,
        url: `${APP_BASE_URL}/my-bookings`,
      }));

      // Notify guide
      if (guide?.user_id) {
        const { data: guideUser } = await supabaseAdmin.auth.admin.getUserById(
          guide.user_id,
        );
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
              experience: data.experience,
              date: data.date,
              startTime: data.start_time,
              guests: data.guests,
              total: data.total,
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
            experience: data.experience,
            date: data.date,
            startTime: data.start_time,
            guests: data.guests,
            status,
            url: `${APP_BASE_URL}/guide`,
          }));
      }
    } catch (e) {
      console.error("Booking email enqueue failed", e);
    }

    return row;
  });

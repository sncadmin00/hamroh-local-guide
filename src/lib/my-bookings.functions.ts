import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { enqueueTransactionalEmail } from "@/lib/email/enqueue.server";
import { normalizeLocale } from "@/lib/email-templates/_i18n";
import { bookingDetailsText, sendTelegramMessage } from "@/lib/telegram-notifications.server";

const APP_BASE_URL = "https://hamrohim.com";

export const listMyBookings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("bookings")
      .select("id, experience, date, start_time, duration_minutes, guests, status, total, created_at, cancellation_reason, guides(name, slug, photo_url)")
      .eq("user_id", userId)
      .order("date", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// Client cancels their own booking
export const cancelBookingAsClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      id: z.string().uuid(),
      reason: z.string().trim().max(500).optional(),
    }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    // Load + verify ownership (RLS also guards, this is extra safety)
    const { data: booking, error: loadErr } = await supabase
      .from("bookings")
      .select("id, user_id, guide_id, status, experience, date, start_time, customer_name, customer_email, locale")
      .eq("id", data.id)
      .maybeSingle();
    if (loadErr) throw new Error(loadErr.message);
    if (!booking) throw new Error("Booking not found");
    if (booking.user_id !== userId) throw new Error("Forbidden");
    if (["cancelled", "declined"].includes(booking.status as string)) {
      return { ok: true, already: true };
    }

    const { error: updErr } = await supabase
      .from("bookings")
      .update({ status: "cancelled", cancellation_reason: data.reason ?? null })
      .eq("id", data.id);
    if (updErr) throw new Error(updErr.message);

    // Notify guide
    try {
      const { data: guide } = await supabaseAdmin
        .from("guides")
        .select("name, user_id, locale")
        .eq("id", booking.guide_id)
        .maybeSingle();
      if (guide?.user_id) {
        const { data: guideUser } = await supabaseAdmin.auth.admin.getUserById(guide.user_id);
        const guideEmail = guideUser?.user?.email;
          if (guideEmail) {
          await enqueueTransactionalEmail({
            supabase: supabaseAdmin,
            templateName: "booking-cancelled-by-client",
            recipientEmail: guideEmail,
            templateData: {
              guideName: guide.name ?? undefined,
              customerName: booking.customer_name,
              experience: booking.experience,
              date: booking.date,
              startTime: booking.start_time,
              reason: data.reason,
              bookingUrl: `${APP_BASE_URL}/guide`,
              locale: normalizeLocale(guide.locale),
            },
            idempotencyKey: `booking-cancel-by-client-${booking.id}`,
          });
        }
        const { data: guideTelegram } = await supabaseAdmin
          .from("telegram_accounts")
          .select("telegram_chat_id")
          .eq("user_id", guide.user_id)
          .maybeSingle();
        await sendTelegramMessage(guideTelegram?.telegram_chat_id, bookingDetailsText({
          title: "Booking cancelled by client",
          customerName: booking.customer_name,
          guideName: guide.name ?? undefined,
          experience: booking.experience,
          date: booking.date,
          startTime: booking.start_time,
          reason: data.reason,
          url: `${APP_BASE_URL}/guide`,
        }));
      }
    } catch (e) {
      console.error("Failed to notify guide of client cancellation", e);
    }

    return { ok: true };
  });

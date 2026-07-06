import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { enqueueTransactionalEmail } from "@/lib/email/enqueue.server";
import { normalizeLocale } from "@/lib/email-templates/_i18n";
import { bookingDetailsText, sendTelegramMessage } from "@/lib/telegram-notifications.server";
import { createNotification } from "@/lib/notifications.server";

const APP_BASE_URL = "https://hamrohim.com";

export const listMyBookings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("bookings")
      .select("id, experience, date, start_time, duration_minutes, guests, status, total, created_at, cancellation_reason, proposed_date, proposed_time, proposed_note, proposed_at, slot_id, expires_at, guides(name, slug, photo_url)")
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

        await createNotification(supabaseAdmin, {
          userId: guide.user_id,
          type: "booking_cancelled_by_client",
          entityId: booking.id,
          entityType: "booking",
          title: "Booking cancelled by client",
          body: `${booking.customer_name} — ${booking.experience}`,
          icon: "⚠️",
          link: `/guide`,
        });
      }

    } catch (e) {
      console.error("Failed to notify guide of client cancellation", e);
    }

    return { ok: true };
  });

// Client accepts or declines a guide's proposed alternative time
export const respondToProposal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      id: z.string().uuid(),
      accept: z.boolean(),
    }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    const { data: booking, error: loadErr } = await supabase
      .from("bookings")
      .select("id, user_id, guide_id, status, slot_id, proposed_date, proposed_time, experience, date, start_time, customer_name, locale")
      .eq("id", data.id)
      .maybeSingle();
    if (loadErr) throw new Error(loadErr.message);
    if (!booking) throw new Error("Booking not found");
    if (booking.user_id !== userId) throw new Error("Forbidden");
    if (!booking.proposed_date || !booking.proposed_time) {
      throw new Error("No proposal to respond to");
    }

    if (data.accept) {
      // Free the old slot if any (proposed time is custom; no auto-slot binding)
      if (booking.slot_id) {
        await supabaseAdmin
          .from("guide_availability_slots")
          .update({ is_booked: false, booking_id: null })
          .eq("id", booking.slot_id);
      }
      const { error: updErr } = await supabase
        .from("bookings")
        .update({
          date: booking.proposed_date,
          start_time: booking.proposed_time,
          slot_id: null,
          status: "confirmed",
          proposed_date: null,
          proposed_time: null,
          proposed_note: null,
          proposed_at: null,
        })
        .eq("id", data.id);
      if (updErr) throw new Error(updErr.message);
    } else {
      const { error: updErr } = await supabase
        .from("bookings")
        .update({
          proposed_date: null,
          proposed_time: null,
          proposed_note: null,
          proposed_at: null,
        })
        .eq("id", data.id);
      if (updErr) throw new Error(updErr.message);
    }

    // Notify guide
    try {
      const { data: guide } = await supabaseAdmin
        .from("guides").select("name, user_id, locale").eq("id", booking.guide_id).maybeSingle();
      if (guide?.user_id) {
        const { data: guideUser } = await supabaseAdmin.auth.admin.getUserById(guide.user_id);
        const guideEmail = guideUser?.user?.email;
        if (guideEmail) {
          await enqueueTransactionalEmail({
            supabase: supabaseAdmin,
            templateName: "booking-status-update-client",
            recipientEmail: guideEmail,
            templateData: {
              customerName: booking.customer_name,
              guideName: guide.name ?? undefined,
              experience: booking.experience,
              date: data.accept ? booking.proposed_date! : booking.date,
              startTime: data.accept ? booking.proposed_time! : booking.start_time,
              reason: data.accept ? "Client accepted the proposed time" : "Client declined the proposed time",
              bookingUrl: `${APP_BASE_URL}/guide`,
              status: data.accept ? "confirmed" : "pending",
              locale: normalizeLocale(guide.locale),
            },
            idempotencyKey: `proposal-${data.id}-${data.accept ? "accept" : "decline"}`,
          });
        }
        const { data: guideTelegram } = await supabaseAdmin
          .from("telegram_accounts")
          .select("telegram_chat_id")
          .eq("user_id", guide.user_id)
          .maybeSingle();
        await sendTelegramMessage(guideTelegram?.telegram_chat_id, bookingDetailsText({
          title: data.accept ? "Client accepted proposed time" : "Client declined proposed time",
          customerName: booking.customer_name,
          guideName: guide.name ?? undefined,
          experience: booking.experience,
          date: data.accept ? booking.proposed_date! : booking.date,
          startTime: data.accept ? booking.proposed_time! : booking.start_time,
          status: data.accept ? "confirmed" : "pending",
          url: `${APP_BASE_URL}/guide`,
        }));

        await createNotification(supabaseAdmin, {
          userId: guide.user_id,
          type: "booking_proposal_response",
          entityId: booking.id,
          entityType: "booking",
          title: data.accept ? "Client accepted proposed time" : "Client declined proposed time",
          body: `${booking.customer_name} — ${booking.experience}`,
          icon: data.accept ? "✅" : "❌",
          link: `/guide`,
        });
      }

    } catch (e) {
      console.error("Failed to notify guide of proposal response", e);
    }

    return { ok: true, accepted: data.accept };
  });

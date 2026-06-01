import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { enqueueTransactionalEmail } from "@/lib/email/enqueue.server";
import { normalizeLocale } from "@/lib/email-templates/_i18n";

const APP_BASE_URL = "https://hamrohim.com";


// Returns the guide record linked to the current user (or null), with referral stats
export const getMyGuide = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("guides")
      .select("id, name, slug, photo_url, tagline, price_per_day, referral_code, cities(name)")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    const { count } = await supabase
      .from("referral_clicks")
      .select("*", { count: "exact", head: true })
      .eq("guide_id", data.id);
    return { ...data, referral_clicks: count ?? 0 };
  });

export const listMySlots = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: guide } = await supabase
      .from("guides").select("id").eq("user_id", userId).maybeSingle();
    if (!guide) return [];
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("guide_availability_slots")
      .select("id, date, start_time, duration_minutes, is_booked, booking_id")
      .eq("guide_id", guide.id)
      .gte("date", today)
      .order("date", { ascending: true })
      .order("start_time", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const addSlotSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  duration_minutes: z.number().int().min(30).max(720),
});

export const addSlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => addSlotSchema.parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: guide } = await supabase
      .from("guides").select("id").eq("user_id", userId).maybeSingle();
    if (!guide) throw new Error("You are not linked to a guide profile yet.");
    const { error } = await supabase.from("guide_availability_slots").insert({
      guide_id: guide.id,
      date: data.date,
      start_time: data.start_time,
      duration_minutes: data.duration_minutes,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteSlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("guide_availability_slots")
      .delete()
      .eq("id", data.id)
      .eq("is_booked", false);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMyBookings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: guide } = await supabase
      .from("guides").select("id").eq("user_id", userId).maybeSingle();
    if (!guide) return [];
    const { data, error } = await supabase
      .from("bookings")
      .select("id, customer_name, customer_email, experience, date, start_time, duration_minutes, guests, total, status, notes, created_at, slot_id")
      .eq("guide_id", guide.id)
      .order("date", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const updateBookingStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(["confirmed", "declined", "cancelled"]),
      reason: z.string().trim().max(500).optional(),
    }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;

    // Load prior state to detect transition + recipient
    const { data: prior } = await supabase
      .from("bookings")
      .select("id, status, customer_email, customer_name, experience, date, start_time, locale, guide_id")
      .eq("id", data.id)
      .maybeSingle();

    const update: { status: typeof data.status; cancellation_reason?: string | null } = {
      status: data.status,
    };
    if (data.status !== "confirmed" && data.reason) {
      update.cancellation_reason = data.reason;
    }
    const { error } = await supabase
      .from("bookings")
      .update(update)
      .eq("id", data.id);
    if (error) throw new Error(error.message);


    // Notify client (skip if no state change)
    if (prior && prior.status !== data.status && prior.customer_email) {
      try {
        const { data: guide } = await supabaseAdmin
          .from("guides")
          .select("name")
          .eq("id", prior.guide_id)
          .maybeSingle();
        await enqueueTransactionalEmail({
          supabase: supabaseAdmin,
          templateName: "booking-status-update-client",
          recipientEmail: prior.customer_email,
          templateData: {
            customerName: prior.customer_name,
            guideName: guide?.name ?? undefined,
            experience: prior.experience,
            date: prior.date,
            startTime: prior.start_time,
            reason: data.reason,
            bookingUrl: `${APP_BASE_URL}/my-bookings`,
            status: data.status,
            locale: normalizeLocale(prior.locale),
          },
          idempotencyKey: `booking-status-${data.id}-${data.status}`,
        });
      } catch (e) {
        console.error("Failed to notify client of status change", e);
      }
    }

    return { ok: true };
  });


import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { enqueueTransactionalEmail } from "@/lib/email/enqueue.server";
import { normalizeLocale } from "@/lib/email-templates/_i18n";
import { bookingDetailsText, sendTelegramMessage } from "@/lib/telegram-notifications.server";

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
      .select("id, customer_name, customer_email, customer_telegram_username, experience, date, start_time, duration_minutes, guests, total, status, notes, created_at, slot_id")
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
      .select("id, status, customer_email, customer_telegram_chat_id, customer_name, experience, date, start_time, locale, guide_id")
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
    if (prior && prior.status !== data.status) {
      try {
        const { data: guide } = await supabaseAdmin
          .from("guides")
          .select("name")
          .eq("id", prior.guide_id)
          .maybeSingle();
        if (prior.customer_email) {
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
        }
        await sendTelegramMessage(prior.customer_telegram_chat_id, bookingDetailsText({
          title: `Booking ${data.status}`,
          guideName: guide?.name ?? undefined,
          customerName: prior.customer_name,
          experience: prior.experience,
          date: prior.date,
          startTime: prior.start_time,
          status: data.status,
          reason: data.reason,
          url: `${APP_BASE_URL}/my-bookings`,
        }));
      } catch (e) {
        console.error("Failed to notify client of status change", e);
      }
    }

    return { ok: true };
  });

// ---------- Experiences (tours) ----------

export const listMyExperiences = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: guide } = await supabase
      .from("guides").select("id, languages").eq("user_id", userId).maybeSingle();
    if (!guide) return { languages: [] as string[], experiences: [] as Array<{ id: string; title: string; duration: string; price: number; price_by_language: Record<string, number>; sort_order: number }> };
    const { data, error } = await supabase
      .from("guide_experiences")
      .select("id, title, duration, price, price_by_language, sort_order")
      .eq("guide_id", guide.id)
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return {
      languages: (guide.languages ?? []) as string[],
      experiences: (data ?? []).map((e: { id: string; title: string; duration: string; price: number; price_by_language: Record<string, number> | null; sort_order: number }) => ({
        id: e.id,
        title: e.title,
        duration: e.duration,
        price: Number(e.price),
        price_by_language: (e.price_by_language ?? {}) as Record<string, number>,
        sort_order: e.sort_order,
      })),
    };
  });

const upsertExperienceSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(200),
  duration: z.string().trim().min(1).max(60),
  price: z.number().min(0).max(100000),
  price_by_language: z.record(z.string().min(1).max(40), z.number().min(0).max(100000)).default({}),
  sort_order: z.number().int().min(0).max(1000).default(0),
});

export const upsertExperience = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => upsertExperienceSchema.parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: guide } = await supabase
      .from("guides").select("id").eq("user_id", userId).maybeSingle();
    if (!guide) throw new Error("You are not linked to a guide profile yet.");
    const cleaned: Record<string, number> = {};
    for (const [k, v] of Object.entries(data.price_by_language)) {
      if (v > 0) cleaned[k] = v;
    }
    if (data.id) {
      const { error } = await supabase.from("guide_experiences").update({
        title: data.title,
        duration: data.duration,
        price: data.price,
        price_by_language: cleaned,
        sort_order: data.sort_order,
      }).eq("id", data.id).eq("guide_id", guide.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: inserted, error } = await supabase.from("guide_experiences").insert({
      guide_id: guide.id,
      title: data.title,
      duration: data.duration,
      price: data.price,
      price_by_language: cleaned,
      sort_order: data.sort_order,
    }).select("id").single();
    if (error) throw new Error(error.message);
    return { ok: true, id: inserted.id as string };
  });

export const deleteExperience = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: guide } = await supabase
      .from("guides").select("id").eq("user_id", userId).maybeSingle();
    if (!guide) throw new Error("You are not linked to a guide profile yet.");
    const { error } = await supabase
      .from("guide_experiences").delete().eq("id", data.id).eq("guide_id", guide.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });



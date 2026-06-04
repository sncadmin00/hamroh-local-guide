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
      .select("id, name, slug, photo_url, tagline, price_per_day, referral_code, city_id, extra_city_ids, languages, cities(name)")
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

export const updateMyCities = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    extra_city_ids: z.array(z.string().uuid()).max(20),
  }).parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("guides")
      .update({ extra_city_ids: data.extra_city_ids })
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateMyLanguages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    languages: z.array(z.string().min(1).max(80)).max(30),
  }).parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("guides")
      .update({ languages: data.languages })
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
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
      .select("id, customer_name, customer_email, customer_telegram_username, experience, language, date, start_time, duration_minutes, guests, total, status, notes, created_at, slot_id, proposed_date, proposed_time, proposed_note, proposed_at, expires_at")
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


export const proposeBookingTime = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      id: z.string().uuid(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
      note: z.string().trim().max(500).optional(),
    }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;

    const { data: prior, error: loadErr } = await supabase
      .from("bookings")
      .select("id, status, customer_email, customer_telegram_chat_id, customer_name, experience, locale, guide_id")
      .eq("id", data.id)
      .maybeSingle();
    if (loadErr) throw new Error(loadErr.message);
    if (!prior) throw new Error("Booking not found");
    if (!["pending", "confirmed"].includes(prior.status as string)) {
      throw new Error("Cannot propose new time for this booking");
    }

    const { error } = await supabase
      .from("bookings")
      .update({
        proposed_date: data.date,
        proposed_time: data.time,
        proposed_note: data.note ?? null,
        proposed_at: new Date().toISOString(),
        status: "pending",
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    try {
      const { data: guide } = await supabaseAdmin
        .from("guides").select("name").eq("id", prior.guide_id).maybeSingle();
      if (prior.customer_email) {
        await enqueueTransactionalEmail({
          supabase: supabaseAdmin,
          templateName: "booking-status-update-client",
          recipientEmail: prior.customer_email,
          templateData: {
            customerName: prior.customer_name,
            guideName: guide?.name ?? undefined,
            experience: prior.experience,
            date: data.date,
            startTime: data.time,
            reason: data.note ? `Proposed new time. ${data.note}` : "Proposed new time",
            bookingUrl: `${APP_BASE_URL}/my-bookings`,
            status: "pending",
            locale: normalizeLocale(prior.locale),
          },
          idempotencyKey: `booking-propose-${data.id}-${data.date}-${data.time}`,
        });
      }
      await sendTelegramMessage(prior.customer_telegram_chat_id, bookingDetailsText({
        title: "Guide proposed a new time",
        guideName: guide?.name ?? undefined,
        customerName: prior.customer_name,
        experience: prior.experience,
        date: data.date,
        startTime: data.time,
        status: "pending",
        reason: data.note,
        url: `${APP_BASE_URL}/my-bookings`,
      }));
    } catch (e) {
      console.error("Failed to notify client of proposed time", e);
    }

    return { ok: true };
  });

// ---------- Tours (guide-owned) ----------

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "tour";
}

export const listMyTours = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: guide } = await supabase
      .from("guides")
      .select("id, languages, city_id, extra_city_ids")
      .eq("user_id", userId)
      .maybeSingle();
    if (!guide) {
      return {
        guide: null,
        cities: [] as Array<{ id: string; name: string }>,
        tours: [] as any[],
      };
    }
    const cityIds = [guide.city_id, ...((guide.extra_city_ids ?? []) as string[])];
    const [{ data: cityRows }, { data: tourRows, error }] = await Promise.all([
      supabase.from("cities").select("id, name").in("id", cityIds),
      supabase
        .from("tours")
        .select("id, slug, title, short_description, cover_url, city_id, duration_hours, price_from, price_by_language, pricing_mode, base_language, language_multipliers, group_prices, children_free_under, transport_included, languages, highlights, included, not_included, published, sort_order, tour_categories(category_id)")
        .eq("guide_id", guide.id)
        .order("sort_order", { ascending: true }),
    ]);
    if (error) throw new Error(error.message);
    const tours = (tourRows ?? []).map((t: any) => ({
      ...t,
      category_ids: ((t.tour_categories ?? []) as Array<{ category_id: string }>).map((tc) => tc.category_id),
    }));
    return {
      guide: { languages: (guide.languages ?? []) as string[], city_id: guide.city_id },
      cities: (cityRows ?? []) as Array<{ id: string; name: string }>,
      tours,
    };
  });

const GROUP_KEYS = ["private", "small", "group", "large"] as const;

const upsertTourSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(200),
  short_description: z.string().trim().max(500).default(""),
  cover_url: z.string().trim().max(2000).optional().nullable(),
  city_id: z.string().uuid(),
  duration_hours: z.number().min(0.5).max(72),
  pricing_mode: z.enum(["fixed", "by_group"]).default("fixed"),
  fixed_price: z.number().min(0).max(100000).default(0),
  group_prices: z
    .record(z.enum(GROUP_KEYS), z.number().min(0).max(100000))
    .default(() => ({}) as Record<(typeof GROUP_KEYS)[number], number>),
  base_language: z.string().trim().min(1).max(40).default("Russian"),
  language_multipliers: z
    .record(z.string().min(1).max(40), z.number().min(-50).max(500))
    .default(() => ({}) as Record<string, number>),
  children_free_under: z.number().int().min(0).max(21).default(16),
  languages: z.array(z.string().min(1).max(40)).max(20).default([]),
  transport_included: z.boolean().default(false),
  highlights: z.array(z.string().trim().min(1).max(300)).max(30).default([]),
  included: z.array(z.string().trim().min(1).max(300)).max(30).default([]),
  not_included: z.array(z.string().trim().min(1).max(300)).max(30).default([]),
  published: z.boolean().default(true),
  sort_order: z.number().int().min(0).max(1000).default(0),
  category_ids: z.array(z.string().uuid()).max(20).default([]),
});

export const upsertTour = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => upsertTourSchema.parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: guide } = await supabase
      .from("guides").select("id, slug").eq("user_id", userId).maybeSingle();
    if (!guide) throw new Error("You are not linked to a guide profile yet.");

    // Build group_prices jsonb depending on mode
    const groupPrices: Record<string, number> = {};
    if (data.pricing_mode === "by_group") {
      for (const k of GROUP_KEYS) {
        const v = Number(data.group_prices[k] ?? 0);
        if (v > 0) groupPrices[k] = v;
      }
      if (Object.keys(groupPrices).length === 0) {
        throw new Error("Add at least one group price.");
      }
    } else {
      if (data.fixed_price <= 0) throw new Error("Set a price.");
      groupPrices.fixed = data.fixed_price;
    }

    // Clean language multipliers (drop base language and zero/empty)
    const cleanedMults: Record<string, number> = {};
    for (const [k, v] of Object.entries(data.language_multipliers)) {
      if (k === data.base_language) continue;
      if (Number.isFinite(v)) cleanedMults[k] = v;
    }

    // price_from = minimum offered base price
    const priceFrom = Math.min(...Object.values(groupPrices));

    const payload = {
      title: data.title,
      short_description: data.short_description,
      description_md: "",
      cover_url: data.cover_url || null,
      city_id: data.city_id,
      duration_hours: data.duration_hours,
      price_from: priceFrom,
      price_by_language: {},
      pricing_mode: data.pricing_mode,
      base_language: data.base_language,
      language_multipliers: cleanedMults,
      group_prices: groupPrices,
      children_free_under: data.children_free_under,
      languages: data.languages,
      transport_included: data.transport_included,
      highlights: data.highlights,
      included: data.included,
      not_included: data.not_included,
      published: data.published,
      sort_order: data.sort_order,
    };


    let tourId: string;
    if (data.id) {
      const { error } = await supabase
        .from("tours")
        .update(payload)
        .eq("id", data.id)
        .eq("guide_id", guide.id);
      if (error) throw new Error(error.message);
      tourId = data.id;
    } else {
      // Generate unique slug from guide slug + title
      const base = `${guide.slug}-${slugify(data.title)}`;
      let slug = base;
      for (let i = 0; i < 5; i++) {
        const { data: existing } = await supabase
          .from("tours").select("id").eq("slug", slug).maybeSingle();
        if (!existing) break;
        slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
      }

      const { data: inserted, error } = await supabase
        .from("tours")
        .insert({ ...payload, slug, guide_id: guide.id })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      tourId = inserted.id as string;
    }

    // Sync tour_categories (table RLS only allows admins, so use supabaseAdmin;
    // tour ownership was already verified above)
    {
      const { error: delErr } = await supabaseAdmin
        .from("tour_categories").delete().eq("tour_id", tourId);
      if (delErr) throw new Error(delErr.message);
      if (data.category_ids.length > 0) {
        const rows = data.category_ids.map((cid) => ({ tour_id: tourId, category_id: cid }));
        const { error: insErr } = await supabaseAdmin
          .from("tour_categories").insert(rows);
        if (insErr) throw new Error(insErr.message);
      }
    }

    return { ok: true, id: tourId };
  });

export const deleteTour = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: guide } = await supabase
      .from("guides").select("id").eq("user_id", userId).maybeSingle();
    if (!guide) throw new Error("You are not linked to a guide profile yet.");
    const { error } = await supabase
      .from("tours").delete().eq("id", data.id).eq("guide_id", guide.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

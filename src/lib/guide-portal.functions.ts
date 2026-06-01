import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Returns the guide record linked to the current user (or null)
export const getMyGuide = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("guides")
      .select("id, name, slug, photo_url, tagline, price_per_day, cities(name)")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
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
    }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("bookings")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

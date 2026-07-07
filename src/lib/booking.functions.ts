import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getOptionalUserId } from "@/lib/optional-auth.server";
import { bookingSchema, createBookingCore } from "@/lib/booking-core.server";

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

// Public: busy time ranges for a guide on a given date. Mobile / web pickers
// use this to hide (or grey out) slots that overlap active bookings.
export const getGuideBusyTimes = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z.object({
      guide_id: z.string().uuid(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const { data: rows, error } = await supabaseAdmin
      .from("bookings")
      .select("start_time, duration_minutes, status")
      .eq("guide_id", data.guide_id)
      .eq("date", data.date)
      .in("status", ["pending", "confirmed"])
      .not("start_time", "is", null);
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r: any) => ({
      start_time: r.start_time as string,
      duration_minutes: (r.duration_minutes ?? 120) as number,
      status: r.status as "pending" | "confirmed",
    }));
  });
export const createBooking = createServerFn({ method: "POST" })
  .inputValidator((input) => bookingSchema.parse(input))
  .handler(async ({ data }) => {
    const authedUserId = await getOptionalUserId();
    return await createBookingCore(data, authedUserId);
  });

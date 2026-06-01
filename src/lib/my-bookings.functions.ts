import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listMyBookings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("bookings")
      .select("id, experience, date, start_time, duration_minutes, guests, status, total, created_at, guides(name, slug, photo_url)")
      .eq("user_id", userId)
      .order("date", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

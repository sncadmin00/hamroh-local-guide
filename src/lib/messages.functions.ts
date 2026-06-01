import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// List chat threads = bookings the user is part of (as client or guide), with last message preview
export const listMessageThreads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Bookings where I'm client OR where I own the guide
    const { data: ownedGuides } = await supabase
      .from("guides")
      .select("id")
      .eq("user_id", userId);
    const guideIds = (ownedGuides ?? []).map((g) => g.id);

    let query = supabase
      .from("bookings")
      .select("id, experience, date, status, user_id, guide_id, guides(name, photo_url)")
      .order("created_at", { ascending: false });

    if (guideIds.length > 0) {
      query = query.or(`user_id.eq.${userId},guide_id.in.(${guideIds.join(",")})`);
    } else {
      query = query.eq("user_id", userId);
    }

    const { data: bookings, error } = await query;
    if (error) throw new Error(error.message);

    const ids = (bookings ?? []).map((b) => b.id);
    if (ids.length === 0) return [];

    const { data: msgs } = await supabase
      .from("booking_messages")
      .select("booking_id, body, created_at, sender_id, read_at")
      .in("booking_id", ids)
      .order("created_at", { ascending: false });

    const lastByBooking = new Map<string, { body: string; created_at: string; sender_id: string }>();
    const unreadByBooking = new Map<string, number>();
    for (const m of msgs ?? []) {
      if (!lastByBooking.has(m.booking_id)) {
        lastByBooking.set(m.booking_id, { body: m.body, created_at: m.created_at, sender_id: m.sender_id });
      }
      if (m.sender_id !== userId && !m.read_at) {
        unreadByBooking.set(m.booking_id, (unreadByBooking.get(m.booking_id) ?? 0) + 1);
      }
    }

    return (bookings ?? []).map((b) => ({
      booking_id: b.id,
      experience: b.experience,
      date: b.date,
      status: b.status,
      role: b.user_id === userId ? "client" as const : "guide" as const,
      counterpart_name: (b as { guides?: { name?: string } }).guides?.name ?? "Guide",
      counterpart_photo: (b as { guides?: { photo_url?: string } }).guides?.photo_url ?? null,
      last_message: lastByBooking.get(b.id) ?? null,
      unread: unreadByBooking.get(b.id) ?? 0,
    }));
  });

// Get one thread: booking info + role + messages
export const getMessageThread = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ booking_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: booking, error } = await supabase
      .from("bookings")
      .select("id, experience, date, start_time, status, user_id, guide_id, customer_name, guides(name, photo_url, user_id)")
      .eq("id", data.booking_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!booking) throw new Error("Booking not found or access denied");

    const guideUserId = (booking as { guides?: { user_id?: string } }).guides?.user_id;
    const role: "client" | "guide" =
      booking.user_id === userId ? "client" : guideUserId === userId ? "guide" : (() => { throw new Error("Access denied"); })();

    const { data: messages, error: mErr } = await supabase
      .from("booking_messages")
      .select("id, sender_id, sender_role, body, created_at, read_at")
      .eq("booking_id", data.booking_id)
      .order("created_at", { ascending: true });
    if (mErr) throw new Error(mErr.message);

    // Mark incoming messages as read
    const unreadIds = (messages ?? []).filter((m) => m.sender_id !== userId && !m.read_at).map((m) => m.id);
    if (unreadIds.length > 0) {
      await supabase.from("booking_messages").update({ read_at: new Date().toISOString() }).in("id", unreadIds);
    }

    return {
      booking: {
        id: booking.id,
        experience: booking.experience,
        date: booking.date,
        start_time: booking.start_time,
        status: booking.status,
        counterpart_name: role === "client"
          ? ((booking as { guides?: { name?: string } }).guides?.name ?? "Guide")
          : booking.customer_name,
        counterpart_photo: (booking as { guides?: { photo_url?: string } }).guides?.photo_url ?? null,
      },
      role,
      messages: messages ?? [],
    };
  });

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      booking_id: z.string().uuid(),
      body: z.string().min(1).max(4000),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: booking, error } = await supabase
      .from("bookings")
      .select("user_id, guide_id, guides(user_id)")
      .eq("id", data.booking_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!booking) throw new Error("Booking not found");

    const guideUserId = (booking as { guides?: { user_id?: string } }).guides?.user_id;
    const role: "client" | "guide" =
      booking.user_id === userId ? "client" : guideUserId === userId ? "guide" : (() => { throw new Error("Access denied"); })();

    const { data: row, error: insErr } = await supabase
      .from("booking_messages")
      .insert({
        booking_id: data.booking_id,
        sender_id: userId,
        sender_role: role,
        body: data.body,
      })
      .select("id, sender_id, sender_role, body, created_at, read_at")
      .single();
    if (insErr) throw new Error(insErr.message);
    return row;
  });

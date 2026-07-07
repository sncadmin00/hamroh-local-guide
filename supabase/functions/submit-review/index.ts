// Supabase Edge Function: submit-review
// Mobile-facing review submission. Mirrors the web `submitReview` server fn.
//
// The mobile app calls:
//   supabase.functions.invoke('submit-review', {
//     body: { booking_id, rating, comment?, photos? }
//   })
//
// Server behavior (service role):
// - Verifies caller JWT → user_id
// - Loads booking; enforces user_id ownership
// - Requires tour_id != null, status in (confirmed, completed), date <= today
// - guide_id / tour_id taken from booking (not from client)
// - Upserts review on booking_id
// - Filters photos to user's own storage prefix
// - Transitions booking confirmed → completed
// - Returns { review } on success, { error, message } on failure
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function validation(message: string, status = 400) {
  return json({ error: "ValidationError", message }, status);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

type ParsedInput = {
  booking_id: string;
  rating: number;
  comment: string;
  photos: string[];
};

function parseInput(raw: unknown): ParsedInput {
  const input = asRecord(raw);

  const bookingId = typeof input.booking_id === "string" ? input.booking_id.trim() : "";
  if (!bookingId || !isUuid(bookingId)) throw new Error("Invalid booking_id");

  const ratingNum = Number(input.rating);
  if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    throw new Error("Rating must be an integer between 1 and 5");
  }

  let comment = "";
  if (input.comment !== undefined && input.comment !== null) {
    if (typeof input.comment !== "string") throw new Error("Invalid comment");
    comment = input.comment.trim();
    if (comment.length > 1000) throw new Error("Comment is too long (max 1000 chars)");
  }

  let photos: string[] = [];
  if (input.photos !== undefined && input.photos !== null) {
    if (!Array.isArray(input.photos)) throw new Error("Invalid photos");
    if (input.photos.length > 6) throw new Error("Max 6 photos");
    photos = input.photos.map((p) => {
      if (typeof p !== "string" || !p) throw new Error("Invalid photo path");
      return p;
    });
  }

  return { booking_id: bookingId, rating: ratingNum, comment, photos };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return json({ error: "ServerError", message: "Server not configured" }, 500);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Verify caller — reviews require an authenticated user
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token || token === SERVICE_KEY) {
    return json({ error: "Unauthorized", message: "Sign-in required" }, 401);
  }
  let userId: string | null = null;
  try {
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data?.user) {
      return json({ error: "Unauthorized", message: "Invalid session" }, 401);
    }
    userId = data.user.id;
  } catch (e) {
    console.warn("[submit-review] token verify failed", e);
    return json({ error: "Unauthorized", message: "Invalid session" }, 401);
  }

  let input: ParsedInput;
  try {
    input = parseInput(await req.json());
  } catch (e: any) {
    return validation(e?.message ?? "Invalid input");
  }

  try {
    const { data: booking, error: bErr } = await admin
      .from("bookings")
      .select("id, user_id, guide_id, tour_id, status, date")
      .eq("id", input.booking_id)
      .maybeSingle();
    if (bErr) throw bErr;
    if (!booking) return validation("Booking not found", 404);
    if (booking.user_id !== userId) {
      return json({ error: "Forbidden", message: "This booking is not yours" }, 403);
    }
    if (!booking.tour_id) {
      return validation("This booking is not linked to a tour, so it cannot be reviewed.");
    }

    const eligibleStatus = booking.status === "confirmed" || booking.status === "completed";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tripDate = new Date(String(booking.date));
    const tripPassed = tripDate.getTime() <= today.getTime();
    if (!eligibleStatus || !tripPassed) {
      return validation("You can leave a review only after the trip is over.");
    }

    const expectedPrefix = `${userId}/review/${input.booking_id}/`;
    const cleanPhotos = input.photos.filter((p) => p.startsWith(expectedPrefix));

    const { data: review, error: upErr } = await admin
      .from("reviews")
      .upsert(
        {
          booking_id: input.booking_id,
          guide_id: booking.guide_id,
          tour_id: booking.tour_id,
          user_id: userId,
          rating: input.rating,
          comment: input.comment,
          photos: cleanPhotos,
        },
        { onConflict: "booking_id" },
      )
      .select("id, booking_id, guide_id, tour_id, rating, comment, photos, created_at, updated_at")
      .maybeSingle();
    if (upErr) throw upErr;

    if (booking.status !== "completed") {
      const { error: statusErr } = await admin
        .from("bookings")
        .update({ status: "completed" })
        .eq("id", booking.id);
      if (statusErr) console.error("[submit-review] failed to mark completed", statusErr);
    }

    return json({ review });
  } catch (e: any) {
    console.error("[submit-review]", e);
    return json(
      { error: "ServerError", message: e?.message ?? "Server error" },
      500,
    );
  }
});

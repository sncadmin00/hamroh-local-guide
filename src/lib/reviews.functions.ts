import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function attachAuthorNames<T extends { user_id: string }>(rows: T[]) {
  return Promise.all(
    rows.map(async (r) => {
      let name = "Guest";
      try {
        const { data: u } = await supabaseAdmin.auth.admin.getUserById(r.user_id);
        name =
          (u?.user?.user_metadata?.full_name as string | undefined) ||
          (u?.user?.user_metadata?.name as string | undefined) ||
          (u?.user?.email ? String(u.user.email).split("@")[0] : "Guest");
      } catch {
        /* ignore */
      }
      return { ...r, authorName: name };
    }),
  );
}

export const listGuideReviews = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ guideId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { data: rows, error } = await supabaseAdmin
      .from("reviews")
      .select("id, rating, comment, created_at, user_id, tour_id, tours(slug, title)")
      .eq("guide_id", data.guideId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);

    const withNames = await attachAuthorNames(
      (rows ?? []).map((r: any) => ({
        id: r.id as string,
        rating: r.rating as number,
        comment: r.comment as string,
        createdAt: r.created_at as string,
        user_id: r.user_id as string,
        tourId: r.tour_id as string | null,
        tourSlug: (r.tours?.slug as string | undefined) ?? null,
        tourTitle: (r.tours?.title as string | undefined) ?? null,
      })),
    );

    return withNames.map(({ user_id: _u, ...rest }) => rest);
  });

export const listTourReviews = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ tourId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { data: rows, error } = await supabaseAdmin
      .from("reviews")
      .select("id, rating, comment, created_at, user_id")
      .eq("tour_id", data.tourId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);

    const withNames = await attachAuthorNames(
      (rows ?? []).map((r) => ({
        id: r.id as string,
        rating: r.rating as number,
        comment: r.comment as string,
        createdAt: r.created_at as string,
        user_id: r.user_id as string,
      })),
    );
    return withNames.map(({ user_id: _u, ...rest }) => rest);
  });

export const getMyReviewForBooking = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ bookingId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("reviews")
      .select("id, rating, comment")
      .eq("booking_id", data.bookingId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

const reviewInputSchema = z.object({
  bookingId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).default(""),
});

export const submitReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => reviewInputSchema.parse(input))
  .handler(async ({ context, data }) => {
    const { userId } = context;

    // Validate booking ownership + that the trip already happened
    const { data: booking, error: bErr } = await supabaseAdmin
      .from("bookings")
      .select("id, user_id, guide_id, tour_id, status, date")
      .eq("id", data.bookingId)
      .maybeSingle();
    if (bErr) throw new Error(bErr.message);
    if (!booking) throw new Error("Booking not found");
    if (booking.user_id !== userId) throw new Error("Forbidden");
    if (!booking.tour_id) {
      throw new Error("This booking is not linked to a tour, so it cannot be reviewed.");
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tripDate = new Date(booking.date as unknown as string);
    const tripPassed = tripDate.getTime() <= today.getTime();
    const eligibleStatus = ["confirmed", "completed"].includes(
      String(booking.status),
    );
    if (!eligibleStatus || !tripPassed) {
      throw new Error("You can leave a review only after the trip is over.");
    }

    // Upsert by booking_id (unique)
    const { error: upErr } = await supabaseAdmin
      .from("reviews")
      .upsert(
        {
          booking_id: data.bookingId,
          guide_id: booking.guide_id,
          tour_id: booking.tour_id,
          user_id: userId,
          rating: data.rating,
          comment: data.comment,
        },
        { onConflict: "booking_id" },
      );
    if (upErr) throw new Error(upErr.message);

    // Mark booking as completed for clarity (idempotent)
    if (booking.status !== "completed") {
      await supabaseAdmin
        .from("bookings")
        .update({ status: "completed" })
        .eq("id", booking.id);
    }

    return { ok: true };
  });

export const deleteMyReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ reviewId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("reviews")
      .delete()
      .eq("id", data.reviewId)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const SIGN_TTL = 60 * 60 * 24 * 7; // 7 days

async function signPhotoBatch(paths: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const unique = Array.from(new Set(paths.filter(Boolean)));
  if (unique.length === 0) return map;
  const { data: signed } = await supabaseAdmin.storage
    .from("traveler-media")
    .createSignedUrls(unique, SIGN_TTL);
  if (signed) {
    for (const s of signed) {
      if (s.signedUrl && s.path) map.set(s.path, s.signedUrl);
    }
  }
  return map;
}

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
      .select("id, rating, comment, created_at, user_id, tour_id, photos, tours(slug, title)")
      .eq("guide_id", data.guideId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);

    const allPaths = (rows ?? []).flatMap((r: any) => (Array.isArray(r.photos) ? r.photos : []));
    const signedMap = await signPhotoBatch(allPaths);

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
        photoUrls: (Array.isArray(r.photos) ? r.photos : [])
          .map((p: string) => signedMap.get(p) || "")
          .filter(Boolean),
      })),
    );

    return withNames.map(({ user_id: _u, ...rest }) => rest);
  });

export const listTourReviews = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ tourId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { data: rows, error } = await supabaseAdmin
      .from("reviews")
      .select("id, rating, comment, created_at, user_id, photos")
      .eq("tour_id", data.tourId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);

    const allPaths = (rows ?? []).flatMap((r: any) => (Array.isArray(r.photos) ? r.photos : []));
    const signedMap = await signPhotoBatch(allPaths);

    const withNames = await attachAuthorNames(
      (rows ?? []).map((r: any) => ({
        id: r.id as string,
        rating: r.rating as number,
        comment: r.comment as string,
        createdAt: r.created_at as string,
        user_id: r.user_id as string,
        photoUrls: (Array.isArray(r.photos) ? r.photos : [])
          .map((p: string) => signedMap.get(p) || "")
          .filter(Boolean),
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
      .select("id, rating, comment, photos")
      .eq("booking_id", data.bookingId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    const photos = (Array.isArray((row as any).photos) ? (row as any).photos : []) as string[];
    const signedMap = await signPhotoBatch(photos);
    return {
      id: (row as any).id as string,
      rating: (row as any).rating as number,
      comment: (row as any).comment as string,
      photos,
      photoUrls: photos.map((p) => signedMap.get(p) || "").filter(Boolean),
    };
  });

const reviewInputSchema = z.object({
  bookingId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).default(""),
  photos: z.array(z.string().min(1)).max(6).default([]),
});

export const submitReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => reviewInputSchema.parse(input))
  .handler(async ({ context, data }) => {
    const { userId } = context;

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
    const eligibleStatus = ["confirmed", "completed"].includes(String(booking.status));
    if (!eligibleStatus || !tripPassed) {
      throw new Error("You can leave a review only after the trip is over.");
    }

    // Only accept photo paths inside the user's own folder
    const expectedPrefix = `${userId}/review/${data.bookingId}/`;
    const cleanPhotos = (data.photos ?? []).filter((p) => p.startsWith(expectedPrefix));

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
          photos: cleanPhotos,
        },
        { onConflict: "booking_id" },
      );
    if (upErr) throw new Error(upErr.message);

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

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const SEED_SECRET = "hamroh-appreview-seed-2026-x9k3";
const TOURIST_EMAIL = "appreview.tourist@arklabs.dev";
const GUIDE_EMAIL = "appreview.guide@arklabs.dev";
const PASSWORD = "HamrohReview!2026";
const CITY_ID = "89988c18-f4c2-48da-b08f-b8c8e1f130ed"; // Tashkent

async function findOrCreateUser(email: string, meta: Record<string, unknown>) {
  const { data: list } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
  const existing = list?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (existing) {
    await supabaseAdmin.auth.admin.updateUserById(existing.id, {
      password: PASSWORD,
      email_confirm: true,
      user_metadata: meta,
    });
    return existing.id;
  }
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: meta,
  });
  if (error) throw new Error(`createUser ${email}: ${error.message}`);
  return data.user!.id;
}

export const Route = createFileRoute("/api/public/hooks/seed-appreview")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (request.headers.get("x-seed-secret") !== SEED_SECRET) {
          return new Response("Forbidden", { status: 403 });
        }

        const touristId = await findOrCreateUser(TOURIST_EMAIL, {
          full_name: "App Review Tourist",
          locale: "en",
        });
        const guideUserId = await findOrCreateUser(GUIDE_EMAIL, {
          full_name: "App Review Guide",
          locale: "en",
        });

        // Upsert guide row
        const guideSlug = "appreview-guide";
        const { data: existingGuide } = await supabaseAdmin
          .from("guides")
          .select("id")
          .eq("user_id", guideUserId)
          .maybeSingle();

        let guideId: string;
        if (existingGuide) {
          guideId = existingGuide.id;
          await supabaseAdmin
            .from("guides")
            .update({
              verified: true,
              identity_verified: true,
              licensed: true,
              intro_video_verified: true,
              name: "Aziza Karimova",
              tagline: "Licensed Tashkent guide — history, architecture & food",
              bio: "Licensed guide with 8+ years of experience showing travelers around Tashkent. Fluent in English, Russian and Uzbek. This is a demo account for Apple App Review.",
              languages: ["English", "Russian", "Uzbek"],
              specialties: ["History", "Architecture", "Food"],
              price_per_day: 60,
              city_id: CITY_ID,
              locale: "en",
              notification_email: GUIDE_EMAIL,
              instant_book: true,
            })
            .eq("id", guideId);
        } else {
          const { data: created, error: gErr } = await supabaseAdmin
            .from("guides")
            .insert({
              user_id: guideUserId,
              slug: guideSlug,
              name: "Aziza Karimova",
              city_id: CITY_ID,
              tagline: "Licensed Tashkent guide — history, architecture & food",
              bio: "Licensed guide with 8+ years of experience showing travelers around Tashkent. Fluent in English, Russian and Uzbek. This is a demo account for Apple App Review.",
              languages: ["English", "Russian", "Uzbek"],
              specialties: ["History", "Architecture", "Food"],
              price_per_day: 60,
              locale: "en",
              verified: true,
              identity_verified: true,
              licensed: true,
              intro_video_verified: true,
              instant_book: true,
              notification_email: GUIDE_EMAIL,
            })
            .select("id")
            .single();
          if (gErr) throw new Error(`guide insert: ${gErr.message}`);
          guideId = created!.id;
        }

        // Upsert tour
        const tourSlug = "appreview-tashkent-classics";
        const { data: existingTour } = await supabaseAdmin
          .from("tours")
          .select("id")
          .eq("slug", tourSlug)
          .maybeSingle();

        const tourPayload = {
          guide_id: guideId,
          city_id: CITY_ID,
          slug: tourSlug,
          title: "Tashkent Classics — Old Town & Chorsu Bazaar",
          title_en: "Tashkent Classics — Old Town & Chorsu Bazaar",
          title_ru: "Классический Ташкент — Старый город и Чорсу",
          title_uz: "Klassik Toshkent — Eski shahar va Chorsu",
          short_description: "Half-day walk through Tashkent's Old Town, madrasas and Chorsu Bazaar with a licensed local guide.",
          short_description_en: "Half-day walk through Tashkent's Old Town, madrasas and Chorsu Bazaar with a licensed local guide.",
          description_md: "Discover the beating heart of Tashkent on a 4-hour walking tour. We'll visit the Hazrati Imam complex, Kukeldash Madrasa, and dive into the sights, smells and flavors of Chorsu Bazaar. Perfect for first-time visitors.",
          cover_url: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=1200",
          duration_hours: 4,
          price_from: 60,
          highlights: ["Hazrati Imam complex", "Kukeldash Madrasa", "Chorsu Bazaar tasting", "Old Tashkent mahallas"],
          included: ["Licensed guide", "Bazaar tastings", "Bottled water"],
          not_included: ["Transport", "Lunch"],
          languages: ["English", "Russian", "Uzbek"],
          base_language: "English",
          pricing_mode: "fixed",
          published: false, // set true after moderation
          moderation_status: "approved",
        };

        let tourId: string;
        if (existingTour) {
          tourId = existingTour.id;
          await supabaseAdmin.from("tours").update(tourPayload).eq("id", tourId);
        } else {
          const { data: t, error: tErr } = await supabaseAdmin
            .from("tours")
            .insert(tourPayload)
            .select("id")
            .single();
          if (tErr) throw new Error(`tour insert: ${tErr.message}`);
          tourId = t!.id;
        }
        // Now publish (trigger allows publish only when moderation_status=approved)
        await supabaseAdmin.from("tours").update({ published: true }).eq("id", tourId);

        // Seed a completed booking + review from tourist
        const { data: existingBooking } = await supabaseAdmin
          .from("bookings")
          .select("id")
          .eq("user_id", touristId)
          .eq("tour_id", tourId)
          .maybeSingle();

        let bookingId: string;
        if (!existingBooking) {
          const { data: b, error: bErr } = await supabaseAdmin
            .from("bookings")
            .insert({
              user_id: touristId,
              guide_id: guideId,
              tour_id: tourId,
              customer_name: "App Review Tourist",
              customer_email: TOURIST_EMAIL,
              experience: "Tashkent Classics — Old Town & Chorsu Bazaar",
              date: new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10),
              start_time: "10:00",
              duration_minutes: 240,
              guests: 2,
              adults: 2,
              children: 0,
              tour_price: 60,
              total: 63,
              status: "completed",
              payment_method: "cash",
            })
            .select("id")
            .single();
          if (bErr) throw new Error(`booking insert: ${bErr.message}`);
          bookingId = b!.id;
        } else {
          bookingId = existingBooking.id;
          await supabaseAdmin.from("bookings").update({ status: "completed" }).eq("id", bookingId);
        }

        const { data: existingReview } = await supabaseAdmin
          .from("reviews")
          .select("id")
          .eq("booking_id", bookingId)
          .maybeSingle();

        if (!existingReview) {
          await supabaseAdmin.from("reviews").insert({
            user_id: touristId,
            guide_id: guideId,
            tour_id: tourId,
            booking_id: bookingId,
            rating: 5,
            comment: "Aziza was fantastic — deeply knowledgeable, warm and made Tashkent feel like home. Highly recommend for anyone visiting for the first time!",
          });
        }

        return new Response(
          JSON.stringify({
            ok: true,
            tourist: { id: touristId, email: TOURIST_EMAIL, password: PASSWORD },
            guide: { id: guideUserId, email: GUIDE_EMAIL, password: PASSWORD, guide_id: guideId },
            tour: { id: tourId, slug: tourSlug },
            booking_id: bookingId,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});

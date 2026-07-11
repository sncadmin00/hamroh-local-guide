/**
 * POST /api/public/hooks/delete-account
 * Auth: Bearer <supabase user JWT>.
 *
 * Deletes the caller's account per App Store requirement:
 *  1) Anonymizes bookings (keeps financial history, strips PII).
 *  2) Deletes personal rows (wishlists, reviews, push tokens, referrals,
 *     promo codes, notifications, AI threads, diaries, wallets, telegram
 *     links, suggestions, feedback, roles, profile).
 *  3) If the caller is a guide — unpublishes the guide profile and
 *     detaches user_id (kept for existing bookings' financial history).
 *     Their tours/posts stay linked to the (now user-less) guide row.
 *  4) Deletes the auth.users row via admin API.
 *
 * Response: { ok: true } | { error: string }
 */
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const cors: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

export const Route = createFileRoute("/api/public/hooks/delete-account")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      POST: async ({ request }) => {
        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.toLowerCase().startsWith("bearer ")
          ? authHeader.slice(7).trim()
          : "";
        if (!token) {
          return Response.json({ error: "Unauthorized" }, { status: 401, headers: cors });
        }

        const url = process.env.SUPABASE_URL;
        const pk = process.env.SUPABASE_PUBLISHABLE_KEY;
        const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!url || !pk || !svc) {
          return Response.json({ error: "ServerMisconfigured" }, { status: 500, headers: cors });
        }

        // Validate caller.
        const asUser = createClient(url, pk, {
          auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
        });
        const { data: userRes, error: userErr } = await asUser.auth.getUser(token);
        if (userErr || !userRes?.user) {
          return Response.json({ error: "Unauthorized" }, { status: 401, headers: cors });
        }
        const userId = userRes.user.id;

        // Service role for cleanup + auth admin delete.
        const admin = createClient(url, svc, {
          auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
        });

        try {
          // 1) Anonymize bookings — keep financial history, strip PII.
          await admin
            .from("bookings")
            .update({
              user_id: null,
              customer_email: null,
              customer_phone: null,
              customer_telegram: null,
              customer_telegram_user_id: null,
              customer_name: "Deleted user",
              notes: null,
            })
            .eq("user_id", userId);

          // 2) If caller is a guide — unpublish and detach.
          const { data: guideRow } = await admin
            .from("guides")
            .select("id")
            .eq("user_id", userId)
            .maybeSingle();
          if (guideRow?.id) {
            await admin
              .from("guides")
              .update({
                user_id: null,
                published: false,
                verified: false,
                notification_email: null,
                payout_details: null,
              })
              .eq("id", guideRow.id);
          }

          // 3) Delete personal rows (best-effort — ignore errors on
          //    optional/absent tables so one failure doesn't strand the user).
          const tablesByUser = [
            "wishlists",
            "wishlist_collections",
            "reviews",
            "push_tokens",
            "user_promo_codes",
            "user_referral_codes",
            "notifications",
            "notification_preferences",
            "ai_threads",
            "travel_diaries",
            "trip_wallets",
            "trip_budgets",
            "wallet_expenses",
            "telegram_accounts",
            "telegram_link_codes",
            "city_suggestions",
            "place_suggestions",
            "guide_applications",
            "newsletter_subscribers",
            "user_roles",
            "profiles",
          ];
          for (const table of tablesByUser) {
            try {
              await admin.from(table).delete().eq("user_id", userId);
            } catch (_e) {
              /* ignore — table may not have this exact column */
            }
          }

          // Referrals — both directions.
          try {
            await admin.from("user_referrals").delete().eq("referrer_user_id", userId);
          } catch (_e) {}
          try {
            await admin.from("user_referrals").delete().eq("referred_user_id", userId);
          } catch (_e) {}

          // Detach feedback/analytics/audit-style rows (keep for ops).
          try {
            await admin.from("feedback").update({ user_id: null }).eq("user_id", userId);
          } catch (_e) {}
          try {
            await admin.from("analytics_events").update({ user_id: null }).eq("user_id", userId);
          } catch (_e) {}

          // 4) Delete auth.users row.
          const { error: delErr } = await admin.auth.admin.deleteUser(userId);
          if (delErr) {
            return Response.json(
              { error: "AuthDeleteFailed", message: delErr.message },
              { status: 500, headers: cors },
            );
          }

          return Response.json({ ok: true }, { headers: cors });
        } catch (e: any) {
          console.error("delete-account failed", e);
          return Response.json(
            { error: "DeleteFailed", message: e?.message ?? String(e) },
            { status: 500, headers: cors },
          );
        }
      },
    },
  },
});

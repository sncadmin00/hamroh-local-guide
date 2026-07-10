/**
 * GET /api/public/hooks/my-promo-codes
 * Authenticated. Returns the current user's promo codes.
 *
 * Query params:
 *   ?active_only=1  — only unused, currently valid codes
 *
 * Response:
 *   { items: [{ id, code, kind, value, currency, min_booking_amount,
 *               max_discount, valid_from, valid_until, used_at,
 *               used_booking_id, source, created_at, is_active }] }
 */
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const cors: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

async function resolveUser(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";
  if (!token) return { error: "Missing bearer token", status: 401 as const };
  const url = process.env.SUPABASE_URL;
  const pk = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !pk) return { error: "Supabase env missing", status: 500 as const };
  const auth = createClient(url, pk, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
  });
  const { data, error } = await auth.auth.getUser(token);
  if (error || !data?.user) return { error: "Invalid or expired token", status: 401 as const };
  return { userId: data.user.id };
}

export const Route = createFileRoute("/api/public/hooks/my-promo-codes")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      GET: async ({ request }) => {
        const auth = await resolveUser(request);
        if ("error" in auth) {
          return Response.json({ error: "Unauthorized", message: auth.error }, { status: auth.status, headers: cors });
        }
        const url = new URL(request.url);
        const activeOnly = url.searchParams.get("active_only") === "1";

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        let q = supabaseAdmin
          .from("user_promo_codes")
          .select(
            "id, code, kind, value, currency, min_booking_amount, max_discount, valid_from, valid_until, used_at, used_booking_id, source, created_at",
          )
          .eq("user_id", auth.userId)
          .order("created_at", { ascending: false });

        if (activeOnly) {
          const nowIso = new Date().toISOString();
          q = q.is("used_at", null).or(`valid_until.is.null,valid_until.gte.${nowIso}`);
        }

        const { data, error } = await q;
        if (error) return Response.json({ error: error.message }, { status: 500, headers: cors });

        const now = Date.now();
        const items = (data ?? []).map((r: Record<string, unknown>) => {
          const validUntil = r.valid_until ? Date.parse(r.valid_until as string) : null;
          const usedAt = r.used_at ?? null;
          const isActive = !usedAt && (validUntil === null || validUntil >= now);
          return { ...r, is_active: isActive };
        });
        return Response.json({ items }, { headers: cors });
      },
    },
  },
});

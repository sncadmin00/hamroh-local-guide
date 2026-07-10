/**
 * GET /api/public/hooks/my-payout-details
 * Auth: Bearer <supabase user JWT>.
 *
 * Returns the caller's saved payout method + masked details for prefilling
 * the mobile edit form. Never returns raw card numbers or full phone numbers.
 *
 * Response: {
 *   method: 'bank' | 'click' | 'payme' | 'cash' | 'other' | null,
 *   details_masked: Record<string, string> | null,
 *   updated_at: string | null,
 *   has_pending_request: boolean,   // guide already has a scheduled/processing payout
 * }
 */
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

function maskCard(v: unknown): string {
  const s = String(v ?? "").replace(/\D/g, "");
  if (s.length < 4) return "****";
  return `**** **** **** ${s.slice(-4)}`;
}
function maskPhone(v: unknown): string {
  const s = String(v ?? "");
  if (s.length < 4) return "***";
  return `${s.slice(0, 4)} *** ** ${s.slice(-2)}`;
}

function maskDetails(
  method: string | null,
  details: Record<string, unknown> | null,
): Record<string, string> | null {
  if (!method || !details) return null;
  switch (method) {
    case "bank":
      return {
        card_number: maskCard(details.card_number),
        bank_name: String(details.bank_name ?? ""),
        holder_name: String(details.holder_name ?? ""),
      };
    case "click":
    case "payme":
      return { phone: maskPhone(details.phone) };
    case "cash":
      return {};
    case "other":
      return { note: String(details.note ?? "") };
    default:
      return {};
  }
}

export const Route = createFileRoute("/api/public/hooks/my-payout-details")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      GET: async ({ request }) => {
        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.toLowerCase().startsWith("bearer ")
          ? authHeader.slice(7).trim()
          : "";
        if (!token) {
          return Response.json({ error: "Unauthorized" }, { status: 401, headers: cors });
        }

        const url = process.env.SUPABASE_URL;
        const pk = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!url || !pk) {
          return Response.json({ error: "ServerError" }, { status: 500, headers: cors });
        }
        const sb = createClient(url, pk, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
        });
        const { data: userRes, error: userErr } = await sb.auth.getUser(token);
        if (userErr || !userRes?.user) {
          return Response.json({ error: "Unauthorized" }, { status: 401, headers: cors });
        }
        const userId = userRes.user.id;

        const { data: guide } = await sb
          .from("guides")
          .select("id, payout_method, payout_details, payout_details_updated_at")
          .eq("user_id", userId)
          .maybeSingle();
        if (!guide) {
          return Response.json(
            { error: "NotFound", message: "You are not linked to a guide profile yet." },
            { status: 404, headers: cors },
          );
        }
        const g = guide as any;

        const { data: pending } = await sb
          .from("payouts")
          .select("id")
          .eq("guide_id", g.id)
          .in("status", ["scheduled", "processing"])
          .limit(1);

        return Response.json(
          {
            method: g.payout_method ?? null,
            details_masked: maskDetails(g.payout_method ?? null, g.payout_details ?? null),
            updated_at: g.payout_details_updated_at ?? null,
            has_pending_request: (pending ?? []).length > 0,
          },
          { headers: cors },
        );
      },
    },
  },
});

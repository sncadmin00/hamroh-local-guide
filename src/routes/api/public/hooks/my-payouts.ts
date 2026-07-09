/**
 * Public hook: list real payouts to the caller (guide).
 *
 * Auth: Authorization: Bearer <supabase user JWT>.
 * Method: GET
 * Returns: { payouts: Payout[] } ordered by created_at DESC.
 */
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    "Access-Control-Max-Age": "86400",
  };
}

export const Route = createFileRoute("/api/public/hooks/my-payouts")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders() }),

      GET: async ({ request }) => {
        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.toLowerCase().startsWith("bearer ")
          ? authHeader.slice(7).trim()
          : "";
        if (!token) {
          return Response.json(
            { error: "Unauthorized", message: "Missing bearer token" },
            { status: 401, headers: corsHeaders() },
          );
        }

        const url = process.env.SUPABASE_URL;
        const pk = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!url || !pk) {
          return Response.json(
            { error: "ServerError", message: "Supabase env missing" },
            { status: 500, headers: corsHeaders() },
          );
        }

        const sb = createClient(url, pk, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
        });

        const { data: userRes, error: userErr } = await sb.auth.getUser(token);
        if (userErr || !userRes?.user) {
          return Response.json(
            { error: "Unauthorized", message: "Invalid or expired token" },
            { status: 401, headers: corsHeaders() },
          );
        }
        const userId = userRes.user.id;

        const { data: guide } = await sb
          .from("guides")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();
        if (!guide) {
          return Response.json(
            { error: "NotFound", message: "You are not linked to a guide profile yet." },
            { status: 404, headers: corsHeaders() },
          );
        }
        const guideId = (guide as any).id as string;

        const { data, error } = await sb
          .from("payouts")
          .select(
            "id, payout_number, amount, currency, method, status, scheduled_at, paid_at, reference, notes, created_at",
          )
          .eq("guide_id", guideId)
          .order("created_at", { ascending: false });

        if (error) {
          return Response.json(
            { error: "DBError", message: error.message },
            { status: 400, headers: corsHeaders() },
          );
        }

        return Response.json(
          { payouts: data ?? [] },
          { headers: corsHeaders() },
        );
      },
    },
  },
});

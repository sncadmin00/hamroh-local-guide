/**
 * Public hook: upsert a tour on behalf of the caller.
 *
 * Auth: Authorization: Bearer <supabase user JWT> — resolved via the
 * publishable-key Supabase client (`auth.getUser(token)`). The caller must
 * be linked to a guide profile; the core enforces ownership on updates.
 *
 * Used by the mobile app to save tours through the same server-side
 * pipeline as the web (auto-translation, price_by_language recompute,
 * partial updates). Response is the full saved tour row.
 */
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { upsertTourCore, upsertTourInputSchema } from "@/lib/upsert-tour.server";

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    "Access-Control-Max-Age": "86400",
  };
}

export const Route = createFileRoute("/api/public/hooks/upsert-tour")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders() }),

      POST: async ({ request }) => {
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

        // Resolve the user via publishable-key client.
        const url = process.env.SUPABASE_URL;
        const pk = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!url || !pk) {
          return Response.json(
            { error: "ServerError", message: "Supabase env missing" },
            { status: 500, headers: corsHeaders() },
          );
        }
        const authClient = createClient(url, pk, {
          auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
        });
        const { data: userRes, error: userErr } = await authClient.auth.getUser(token);
        if (userErr || !userRes?.user) {
          return Response.json(
            { error: "Unauthorized", message: "Invalid or expired token" },
            { status: 401, headers: corsHeaders() },
          );
        }
        const userId = userRes.user.id;

        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return Response.json(
            { error: "ValidationError", message: "Invalid JSON" },
            { status: 400, headers: corsHeaders() },
          );
        }

        const parsed = upsertTourInputSchema.safeParse(raw);
        if (!parsed.success) {
          return Response.json(
            {
              error: "ValidationError",
              message: parsed.error.issues[0]?.message ?? "Invalid input",
              issues: parsed.error.issues,
            },
            { status: 400, headers: corsHeaders() },
          );
        }

        try {
          const tour = await upsertTourCore(parsed.data, userId);
          return Response.json(
            { ok: true, tour },
            { status: 200, headers: corsHeaders() },
          );
        } catch (e: any) {
          const message = e?.message ?? "Server error";
          console.error("[upsert-tour hook]", message);
          const notFound = /not found/i.test(message);
          const validation = /(required|invalid|pricing|price|tier|guide profile|owned)/i.test(message);
          const status = notFound ? 404 : validation ? 400 : 500;
          return Response.json(
            { error: notFound ? "NotFound" : validation ? "ValidationError" : "ServerError", message },
            { status, headers: corsHeaders() },
          );
        }
      },
    },
  },
});

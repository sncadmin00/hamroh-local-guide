/**
 * Public hook: guide submits one of their tours for admin moderation.
 *
 * Auth: Authorization: Bearer <supabase user JWT>. The caller must own
 * (via public.guides.user_id) the tour being submitted.
 *
 * Body: { id: string (uuid) }
 * Response: { ok: true, moderation_status: "pending_review", already?: boolean }
 * Errors:
 *   401 Unauthorized       — missing/invalid bearer
 *   404 NotFound           — tour missing or not owned by caller
 *   400 ValidationError    — already approved, or required fields missing
 */
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    "Access-Control-Max-Age": "86400",
  };
}

const inputSchema = z.object({ id: z.string().uuid() });

export const Route = createFileRoute("/api/public/hooks/submit-tour-for-review")({
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
        const parsed = inputSchema.safeParse(raw);
        if (!parsed.success) {
          return Response.json(
            { error: "ValidationError", message: parsed.error.issues[0]?.message ?? "Invalid input" },
            { status: 400, headers: corsHeaders() },
          );
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: guide } = await supabaseAdmin
          .from("guides").select("id").eq("user_id", userId).maybeSingle();
        if (!guide) {
          return Response.json(
            { error: "NotFound", message: "You are not linked to a guide profile yet." },
            { status: 404, headers: corsHeaders() },
          );
        }

        const { data: tour, error: tErr } = await supabaseAdmin
          .from("tours")
          .select("id, moderation_status, title, city_id, duration_hours, pricing_modes")
          .eq("id", parsed.data.id)
          .eq("guide_id", guide.id)
          .maybeSingle();
        if (tErr) {
          return Response.json(
            { error: "ServerError", message: tErr.message },
            { status: 500, headers: corsHeaders() },
          );
        }
        if (!tour) {
          return Response.json(
            { error: "NotFound", message: "Tour not found or not owned by this guide." },
            { status: 404, headers: corsHeaders() },
          );
        }

        if (tour.moderation_status === "pending_review") {
          return Response.json(
            { ok: true, moderation_status: "pending_review", already: true },
            { status: 200, headers: corsHeaders() },
          );
        }
        if (tour.moderation_status === "approved") {
          return Response.json(
            { error: "ValidationError", message: "Tour is already approved. Make edits to submit changes for review." },
            { status: 400, headers: corsHeaders() },
          );
        }
        if (!tour.title || !tour.city_id || !tour.duration_hours || !(tour.pricing_modes ?? []).length) {
          return Response.json(
            { error: "ValidationError", message: "Fill in title, city, duration and at least one pricing mode before submitting." },
            { status: 400, headers: corsHeaders() },
          );
        }

        const { error: updErr } = await (supabaseAdmin as any)
          .from("tours")
          .update({
            moderation_status: "pending_review",
            submitted_at: new Date().toISOString(),
            rejection_reason: null,
          })
          .eq("id", tour.id);
        if (updErr) {
          return Response.json(
            { error: "ServerError", message: updErr.message },
            { status: 500, headers: corsHeaders() },
          );
        }

        return Response.json(
          { ok: true, moderation_status: "pending_review" },
          { status: 200, headers: corsHeaders() },
        );
      },
    },
  },
});

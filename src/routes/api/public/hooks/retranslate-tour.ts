/**
 * Public hook: force re-translation of an existing tour.
 *
 * Auth: Authorization: Bearer <supabase user JWT>. Caller must be the
 * guide who owns the tour (enforced by upsertTourCore).
 *
 * Body: { id: string (uuid) }
 *
 * Reads the tour's current source-language texts and pushes them back
 * through upsertTourCore unchanged, which re-runs translateTourFields
 * for all three site locales (ru/en/uz). Useful for fixing tours whose
 * localized columns were left untranslated after a previous AI failure.
 *
 * Response: { ok: true, tour }
 */
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { upsertTourCore } from "@/lib/upsert-tour.server";

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    "Access-Control-Max-Age": "86400",
  };
}

const inputSchema = z.object({ id: z.string().uuid() });

export const Route = createFileRoute("/api/public/hooks/retranslate-tour")({
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

        // Load current source texts via admin client — ownership is enforced by
        // upsertTourCore (guide_id must match the caller's guide profile).
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: current, error: readErr } = await supabaseAdmin
          .from("tours")
          .select("id, title, short_description, highlights, included, not_included, base_language")
          .eq("id", parsed.data.id)
          .maybeSingle();
        if (readErr) {
          return Response.json(
            { error: "ServerError", message: readErr.message },
            { status: 500, headers: corsHeaders() },
          );
        }
        if (!current) {
          return Response.json(
            { error: "NotFound", message: "Tour not found" },
            { status: 404, headers: corsHeaders() },
          );
        }

        try {
          const tour = await upsertTourCore(
            {
              id: current.id as string,
              title: (current.title ?? "") as string,
              short_description: (current.short_description ?? "") as string,
              highlights: (current.highlights ?? []) as string[],
              included: (current.included ?? []) as string[],
              not_included: (current.not_included ?? []) as string[],
              base_language: (current.base_language ?? "Russian") as string,
            },
            userId,
          );
          return Response.json(
            { ok: true, tour },
            { status: 200, headers: corsHeaders() },
          );
        } catch (e: any) {
          const message = e?.message ?? "Server error";
          console.error("[retranslate-tour hook]", message);
          const notFound = /not found/i.test(message);
          const forbidden = /(owned|guide profile)/i.test(message);
          const status = notFound ? 404 : forbidden ? 403 : 500;
          return Response.json(
            { error: notFound ? "NotFound" : forbidden ? "Forbidden" : "ServerError", message },
            { status, headers: corsHeaders() },
          );
        }
      },
    },
  },
});

/**
 * Public hook: update the caller's guide.languages (tour delivery languages).
 *
 * Auth: Authorization: Bearer <supabase user JWT>.
 * Body: { languages: string[] } — free-form names (e.g. "English", "Tajik").
 *   - trimmed, deduped (case-insensitive), each 1..80 chars, max 30.
 * Returns: { ok: true, languages: string[] } — the persisted list.
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

const bodySchema = z.object({
  languages: z.array(z.string().min(1).max(80)).max(60),
});

export const Route = createFileRoute("/api/public/hooks/update-my-languages")({
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

        // User-scoped client so RLS applies and the update targets the caller.
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

        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return Response.json(
            { error: "BadRequest", message: "Invalid JSON body" },
            { status: 400, headers: corsHeaders() },
          );
        }
        const parsed = bodySchema.safeParse(raw);
        if (!parsed.success) {
          return Response.json(
            { error: "BadRequest", message: parsed.error.issues[0]?.message ?? "Invalid input" },
            { status: 400, headers: corsHeaders() },
          );
        }

        // Normalize: trim, drop empties, dedupe case-insensitively (keep first casing), cap at 30.
        const seen = new Set<string>();
        const cleaned: string[] = [];
        for (const raw of parsed.data.languages) {
          const v = raw.trim();
          if (!v) continue;
          const k = v.toLowerCase();
          if (seen.has(k)) continue;
          seen.add(k);
          cleaned.push(v);
          if (cleaned.length >= 30) break;
        }

        const { data: updated, error } = await sb
          .from("guides")
          .update({ languages: cleaned })
          .eq("user_id", userId)
          .select("languages")
          .maybeSingle();

        if (error) {
          return Response.json(
            { error: "DBError", message: error.message },
            { status: 400, headers: corsHeaders() },
          );
        }
        if (!updated) {
          return Response.json(
            { error: "NotFound", message: "You are not linked to a guide profile yet." },
            { status: 404, headers: corsHeaders() },
          );
        }

        return Response.json(
          { ok: true, languages: (updated.languages ?? []) as string[] },
          { headers: corsHeaders() },
        );
      },
    },
  },
});

/**
 * Public hook: guide proposes a new city.
 *
 * Auth: Authorization: Bearer <supabase user JWT>. Caller must be linked
 * to a guide profile.
 *
 * POST body: { name: string, region?: string, note?: string }
 * GET response (list): the caller's own suggestions.
 */
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    "Access-Control-Max-Age": "86400",
  };
}

const InputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  region: z.string().trim().max(120).optional(),
  note: z.string().trim().max(500).optional(),
});

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

export const Route = createFileRoute("/api/public/hooks/suggest-city")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders() }),

      GET: async ({ request }) => {
        const auth = await resolveUser(request);
        if ("error" in auth) {
          return Response.json({ error: "Unauthorized", message: auth.error }, { status: auth.status, headers: corsHeaders() });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("city_suggestions")
          .select("id, name, region, note, status, admin_note, created_city_id, created_at, updated_at")
          .eq("user_id", auth.userId)
          .order("created_at", { ascending: false });
        if (error) {
          return Response.json({ error: "ServerError", message: error.message }, { status: 500, headers: corsHeaders() });
        }
        return Response.json({ ok: true, suggestions: data ?? [] }, { status: 200, headers: corsHeaders() });
      },

      POST: async ({ request }) => {
        const auth = await resolveUser(request);
        if ("error" in auth) {
          return Response.json({ error: "Unauthorized", message: auth.error }, { status: auth.status, headers: corsHeaders() });
        }

        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return Response.json({ error: "ValidationError", message: "Invalid JSON" }, { status: 400, headers: corsHeaders() });
        }
        const parsed = InputSchema.safeParse(raw);
        if (!parsed.success) {
          return Response.json(
            { error: "ValidationError", message: parsed.error.issues[0]?.message ?? "Invalid input", issues: parsed.error.issues },
            { status: 400, headers: corsHeaders() },
          );
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Best-effort: link to guide profile if the caller has one.
        const { data: guide } = await supabaseAdmin
          .from("guides")
          .select("id")
          .eq("user_id", auth.userId)
          .maybeSingle();

        // If a city with this name already exists and is approved, short-circuit.
        const { data: existingCity } = await supabaseAdmin
          .from("cities")
          .select("id, name, approved")
          .ilike("name", parsed.data.name)
          .maybeSingle();
        if (existingCity?.approved) {
          return Response.json(
            { ok: true, already_exists: true, city: existingCity },
            { status: 200, headers: corsHeaders() },
          );
        }

        // Prevent duplicate pending suggestions from the same user for the same name.
        const { data: dup } = await supabaseAdmin
          .from("city_suggestions")
          .select("id, status")
          .eq("user_id", auth.userId)
          .ilike("name", parsed.data.name)
          .in("status", ["pending", "approved"])
          .maybeSingle();
        if (dup) {
          return Response.json(
            { ok: true, duplicate: true, suggestion_id: dup.id, status: dup.status },
            { status: 200, headers: corsHeaders() },
          );
        }

        const { data: created, error } = await supabaseAdmin
          .from("city_suggestions")
          .insert({
            user_id: auth.userId,
            guide_id: guide?.id ?? null,
            name: parsed.data.name,
            region: parsed.data.region ?? null,
            note: parsed.data.note ?? null,
            status: "pending",
          })
          .select("id, name, region, note, status, created_at")
          .single();
        if (error) {
          return Response.json({ error: "ServerError", message: error.message }, { status: 500, headers: corsHeaders() });
        }

        return Response.json({ ok: true, suggestion: created }, { status: 200, headers: corsHeaders() });
      },
    },
  },
});

/**
 * Public hooks: guide's private notification email (read + update).
 *
 * `guides.notification_email` is revoked from anon/authenticated, so mobile
 * clients must go through these hooks. Auth by guide JWT; server uses
 * service_role, scoped strictly to auth.uid()'s own guide row.
 *
 * GET  /api/public/hooks/my-notification-email
 *   -> { guide_id, notification_email, auth_email, effective_email }
 * POST /api/public/hooks/my-notification-email  body: { email: string|null }
 *   -> { ok: true, notification_email }
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
  // Empty string / null clears the override and falls back to auth email.
  email: z.string().trim().max(320).email().nullable().or(z.literal("")),
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
  return { userId: data.user.id, email: data.user.email ?? null };
}

export const Route = createFileRoute("/api/public/hooks/my-notification-email")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders() }),

      GET: async ({ request }) => {
        const auth = await resolveUser(request);
        if ("error" in auth) {
          return Response.json(
            { error: "Unauthorized", message: auth.error },
            { status: auth.status, headers: corsHeaders() },
          );
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: guide, error } = await supabaseAdmin
          .from("guides")
          .select("id, notification_email")
          .eq("user_id", auth.userId)
          .maybeSingle();
        if (error) {
          return Response.json({ error: error.message }, { status: 500, headers: corsHeaders() });
        }
        if (!guide) {
          return Response.json({ error: "Guide profile not found" }, { status: 404, headers: corsHeaders() });
        }
        const custom = (guide as { notification_email: string | null }).notification_email;
        return Response.json(
          {
            guide_id: guide.id,
            notification_email: custom,
            auth_email: auth.email,
            effective_email: (custom && custom.trim()) || auth.email,
          },
          { headers: corsHeaders() },
        );
      },

      POST: async ({ request }) => {
        const auth = await resolveUser(request);
        if ("error" in auth) {
          return Response.json(
            { error: "Unauthorized", message: auth.error },
            { status: auth.status, headers: corsHeaders() },
          );
        }
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400, headers: corsHeaders() });
        }
        const parsed = InputSchema.safeParse(body);
        if (!parsed.success) {
          return Response.json(
            { error: "Validation error", details: parsed.error.flatten() },
            { status: 400, headers: corsHeaders() },
          );
        }
        const value =
          parsed.data.email && parsed.data.email.trim()
            ? parsed.data.email.trim().toLowerCase()
            : null;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: updated, error } = await supabaseAdmin
          .from("guides")
          .update({ notification_email: value })
          .eq("user_id", auth.userId)
          .select("id, notification_email")
          .maybeSingle();
        if (error) {
          return Response.json({ error: error.message }, { status: 500, headers: corsHeaders() });
        }
        if (!updated) {
          return Response.json({ error: "Guide profile not found" }, { status: 404, headers: corsHeaders() });
        }
        return Response.json(
          {
            ok: true,
            notification_email: (updated as { notification_email: string | null }).notification_email,
          },
          { headers: corsHeaders() },
        );
      },
    },
  },
});

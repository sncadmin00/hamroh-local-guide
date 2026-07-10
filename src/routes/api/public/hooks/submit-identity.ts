/**
 * Public hook: submit guide identity (passport) for admin review.
 *
 * Mobile flow:
 *   1) client uploads file to Storage bucket `guide-identity` at path
 *      `{guide_id}/passport-{timestamp}.{ext}` (RLS enforces the folder = guide_id).
 *   2) client calls POST /api/public/hooks/submit-identity with:
 *        { phone: "+998...", passport_path: "{guide_id}/passport-....jpg" }
 *
 * Server resets `identity_verified=false`, sets `identity_submitted_at=now()`,
 * clears `identity_rejected_reason`. Uses service_role, so the
 * `prevent_guide_trust_field_tampering` trigger is bypassed (auth.uid() IS NULL).
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

const InputSchema = z.object({
  phone: z.string().trim().min(5).max(40),
  passport_path: z.string().trim().min(1).max(500),
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

export const Route = createFileRoute("/api/public/hooks/submit-identity")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders() }),

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

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: guide, error: gerr } = await supabaseAdmin
          .from("guides")
          .select("id")
          .eq("user_id", auth.userId)
          .maybeSingle();
        if (gerr) {
          return Response.json({ error: gerr.message }, { status: 500, headers: corsHeaders() });
        }
        if (!guide) {
          return Response.json({ error: "Guide profile not found" }, { status: 404, headers: corsHeaders() });
        }

        const prefix = `${guide.id}/`;
        if (!parsed.data.passport_path.startsWith(prefix)) {
          return Response.json(
            { error: "passport_path must start with '{guide_id}/'" },
            { status: 400, headers: corsHeaders() },
          );
        }

        const { error: uerr } = await supabaseAdmin
          .from("guides")
          .update({
            identity_phone: parsed.data.phone,
            identity_passport_url: parsed.data.passport_path,
            identity_submitted_at: new Date().toISOString(),
            identity_verified: false,
            identity_rejected_reason: null,
          })
          .eq("id", guide.id);
        if (uerr) {
          return Response.json({ error: uerr.message }, { status: 500, headers: corsHeaders() });
        }

        return Response.json({ ok: true, guide_id: guide.id }, { headers: corsHeaders() });
      },
    },
  },
});

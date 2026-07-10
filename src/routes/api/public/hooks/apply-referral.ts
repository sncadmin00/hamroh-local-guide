/**
 * POST /api/public/hooks/apply-referral
 * Authenticated. Body: { code: string }
 *
 * Records the referrer for the current user. First-touch wins — once a user
 * has a referrer, calling this again is a no-op.
 *
 * Errors:
 *   400 InvalidCode            — code not found
 *   400 SelfReferral           — user's own code
 *   409 AlreadyReferred        — user already has a referrer (returns existing)
 *
 * Response 200:
 *   { ok: true, status: 'pending'|'qualified'|'rewarded' }
 */
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const cors: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

const InputSchema = z.object({
  code: z.string().trim().min(4).max(32),
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

export const Route = createFileRoute("/api/public/hooks/apply-referral")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      POST: async ({ request }) => {
        const auth = await resolveUser(request);
        if ("error" in auth) {
          return Response.json({ error: "Unauthorized", message: auth.error }, { status: auth.status, headers: cors });
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400, headers: cors });
        }
        const parsed = InputSchema.safeParse(body);
        if (!parsed.success) {
          return Response.json(
            { error: "Validation error", details: parsed.error.flatten() },
            { status: 400, headers: cors },
          );
        }
        const code = parsed.data.code.toUpperCase();

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Already referred?
        const { data: existing } = await supabaseAdmin
          .from("user_referrals")
          .select("id, status")
          .eq("referred_user_id", auth.userId)
          .maybeSingle();
        if (existing) {
          return Response.json(
            { error: "AlreadyReferred", status: (existing as { status: string }).status },
            { status: 409, headers: cors },
          );
        }

        // Resolve code -> referrer
        const { data: codeRow } = await supabaseAdmin
          .from("user_referral_codes")
          .select("user_id")
          .eq("code", code)
          .maybeSingle();
        if (!codeRow) {
          return Response.json({ error: "InvalidCode" }, { status: 400, headers: cors });
        }
        const referrerId = (codeRow as { user_id: string }).user_id;
        if (referrerId === auth.userId) {
          return Response.json({ error: "SelfReferral" }, { status: 400, headers: cors });
        }

        const { error: insErr } = await supabaseAdmin
          .from("user_referrals")
          .insert({
            referrer_user_id: referrerId,
            referred_user_id: auth.userId,
            status: "pending",
          });
        if (insErr) {
          return Response.json({ error: insErr.message }, { status: 500, headers: cors });
        }

        return Response.json({ ok: true, status: "pending" }, { headers: cors });
      },
    },
  },
});

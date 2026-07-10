/**
 * Public hook: submit guide license (photo or PDF) for admin review.
 *
 * Mobile flow:
 *   1) client uploads file to Storage bucket `guide-identity` at path
 *      `{guide_id}/license-{timestamp}.{ext}` (jpg/png/pdf).
 *   2) client calls POST /api/public/hooks/submit-license with:
 *        { license_path: "{guide_id}/license-....pdf" }
 *
 * Server resets `licensed=false`, clears `licensed_at`, sets `license_url`.
 * Admin later flips `licensed=true` from the applications review UI.
 * Uses service_role, so the tampering trigger is bypassed.
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
  license_path: z.string().trim().min(1).max(500),
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

export const Route = createFileRoute("/api/public/hooks/submit-license")({
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
          .select("id, name, slug")
          .eq("user_id", auth.userId)
          .maybeSingle();
        if (gerr) {
          return Response.json({ error: gerr.message }, { status: 500, headers: corsHeaders() });
        }
        if (!guide) {
          return Response.json({ error: "Guide profile not found" }, { status: 404, headers: corsHeaders() });
        }

        const prefix = `${guide.id}/`;
        if (!parsed.data.license_path.startsWith(prefix)) {
          return Response.json(
            { error: "license_path must start with '{guide_id}/'" },
            { status: 400, headers: corsHeaders() },
          );
        }

        const { error: uerr } = await supabaseAdmin
          .from("guides")
          .update({
            license_url: parsed.data.license_path,
            licensed: false,
            licensed_at: null,
          })
          .eq("id", guide.id);
        if (uerr) {
          return Response.json({ error: uerr.message }, { status: 500, headers: corsHeaders() });
        }

        // Notify admins (best-effort).
        try {
          const { data: admins } = await supabaseAdmin
            .from("user_roles")
            .select("user_id")
            .eq("role", "admin");
          const rows = (admins ?? []).map((a: { user_id: string }) => ({
            user_id: a.user_id,
            type: "license_review",
            title: "New license submitted for review",
            body: `${guide.name ?? "Guide"} submitted a license document.`,
            link: `/admin?tab=applications`,
          }));
          if (rows.length > 0) {
            await supabaseAdmin.from("notifications").insert(rows);
          }
        } catch {
          // ignore notification failures
        }

        return Response.json({ ok: true, guide_id: guide.id }, { headers: corsHeaders() });
      },
    },
  },
});

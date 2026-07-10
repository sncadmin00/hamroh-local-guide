/**
 * Public hook: read the guide's own verification status + signed URLs.
 *
 * GET /api/public/hooks/my-verification
 * -> {
 *   guide_id,
 *   identity: { verified, phone, submitted_at, rejected_reason, passport_signed_url },
 *   license:  { licensed, licensed_at, license_signed_url },
 *   intro_video: { verified, submitted_at, rejected_reason, video_signed_url }
 * }
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

export const Route = createFileRoute("/api/public/hooks/my-verification")({
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
        const { data: g, error } = await supabaseAdmin
          .from("guides")
          .select(
            "id, identity_verified, identity_phone, identity_passport_url, identity_submitted_at, identity_rejected_reason, licensed, licensed_at, license_url, intro_video_url, intro_video_verified, intro_video_submitted_at, intro_video_rejected_reason",
          )
          .eq("user_id", auth.userId)
          .maybeSingle();
        if (error) {
          return Response.json({ error: error.message }, { status: 500, headers: corsHeaders() });
        }
        if (!g) {
          return Response.json({ error: "Guide profile not found" }, { status: 404, headers: corsHeaders() });
        }

        const sign = async (bucket: string, path: string | null) => {
          if (!path) return null;
          const { data } = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, 3600);
          return data?.signedUrl ?? null;
        };

        const [passport_signed_url, license_signed_url, video_signed_url] = await Promise.all([
          sign("guide-identity", g.identity_passport_url),
          sign("guide-identity", g.license_url),
          sign("guide-intro-videos", g.intro_video_url),
        ]);

        return Response.json(
          {
            guide_id: g.id,
            identity: {
              verified: !!g.identity_verified,
              phone: g.identity_phone,
              submitted_at: g.identity_submitted_at,
              rejected_reason: g.identity_rejected_reason,
              passport_signed_url,
            },
            license: {
              licensed: !!g.licensed,
              licensed_at: g.licensed_at,
              license_signed_url,
            },
            intro_video: {
              verified: !!g.intro_video_verified,
              submitted_at: g.intro_video_submitted_at,
              rejected_reason: g.intro_video_rejected_reason,
              video_signed_url,
            },
          },
          { headers: corsHeaders() },
        );
      },
    },
  },
});

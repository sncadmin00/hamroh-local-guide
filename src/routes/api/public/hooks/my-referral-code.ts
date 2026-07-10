/**
 * GET /api/public/hooks/my-referral-code
 * Authenticated. Returns the current user's referral code (creates one on first call).
 *
 * Response:
 *   { code: string, deeplink: string, web_url: string }
 */
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const cors: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

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

export const Route = createFileRoute("/api/public/hooks/my-referral-code")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      GET: async ({ request }) => {
        const auth = await resolveUser(request);
        if ("error" in auth) {
          return Response.json({ error: "Unauthorized", message: auth.error }, { status: auth.status, headers: cors });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Try fetch existing
        const { data: existing } = await supabaseAdmin
          .from("user_referral_codes")
          .select("code")
          .eq("user_id", auth.userId)
          .maybeSingle();

        let code = (existing as { code: string } | null)?.code ?? null;

        if (!code) {
          // Generate via SQL helper (retries on collision inside the function)
          const { data: gen, error: genErr } = await supabaseAdmin
            .rpc("generate_user_referral_code");
          if (genErr) {
            return Response.json({ error: genErr.message }, { status: 500, headers: cors });
          }
          code = gen as unknown as string;
          const { error: insErr } = await supabaseAdmin
            .from("user_referral_codes")
            .insert({ user_id: auth.userId, code });
          // Race: another request may have created it — re-read
          if (insErr) {
            const { data: retry } = await supabaseAdmin
              .from("user_referral_codes")
              .select("code")
              .eq("user_id", auth.userId)
              .maybeSingle();
            code = (retry as { code: string } | null)?.code ?? code;
          }
        }

        return Response.json(
          {
            code,
            deeplink: `hamrohmobile://ref/${code}`,
            web_url: `https://hamrohim.com/?ref=${code}`,
          },
          { headers: cors },
        );
      },
    },
  },
});

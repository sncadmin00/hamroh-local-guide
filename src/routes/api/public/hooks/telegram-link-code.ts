/**
 * POST /api/public/hooks/telegram-link-code
 * Auth: Bearer <supabase access_token>
 * Body: none
 * Response: { code, start_param, expires_at }
 *
 * Mobile flow:
 * 1. Call this hook to get `start_param` (e.g. "link_ABCD1234").
 * 2. Open `https://t.me/<bot_username>?start=<start_param>` (deep link).
 * 3. In Telegram bot the /start handler consumes the code and binds
 *    telegram_accounts.user_id = <this user>.
 */
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

async function resolveUser(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) return { error: "Missing bearer token", status: 401 as const };
  const url = process.env.SUPABASE_URL!;
  const pk = process.env.SUPABASE_PUBLISHABLE_KEY!;
  const auth = createClient(url, pk, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
  });
  const { data, error } = await auth.auth.getUser(token);
  if (error || !data?.user) return { error: "Invalid or expired token", status: 401 as const };
  return { userId: data.user.id };
}

function generateCode() {
  // 8 chars, URL-safe, no ambiguous chars.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(8);
  let out = "";
  for (let i = 0; i < 8; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

export const Route = createFileRoute("/api/public/hooks/telegram-link-code")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      POST: async ({ request }) => {
        const auth = await resolveUser(request);
        if ("error" in auth) {
          return Response.json({ error: auth.error }, { status: auth.status, headers: cors });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        // Try a few times in the astronomically unlikely case of collision.
        let code = "";
        for (let attempt = 0; attempt < 5; attempt++) {
          code = generateCode();
          const { error } = await supabaseAdmin
            .from("telegram_link_codes")
            .insert({ code, user_id: auth.userId, expires_at: expiresAt });
          if (!error) break;
          if (attempt === 4) {
            return Response.json({ error: error.message }, { status: 500, headers: cors });
          }
        }
        return Response.json(
          {
            code,
            start_param: `link_${code}`,
            expires_at: expiresAt,
          },
          { headers: cors },
        );
      },
    },
  },
});

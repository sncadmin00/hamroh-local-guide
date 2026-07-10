/**
 * POST /api/public/hooks/telegram-signin-start
 * No auth required (public — this is the sign-in flow).
 * Body: none
 * Response: { nonce, start_param, expires_at }
 *
 * Mobile flow:
 * 1. Call to obtain a `start_param` (e.g. "login_...") and nonce.
 * 2. Open `https://t.me/<bot_username>?start=<start_param>`.
 * 3. Poll `/api/public/hooks/telegram-signin-poll` with { nonce } until it
 *    returns { action_link }. Open that URL in the in-app browser — Supabase
 *    completes the magic-link sign-in and returns tokens the app can capture.
 *
 * The nonce lives for 10 minutes and is single-use.
 */
import { createFileRoute } from "@tanstack/react-router";
import { randomBytes } from "crypto";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

export const Route = createFileRoute("/api/public/hooks/telegram-signin-start")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      POST: async () => {
        const nonce = randomBytes(24).toString("base64url");
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin
          .from("telegram_signin_nonces")
          .insert({ nonce, expires_at: expiresAt });
        if (error) {
          return Response.json({ error: error.message }, { status: 500, headers: cors });
        }
        return Response.json(
          { nonce, start_param: `login_${nonce}`, expires_at: expiresAt },
          { headers: cors },
        );
      },
    },
  },
});

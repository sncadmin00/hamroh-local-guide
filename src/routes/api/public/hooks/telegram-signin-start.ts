/**
 * POST /api/public/hooks/telegram-signin-start
 * No auth required (public — this is the sign-in flow).
 * Body: { platform?: string } — short human label (e.g. "iOS", "Android", "Web").
 *   The bot echoes this back to the user so they can verify what they're
 *   approving. It is untrusted metadata — displayed only, never used for auth.
 * Response: { nonce, start_param, expires_at }
 *
 * Mobile flow:
 * 1. Call to obtain a `start_param` (e.g. "login_...") and nonce.
 * 2. Open `https://t.me/<bot_username>?start=<start_param>`.
 * 3. Bot posts a confirmation message with the platform label; user taps
 *    "Confirm" or "This wasn't me".
 * 4. Poll `/api/public/hooks/telegram-signin-poll` with { nonce } until it
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
      POST: async ({ request }) => {
        let platform: string | null = null;
        let redirectTo: string | null = null;
        try {
          const body = await request.json();
          if (body && typeof body.platform === "string") {
            platform = body.platform.trim().slice(0, 40) || null;
          }
          if (body && typeof body.redirect_to === "string") {
            const v = body.redirect_to.trim().slice(0, 500);
            const allowed = [
              "https://hamrohim.com/",
              "https://www.hamrohim.com/",
              "https://hamroh-local-guide.lovable.app/",
              "hamrohmobile://",
            ];
            if (allowed.some((p) => v.startsWith(p))) redirectTo = v;
          }
        } catch {
          // no body — fine
        }
        const nonce = randomBytes(24).toString("base64url");
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin
          .from("telegram_signin_nonces")
          .insert({ nonce, expires_at: expiresAt, platform, redirect_to: redirectTo });
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

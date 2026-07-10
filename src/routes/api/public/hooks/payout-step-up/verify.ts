/**
 * POST /api/public/hooks/payout-step-up/verify
 * Auth: Bearer <user JWT>.
 * Body: { challenge_id: string, code: string }
 * Response: { step_up_token: string, expires_at: string, purpose: string }
 *
 * Verifies the 6-digit code sent by /payout-step-up/start and returns a
 * short-lived (5 min) opaque step_up_token bound to (user, purpose).
 *
 * Downstream sensitive hooks (updatePayoutDetails, requestPayout) MUST call
 * `consumeStepUpToken(userId, token, purpose)` from
 * `@/lib/payout-step-up.server` — the token is single-use and expires quickly.
 *
 * Attempt limit: 5 tries per challenge. Wrong code increments `attempts`;
 * exceeding the limit marks the challenge consumed.
 */
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { createHash, randomBytes, timingSafeEqual } from "crypto";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

const TOKEN_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function hashCode(userId: string, code: string): string {
  return createHash("sha256").update(`${userId}:${code}`).digest("hex");
}
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
function safeStrEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export const Route = createFileRoute("/api/public/hooks/payout-step-up/verify")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      POST: async ({ request }) => {
        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.toLowerCase().startsWith("bearer ")
          ? authHeader.slice(7).trim()
          : "";
        if (!token) {
          return Response.json({ error: "Unauthorized" }, { status: 401, headers: cors });
        }

        let body: { challenge_id?: string; code?: string } = {};
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON body" }, { status: 400, headers: cors });
        }
        const challengeId = String(body?.challenge_id ?? "");
        const code = String(body?.code ?? "").trim();
        if (!challengeId || !/^\d{6}$/.test(code)) {
          return Response.json(
            { error: "Invalid input", message: "challenge_id and 6-digit code required" },
            { status: 400, headers: cors },
          );
        }

        const url = process.env.SUPABASE_URL;
        const pk = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!url || !pk) {
          return Response.json({ error: "ServerError" }, { status: 500, headers: cors });
        }
        const sb = createClient(url, pk, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
        });
        const { data: userRes, error: userErr } = await sb.auth.getUser(token);
        if (userErr || !userRes?.user) {
          return Response.json({ error: "Unauthorized" }, { status: 401, headers: cors });
        }
        const userId = userRes.user.id;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: ch } = await supabaseAdmin
          .from("payout_change_challenges")
          .select("id, user_id, purpose, code_hash, attempts, expires_at, consumed_at")
          .eq("id", challengeId)
          .maybeSingle();
        if (!ch || ch.user_id !== userId) {
          return Response.json(
            { error: "NotFound", message: "Challenge not found" },
            { status: 404, headers: cors },
          );
        }
        if (ch.consumed_at) {
          return Response.json(
            { error: "Consumed", message: "This challenge has already been used." },
            { status: 409, headers: cors },
          );
        }
        if (new Date(ch.expires_at).getTime() < Date.now()) {
          return Response.json(
            { error: "Expired", message: "Code expired. Request a new one." },
            { status: 410, headers: cors },
          );
        }
        if ((ch.attempts ?? 0) >= MAX_ATTEMPTS) {
          await supabaseAdmin
            .from("payout_change_challenges")
            .update({ consumed_at: new Date().toISOString() })
            .eq("id", ch.id);
          return Response.json(
            { error: "TooManyAttempts", message: "Too many wrong codes. Request a new one." },
            { status: 429, headers: cors },
          );
        }

        const expected = hashCode(userId, code);
        if (!safeStrEqual(expected, ch.code_hash)) {
          await supabaseAdmin
            .from("payout_change_challenges")
            .update({ attempts: (ch.attempts ?? 0) + 1 })
            .eq("id", ch.id);
          return Response.json(
            { error: "InvalidCode", message: "Wrong code." },
            { status: 401, headers: cors },
          );
        }

        const rawToken = randomBytes(32).toString("base64url");
        const tokenExpiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();
        const nowIso = new Date().toISOString();
        const { error: updErr } = await supabaseAdmin
          .from("payout_change_challenges")
          .update({
            verified_at: nowIso,
            consumed_at: nowIso,
            token_hash: hashToken(rawToken),
            token_expires_at: tokenExpiresAt,
          })
          .eq("id", ch.id);
        if (updErr) {
          return Response.json(
            { error: "DBError", message: updErr.message },
            { status: 500, headers: cors },
          );
        }

        return Response.json(
          {
            step_up_token: rawToken,
            expires_at: tokenExpiresAt,
            purpose: ch.purpose,
          },
          { headers: cors },
        );
      },
    },
  },
});

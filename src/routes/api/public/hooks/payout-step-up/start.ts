/**
 * POST /api/public/hooks/payout-step-up/start
 * Auth: Bearer <user JWT>.
 * Body: { purpose: "update_payout_details" | "request_payout" }
 * Response: { challenge_id, expires_at, delivery: "telegram" }
 *
 * Sends a 6-digit confirmation code to the caller's linked Telegram chat.
 * The code is required by /payout-step-up/verify to mint a short-lived
 * step_up_token that mobile must pass into updatePayoutDetails / requestPayout.
 *
 * Requires the caller to have a linked Telegram account (via
 * /telegram-link-code flow). No SMS fallback yet.
 */
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { createHash, randomInt } from "crypto";
import { sendTelegramMessage } from "@/lib/telegram-notifications.server";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

const ALLOWED_PURPOSES = new Set(["update_payout_details", "request_payout"]);
const CODE_TTL_MS = 10 * 60 * 1000;
const RATE_WINDOW_MS = 60 * 1000;

function hashCode(userId: string, code: string): string {
  return createHash("sha256").update(`${userId}:${code}`).digest("hex");
}

export const Route = createFileRoute("/api/public/hooks/payout-step-up/start")({
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

        let body: { purpose?: string } = {};
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON body" }, { status: 400, headers: cors });
        }
        const purpose = String(body?.purpose ?? "");
        if (!ALLOWED_PURPOSES.has(purpose)) {
          return Response.json(
            { error: "Invalid purpose", allowed: [...ALLOWED_PURPOSES] },
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

        // Rate-limit: at most one active challenge per user per minute.
        const { data: recent } = await supabaseAdmin
          .from("payout_change_challenges")
          .select("id, created_at")
          .eq("user_id", userId)
          .gte("created_at", new Date(Date.now() - RATE_WINDOW_MS).toISOString())
          .limit(1);
        if (recent && recent.length > 0) {
          return Response.json(
            { error: "RateLimited", message: "Please wait a minute before requesting a new code." },
            { status: 429, headers: cors },
          );
        }

        // Require a linked Telegram chat.
        const { data: tg } = await supabaseAdmin
          .from("telegram_accounts")
          .select("telegram_chat_id")
          .eq("user_id", userId)
          .maybeSingle();
        const chatId = tg?.telegram_chat_id;
        if (!chatId) {
          return Response.json(
            {
              error: "TelegramNotLinked",
              message:
                "Link your Telegram account first to receive step-up confirmation codes.",
            },
            { status: 409, headers: cors },
          );
        }

        const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
        const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();

        const { data: inserted, error: insErr } = await supabaseAdmin
          .from("payout_change_challenges")
          .insert({
            user_id: userId,
            purpose,
            code_hash: hashCode(userId, code),
            expires_at: expiresAt,
            delivery_channel: "telegram",
          })
          .select("id, expires_at")
          .single();
        if (insErr || !inserted) {
          return Response.json(
            { error: "DBError", message: insErr?.message ?? "insert failed" },
            { status: 500, headers: cors },
          );
        }

        const label =
          purpose === "update_payout_details"
            ? "changing your payout details"
            : "requesting a payout";
        await sendTelegramMessage(
          chatId,
          `🔐 <b>Confirm payout action</b>\nYou are ${label}.\n\nConfirmation code: <code>${code}</code>\nExpires in 10 minutes.\n\nIf this wasn't you, ignore this message and change your password immediately.`,
        );

        return Response.json(
          {
            challenge_id: inserted.id,
            expires_at: inserted.expires_at,
            delivery: "telegram",
          },
          { headers: cors },
        );
      },
    },
  },
});

import { createClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";
import {
  deriveTelegramWebhookSecret,
  safeEqual,
  sendTelegramMessage,
} from "@/lib/telegram-notifications.server";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const Route = createFileRoute("/api/public/telegram/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        const supabaseUrl = process.env.SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!token || !supabaseUrl || !serviceKey) {
          return Response.json({ error: "Server misconfigured" }, { status: 500 });
        }

        const actualSecret = request.headers.get("X-Telegram-Bot-Api-Secret-Token") ?? "";
        if (!safeEqual(actualSecret, deriveTelegramWebhookSecret(token))) {
          return new Response("Unauthorized", { status: 401 });
        }

        const update = await request.json();
        const message = update.message ?? update.edited_message;
        const chatId = message?.chat?.id;
        const telegramUserId = message?.from?.id;
        if (!chatId || !telegramUserId) return Response.json({ ok: true, ignored: true });

        const supabase = createClient(supabaseUrl, serviceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        await supabase.from("telegram_accounts").upsert(
          {
            telegram_user_id: telegramUserId,
            telegram_chat_id: chatId,
            telegram_username: message.from?.username ?? null,
            first_name: message.from?.first_name ?? null,
            last_name: message.from?.last_name ?? null,
          },
          { onConflict: "telegram_user_id" },
        );

        const text = typeof message.text === "string" ? message.text.trim() : "";
        if (emailPattern.test(text)) {
          await supabase
            .from("telegram_accounts")
            .update({ email: text.toLowerCase() })
            .eq("telegram_user_id", telegramUserId);
          await sendTelegramMessage(chatId, "Email saved. Booking notifications will also be sent there.");
        } else if (text === "/start" || text.toLowerCase().includes("email")) {
          await sendTelegramMessage(chatId, "Telegram is linked for booking updates. Send your email here if you want duplicate email notifications.");
        }

        return Response.json({ ok: true });
      },
    },
  },
});
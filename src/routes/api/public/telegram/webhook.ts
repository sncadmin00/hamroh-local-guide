import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";
import {
  deriveTelegramWebhookSecret,
  safeEqual,
  sendTelegramMessage,
} from "@/lib/telegram-notifications.server";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TELEGRAM_EMAIL_DOMAIN = "telegram.hamrohim.com";

function telegramEmail(telegramUserId: number) {
  return `telegram-${telegramUserId}@${TELEGRAM_EMAIL_DOMAIN}`;
}

async function handleLinkCode(
  supabase: SupabaseClient,
  code: string,
  telegramUserId: number,
  chatId: number,
  from: { username?: string; first_name?: string; last_name?: string },
): Promise<string> {
  const now = new Date();
  const { data: row, error } = await supabase
    .from("telegram_link_codes")
    .select("code, user_id, expires_at, consumed_at")
    .eq("code", code)
    .maybeSingle();
  if (error || !row) return "This linking code is invalid.";
  if (row.consumed_at) return "This linking code has already been used.";
  if (new Date(row.expires_at).getTime() < now.getTime()) return "This linking code has expired. Request a new one in the app.";

  // Ensure this Telegram account isn't already linked to another user.
  const { data: existing } = await supabase
    .from("telegram_accounts")
    .select("user_id")
    .eq("telegram_user_id", telegramUserId)
    .maybeSingle();
  if (existing?.user_id && existing.user_id !== row.user_id) {
    return "This Telegram account is already linked to another user.";
  }

  await supabase.from("telegram_accounts").upsert(
    {
      user_id: row.user_id,
      telegram_user_id: telegramUserId,
      telegram_chat_id: chatId,
      telegram_username: from.username ?? null,
      first_name: from.first_name ?? null,
      last_name: from.last_name ?? null,
    },
    { onConflict: "telegram_user_id" },
  );

  await supabase
    .from("telegram_link_codes")
    .update({ consumed_at: now.toISOString(), telegram_user_id: telegramUserId })
    .eq("code", code);

  return "✅ Telegram is linked. You'll get booking notifications here.";
}

async function handleLoginNonce(
  supabase: SupabaseClient,
  nonce: string,
  telegramUserId: number,
  chatId: number,
  from: { username?: string; first_name?: string; last_name?: string; photo_url?: string },
): Promise<string> {
  const now = new Date();
  const { data: row } = await supabase
    .from("telegram_signin_nonces")
    .select("nonce, expires_at, consumed_at, action_link")
    .eq("nonce", nonce)
    .maybeSingle();
  if (!row) return "This sign-in code is invalid.";
  if (row.consumed_at || row.action_link) return "This sign-in code has already been used.";
  if (new Date(row.expires_at).getTime() < now.getTime()) return "This sign-in code has expired. Request a new one in the app.";

  // Find or create the Supabase user for this Telegram account.
  const { data: existingAccount } = await supabase
    .from("telegram_accounts")
    .select("user_id")
    .eq("telegram_user_id", telegramUserId)
    .maybeSingle();

  let userId = existingAccount?.user_id ?? null;
  let email = telegramEmail(telegramUserId);

  if (userId) {
    const { data: existingUser } = await (supabase as SupabaseClient).auth.admin.getUserById(userId);
    email = existingUser.user?.email ?? email;
  } else {
    const password = crypto.randomUUID() + crypto.randomUUID();
    const { data: created, error: createError } = await (supabase as SupabaseClient).auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        provider: "telegram",
        telegram_user_id: telegramUserId,
        first_name: from.first_name,
        last_name: from.last_name,
        username: from.username,
        photo_url: from.photo_url,
      },
    });
    if (createError && !createError.message.toLowerCase().includes("already")) {
      return `Sign-in failed: ${createError.message}`;
    }
    userId = created?.user?.id ?? null;
  }

  await supabase.from("telegram_accounts").upsert(
    {
      user_id: userId,
      telegram_user_id: telegramUserId,
      telegram_chat_id: chatId,
      telegram_username: from.username ?? null,
      first_name: from.first_name ?? null,
      last_name: from.last_name ?? null,
      photo_url: from.photo_url ?? null,
    },
    { onConflict: "telegram_user_id" },
  );

  const { data: link, error: linkError } = await (supabase as SupabaseClient).auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: "https://hamrohim.com/login" },
  });
  if (linkError || !link.properties?.action_link) {
    return `Sign-in failed: ${linkError?.message ?? "no action link"}`;
  }

  await supabase
    .from("telegram_signin_nonces")
    .update({ action_link: link.properties.action_link, telegram_user_id: telegramUserId })
    .eq("nonce", nonce);

  return "✅ Sign-in confirmed. Return to the Hamroh app — it will finish signing you in.";
}

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

        // /start <payload> — deep-link linking or sign-in.
        const startMatch = text.match(/^\/start(?:@\w+)?\s+(\S+)/i);
        if (startMatch) {
          const payload = startMatch[1];
          const from = {
            username: message.from?.username,
            first_name: message.from?.first_name,
            last_name: message.from?.last_name,
            photo_url: undefined as string | undefined,
          };
          if (payload.startsWith("link_")) {
            const reply = await handleLinkCode(supabase, payload.slice(5), telegramUserId, chatId, from);
            await sendTelegramMessage(chatId, reply);
            return Response.json({ ok: true });
          }
          if (payload.startsWith("login_")) {
            const reply = await handleLoginNonce(supabase, payload.slice(6), telegramUserId, chatId, from);
            await sendTelegramMessage(chatId, reply);
            return Response.json({ ok: true });
          }
        }

        if (emailPattern.test(text)) {
          await supabase
            .from("telegram_accounts")
            .update({ email: text.toLowerCase() })
            .eq("telegram_user_id", telegramUserId);
          await sendTelegramMessage(chatId, "Email saved. Booking notifications will also be sent there.");
        } else if (text === "/start" || text.toLowerCase().includes("email")) {
          await sendTelegramMessage(
            chatId,
            "Telegram is linked for booking updates. Send your email here if you want duplicate email notifications.",
          );
        }

        return Response.json({ ok: true });
      },
    },
  },
});

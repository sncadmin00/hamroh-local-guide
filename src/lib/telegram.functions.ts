import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { callTelegramApi, verifyTelegramLoginPayload } from "@/lib/telegram-notifications.server";

const TELEGRAM_EMAIL_DOMAIN = "telegram.hamrohim.com";

const telegramLoginSchema = z.object({
  id: z.number().int().positive(),
  first_name: z.string().max(255).optional(),
  last_name: z.string().max(255).optional(),
  username: z.string().max(255).optional(),
  photo_url: z.string().url().optional(),
  auth_date: z.number().int().positive(),
  hash: z.string().min(32),
});

type TelegramMe = { username?: string };

function telegramEmail(telegramUserId: number) {
  return `telegram-${telegramUserId}@${TELEGRAM_EMAIL_DOMAIN}`;
}

function isInternalTelegramEmail(email: string | null | undefined) {
  return !!email && email.endsWith(`@${TELEGRAM_EMAIL_DOMAIN}`);
}

export const getTelegramBotUsername = createServerFn({ method: "GET" }).handler(async () => {
  const me = await callTelegramApi<TelegramMe>("getMe", {});
  if (!me.username) throw new Error("Telegram bot username is not configured");
  return me.username;
});

export const signInWithTelegram = createServerFn({ method: "POST" })
  .inputValidator((input) => telegramLoginSchema.parse(input))
  .handler(async ({ data }) => {
    if (!verifyTelegramLoginPayload(data)) {
      throw new Error("Telegram sign-in verification failed");
    }

    const { data: existingAccount } = await supabaseAdmin
      .from("telegram_accounts")
      .select("user_id")
      .eq("telegram_user_id", data.id)
      .maybeSingle();

    let email = telegramEmail(data.id);
    let userId = existingAccount?.user_id ?? null;

    if (userId) {
      const { data: existingUser } = await supabaseAdmin.auth.admin.getUserById(userId);
      email = existingUser.user?.email ?? email;
    } else {
      const password = crypto.randomUUID() + crypto.randomUUID();
      const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          provider: "telegram",
          telegram_user_id: data.id,
          first_name: data.first_name,
          last_name: data.last_name,
          username: data.username,
          photo_url: data.photo_url,
        },
      });
      if (createError && !createError.message.toLowerCase().includes("already")) {
        throw new Error(createError.message);
      }
      userId = created.user?.id ?? null;
    }

    await supabaseAdmin.from("telegram_accounts").upsert(
      {
        user_id: userId,
        telegram_user_id: data.id,
        telegram_chat_id: data.id,
        telegram_username: data.username ?? null,
        first_name: data.first_name ?? null,
        last_name: data.last_name ?? null,
        photo_url: data.photo_url ?? null,
      },
      { onConflict: "telegram_user_id" },
    );

    const { data: link, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo: "https://hamrohim.com/login" },
    });
    if (linkError) throw new Error(linkError.message);

    const actionLink = link.properties?.action_link;
    if (!actionLink) throw new Error("Could not create Telegram sign-in link");
    return { actionLink };
  });

export const linkTelegramAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => telegramLoginSchema.parse(input))
  .handler(async ({ context, data }) => {
    if (!verifyTelegramLoginPayload(data)) {
      throw new Error("Telegram verification failed");
    }

    const { data: existing } = await supabaseAdmin
      .from("telegram_accounts")
      .select("user_id")
      .eq("telegram_user_id", data.id)
      .maybeSingle();
    if (existing?.user_id && existing.user_id !== context.userId) {
      throw new Error("This Telegram account is already linked to another user");
    }

    await supabaseAdmin.from("telegram_accounts").upsert(
      {
        user_id: context.userId,
        telegram_user_id: data.id,
        telegram_chat_id: data.id,
        telegram_username: data.username ?? null,
        first_name: data.first_name ?? null,
        last_name: data.last_name ?? null,
        photo_url: data.photo_url ?? null,
      },
      { onConflict: "telegram_user_id" },
    );
    return { ok: true };
  });

export const getMyTelegramAccount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("telegram_accounts")
      .select("telegram_user_id, telegram_chat_id, telegram_username, first_name, last_name, email")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);

    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    return {
      account: data,
      authEmail: isInternalTelegramEmail(authUser.user?.email) ? null : authUser.user?.email ?? null,
    };
  });

export const updateMyTelegramEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ email: z.string().email().or(z.literal("")) }).parse(input))
  .handler(async ({ context, data }) => {
    const email = data.email.trim() || null;
    const { error } = await supabaseAdmin
      .from("telegram_accounts")
      .update({ email })
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
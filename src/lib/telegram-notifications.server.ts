import { createHash, createHmac, timingSafeEqual } from "crypto";

const APP_BASE_URL = "https://hamrohim.com";

export type TelegramLoginPayload = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
};

type TelegramApiResponse<T> = {
  ok: boolean;
  result?: T;
  description?: string;
};

export function getTelegramBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("Telegram bot token is not configured");
  return token;
}

export function deriveTelegramWebhookSecret(token = getTelegramBotToken()): string {
  return createHash("sha256")
    .update(`telegram-webhook:${token}`)
    .digest("base64url");
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function verifyTelegramLoginPayload(payload: TelegramLoginPayload): boolean {
  const { hash, ...data } = payload;
  if (!hash || !data.id || !data.auth_date) return false;

  const ageSeconds = Math.floor(Date.now() / 1000) - Number(data.auth_date);
  if (ageSeconds < 0 || ageSeconds > 24 * 60 * 60) return false;

  const checkString = Object.entries(data)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = createHash("sha256").update(getTelegramBotToken()).digest();
  const expected = createHmac("sha256", secretKey).update(checkString).digest("hex");
  return safeEqual(expected, hash);
}

export async function callTelegramApi<T>(method: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`https://api.telegram.org/bot${getTelegramBotToken()}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = (await response.json()) as TelegramApiResponse<T>;
  if (!response.ok || !result.ok) {
    throw new Error(`Telegram API ${method} failed: ${result.description ?? response.statusText}`);
  }
  return result.result as T;
}

export async function sendTelegramMessage(chatId: number | string | null | undefined, text: string): Promise<boolean> {
  if (!chatId) return false;
  try {
    await callTelegramApi("sendMessage", {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });
    return true;
  } catch (error) {
    console.error("Telegram notification failed", error);
    return false;
  }
}

export function bookingDetailsText(parts: {
  title: string;
  customerName?: string | null;
  guideName?: string | null;
  experience: string;
  date: string;
  startTime?: string | null;
  guests?: number | null;
  status?: string | null;
  reason?: string | null;
  url?: string;
}) {
  const lines = [
    `<b>${parts.title}</b>`,
    parts.guideName ? `Guide: ${parts.guideName}` : null,
    parts.customerName ? `Client: ${parts.customerName}` : null,
    `Tour: ${parts.experience}`,
    `Date: ${parts.date}${parts.startTime ? ` · ${String(parts.startTime).slice(0, 5)}` : ""}`,
    parts.guests ? `Guests: ${parts.guests}` : null,
    parts.status ? `Status: ${parts.status}` : null,
    parts.reason ? `Reason: ${parts.reason}` : null,
    `Open: ${parts.url ?? APP_BASE_URL}`,
  ];
  return lines.filter(Boolean).join("\n");
}
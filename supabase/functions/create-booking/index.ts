// Supabase Edge Function: create-booking
// Mobile-facing server-authoritative booking pipeline.
//
// The mobile app calls:
//   supabase.functions.invoke('create-booking', { body: <bookingSchema fields> })
//
// This function verifies the caller's JWT when present, validates the current
// public offer, computes server-side pricing, inserts the booking with the
// service role, and performs the same critical side-effects as the web flow
// (DB triggers reserve slots/calculate money; this function sends in-app,
// Telegram and queued email notifications best-effort).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

const APP_BASE_URL = "https://hamrohim.com";

const GROUP_MAX: Record<string, number> = {
  private: 2,
  small: 6,
  group: 12,
  large: 25,
};

const GROUP_CATEGORIES = new Set(Object.keys(GROUP_MAX));
const PAYMENT_METHODS = new Set(["cash", "online"]);
const LOCALES = new Set(["ru", "uz", "en"]);

function validation(message: string, status = 400) {
  return json({ error: "ValidationError", message }, status);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function numberFromJson(value: unknown, fallback = 0): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function stringField(input: Record<string, unknown>, key: string, max = 255): string | null {
  const value = input[key];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > max) return null;
  return trimmed;
}

function optionalString(input: Record<string, unknown>, key: string, max = 2000): string | null {
  const value = input[key];
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || value.length > max) throw new Error(`${key} is invalid`);
  return value;
}

function parseBookingInput(raw: unknown) {
  const input = asRecord(raw);
  const tourId = stringField(input, "tour_id", 80);
  if (!tourId || !isUuid(tourId)) throw new Error("Invalid tour_id");

  const slotRaw = input.slot_id;
  const slotId = typeof slotRaw === "string" && slotRaw.length > 0 ? slotRaw : null;
  if (slotId && !isUuid(slotId)) throw new Error("Invalid slot_id");

  const date = stringField(input, "date", 10);
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Invalid date");

  const startTime = optionalString(input, "start_time", 8);
  if (startTime && !/^\d{2}:\d{2}(:\d{2})?$/.test(startTime)) throw new Error("Invalid start_time");

  const durationRaw = input.duration_minutes;
  const durationMinutes = durationRaw === undefined || durationRaw === null
    ? null
    : Number(durationRaw);
  if (
    durationMinutes !== null &&
    (!Number.isInteger(durationMinutes) || durationMinutes < 30 || durationMinutes > 720)
  ) {
    throw new Error("Invalid duration_minutes");
  }

  const adults = Number(input.adults);
  if (!Number.isInteger(adults) || adults < 1 || adults > 50) {
    throw new Error("Adults must be between 1 and 50.");
  }

  const children = Number(input.children ?? 0);
  if (!Number.isInteger(children) || children < 0 || children > 50) {
    throw new Error("Children must be between 0 and 50.");
  }

  const groupCategory = stringField(input, "group_category", 20);
  if (groupCategory && !GROUP_CATEGORIES.has(groupCategory)) throw new Error("Invalid group size.");

  const language = optionalString(input, "language", 40);
  const customerName = stringField(input, "customer_name", 200);
  if (!customerName) throw new Error("Customer name is required");
  const customerEmail = optionalString(input, "customer_email", 255);
  if (customerEmail && !/^\S+@\S+\.\S+$/.test(customerEmail)) throw new Error("Invalid email");

  const customerTelegramChatId = input.customer_telegram_chat_id === undefined || input.customer_telegram_chat_id === null
    ? null
    : Number(input.customer_telegram_chat_id);
  if (customerTelegramChatId !== null && !Number.isInteger(customerTelegramChatId)) {
    throw new Error("Invalid Telegram chat id");
  }

  const customerTelegramUserId = input.customer_telegram_user_id === undefined || input.customer_telegram_user_id === null
    ? null
    : Number(input.customer_telegram_user_id);
  if (customerTelegramUserId !== null && (!Number.isInteger(customerTelegramUserId) || customerTelegramUserId <= 0)) {
    throw new Error("Invalid Telegram user id");
  }

  if (!customerEmail && !customerTelegramChatId) {
    throw new Error("Email or Telegram contact is required");
  }

  const paymentMethod = stringField(input, "payment_method", 20) ?? "cash";
  if (!PAYMENT_METHODS.has(paymentMethod)) throw new Error("Invalid payment method");

  const offerVersion = stringField(input, "offer_version", 40);
  if (!offerVersion || input.offer_accepted !== true) {
    throw new Error("Please accept the public offer.");
  }

  const localeRaw = stringField(input, "locale", 5) ?? "ru";
  const locale = LOCALES.has(localeRaw) ? localeRaw : "ru";

  return {
    tour_id: tourId,
    slot_id: slotId,
    date,
    start_time: startTime,
    duration_minutes: durationMinutes,
    adults,
    children,
    group_category: groupCategory,
    language,
    customer_name: customerName,
    customer_email: customerEmail,
    customer_telegram_user_id: customerTelegramUserId,
    customer_telegram_chat_id: customerTelegramChatId,
    customer_telegram_username: optionalString(input, "customer_telegram_username", 255),
    notes: optionalString(input, "notes", 2000) ?? "",
    source: optionalString(input, "source", 64) ?? "mobile",
    locale,
    payment_method: paymentMethod,
    offer_version: offerVersion,
  };
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function bookingDetailsText(parts: {
  title: string;
  customerName?: string | null;
  guideName?: string | null;
  experience: string;
  date: string;
  startTime?: string | null;
  guests?: number | null;
  status?: string | null;
  url?: string;
}) {
  const lines = [
    `<b>${escapeHtml(parts.title)}</b>`,
    parts.guideName ? `Guide: ${escapeHtml(parts.guideName)}` : null,
    parts.customerName ? `Client: ${escapeHtml(parts.customerName)}` : null,
    `Tour: ${escapeHtml(parts.experience)}`,
    `Date: ${escapeHtml(parts.date)}${parts.startTime ? ` · ${escapeHtml(String(parts.startTime).slice(0, 5))}` : ""}`,
    parts.guests ? `Guests: ${parts.guests}` : null,
    parts.status ? `Status: ${escapeHtml(parts.status)}` : null,
    `Open: ${parts.url ?? APP_BASE_URL}`,
  ];
  return lines.filter(Boolean).join("\n");
}

function escapeHtml(value: string) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function sendTelegramMessage(chatId: number | string | null | undefined, text: string) {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!token || !chatId) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
    });
    if (!res.ok) console.error("Telegram notification failed", await res.text());
    return res.ok;
  } catch (e) {
    console.error("Telegram notification failed", e);
    return false;
  }
}

async function createNotification(admin: any, input: {
  userId?: string | null;
  type: string;
  entityId?: string | null;
  entityType?: string | null;
  title: string;
  body?: string | null;
  icon?: string | null;
  link?: string | null;
}) {
  if (!input.userId) return;
  const { error } = await admin.from("notifications").insert({
    user_id: input.userId,
    type: input.type,
    entity_id: input.entityId ?? null,
    entity_type: input.entityType ?? null,
    title: input.title,
    body: input.body ?? null,
    icon: input.icon ?? null,
    link: input.link ?? null,
    category: input.type.startsWith("booking_") ? "bookings" : "system",
  });
  if (error) console.error("createNotification failed", input.type, error);
}

function randomHex(bytesLength: number) {
  const bytes = new Uint8Array(bytesLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function getOrCreateUnsubToken(admin: any, email: string) {
  const normalized = email.toLowerCase();
  const { data: existing } = await admin
    .from("email_unsubscribe_tokens")
    .select("token, used_at")
    .eq("email", normalized)
    .maybeSingle();
  if (existing && !existing.used_at) return existing.token;
  if (existing && existing.used_at) return null;
  const token = randomHex(32);
  await admin
    .from("email_unsubscribe_tokens")
    .upsert({ token, email: normalized }, { onConflict: "email", ignoreDuplicates: true });
  const { data: stored } = await admin
    .from("email_unsubscribe_tokens")
    .select("token")
    .eq("email", normalized)
    .maybeSingle();
  return stored?.token ?? token;
}

async function enqueueEmail(admin: any, opts: {
  templateName: string;
  recipientEmail?: string | null;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
}) {
  if (!opts.recipientEmail) return false;
  try {
    const normalized = opts.recipientEmail.toLowerCase();
    const { data: suppressed } = await admin
      .from("suppressed_emails")
      .select("id")
      .eq("email", normalized)
      .maybeSingle();
    if (suppressed) return false;
    const unsubscribeToken = await getOrCreateUnsubToken(admin, normalized);
    if (!unsubscribeToken) return false;
    const messageId = crypto.randomUUID();
    await admin.from("email_send_log").insert({
      message_id: messageId,
      template_name: opts.templateName,
      recipient_email: normalized,
      status: "pending",
    });
    const { error } = await admin.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: {
        message_id: messageId,
        to: normalized,
        from: "Hamroh <noreply@hamrohim.com>",
        sender_domain: "notify.hamrohim.com",
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
        purpose: "transactional",
        label: opts.templateName,
        idempotency_key: opts.idempotencyKey,
        unsubscribe_token: unsubscribeToken,
        queued_at: new Date().toISOString(),
      },
    });
    if (error) {
      console.error("Failed to enqueue email", opts.templateName, error);
      await admin.from("email_send_log").insert({
        message_id: messageId,
        template_name: opts.templateName,
        recipient_email: normalized,
        status: "failed",
        error_message: error.message,
      });
      return false;
    }
    return true;
  } catch (e) {
    console.error("enqueueEmail failed", opts.templateName, e);
    return false;
  }
}

function emailHtml(title: string, lines: string[]) {
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#111827"><h1>${escapeHtml(title)}</h1>${lines
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("")}<p><a href="${APP_BASE_URL}">Open Hamroh</a></p></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return json({ error: "Server not configured" }, 500);
  }

  // Resolve caller identity from JWT (optional — guests allowed).
  let userId: string | null = null;
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (token && token !== SERVICE_KEY) {
    try {
      const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data, error } = await admin.auth.getUser(token);
      if (!error && data?.user) userId = data.user.id;
    } catch (e) {
      console.warn("[create-booking] token verify failed", e);
    }
  }

  let input: ReturnType<typeof parseBookingInput>;
  try {
    input = parseBookingInput(await req.json());
  } catch (e: any) {
    return validation(e?.message ?? "Invalid input");
  }

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: currentOffer, error: offerErr } = await admin
      .from("legal_offers")
      .select("version")
      .eq("is_current", true)
      .maybeSingle();
    if (offerErr) throw offerErr;
    if (!currentOffer || currentOffer.version !== input.offer_version) {
      return validation("The public offer has been updated. Please reload and accept the current version.");
    }

    const { data: tour, error: tourErr } = await admin
      .from("tours")
      .select("id, guide_id, title, price_from, pricing_mode, base_language, language_multipliers, group_prices, duration_hours, published")
      .eq("id", input.tour_id)
      .maybeSingle();
    if (tourErr) throw tourErr;
    if (!tour || !tour.published) return validation("Tour not available");

    const pricingMode = tour.pricing_mode === "by_group" ? "by_group" : "fixed";
    const groupPrices = asRecord(tour.group_prices);
    const langMults = asRecord(tour.language_multipliers);

    let basePrice = 0;
    if (pricingMode === "by_group") {
      if (!input.group_category) return validation("Please choose a group size.");
      const max = GROUP_MAX[input.group_category];
      if (input.adults > max) {
        return validation("Your group is larger than this category. Please contact the guide.");
      }
      basePrice = numberFromJson(groupPrices[input.group_category]);
      if (basePrice <= 0) return validation("This group size is not offered for this tour.");
    } else {
      basePrice = numberFromJson(groupPrices.fixed, numberFromJson(tour.price_from));
      if (basePrice <= 0) return validation("Tour price is not set.");
    }

    const mult = !input.language || input.language === tour.base_language
      ? 0
      : numberFromJson(langMults[input.language]);
    const subtotal = Math.round(basePrice * (1 + mult / 100));

    const { data: sfSetting } = await admin
      .from("app_settings")
      .select("value")
      .eq("key", "hamroh_service_fee_rate")
      .maybeSingle();
    const serviceFeeRateRaw = numberFromJson(sfSetting?.value, 0.05);
    const serviceFeeRate = serviceFeeRateRaw >= 0 && serviceFeeRateRaw < 1 ? serviceFeeRateRaw : 0.05;
    const total = subtotal + Math.round(subtotal * serviceFeeRate);

    const totalGuests = input.adults + input.children;
    const isInstant = Boolean(input.slot_id);
    const experienceLabel = input.language ? `${tour.title} (${input.language})` : tour.title;

    let expiresAt: string | null = null;
    if (!isInstant) {
      const tourStart = new Date(`${input.date}T${input.start_time ?? "12:00"}:00`);
      const hoursUntilTour = (tourStart.getTime() - Date.now()) / 3600000;
      let responseHours = 24;
      if (hoursUntilTour < 24) responseHours = 2;
      else if (hoursUntilTour < 48) responseHours = 12;
      const deadlineMs = Math.min(
        Date.now() + responseHours * 3600000,
        tourStart.getTime() - 30 * 60000,
      );
      expiresAt = new Date(Math.max(deadlineMs, Date.now() + 30 * 60000)).toISOString();
    }

    const { data: row, error: insertErr } = await admin
      .from("bookings")
      .insert({
        tour_id: tour.id,
        guide_id: tour.guide_id,
        slot_id: input.slot_id,
        experience: experienceLabel,
        language: input.language,
        date: input.date,
        start_time: input.start_time,
        duration_minutes: input.duration_minutes ?? Math.round(Number(tour.duration_hours || 2) * 60),
        guests: totalGuests,
        adults: input.adults,
        children: input.children,
        group_category: input.group_category,
        customer_name: input.customer_name,
        customer_email: input.customer_email,
        customer_telegram_user_id: input.customer_telegram_user_id,
        customer_telegram_chat_id: input.customer_telegram_chat_id,
        customer_telegram_username: input.customer_telegram_username,
        notes: input.notes,
        tour_price: subtotal,
        total,
        payment_method: input.payment_method,
        source: input.source,
        user_id: userId,
        status: isInstant ? "confirmed" : "pending",
        locale: input.locale,
        expires_at: expiresAt,
        offer_version: input.offer_version,
        offer_accepted_at: new Date().toISOString(),
      })
      .select("id, status")
      .single();
    if (insertErr) {
      if (insertErr.message?.includes("TIME_CONFLICT")) {
        return json(
          { error: "TimeConflict", message: "This time is already booked. Please choose another time." },
          409,
        );
      }
      throw insertErr;
    }

    try {
      const { data: guide } = await admin
        .from("guides")
        .select("name, user_id, locale")
        .eq("id", tour.guide_id)
        .maybeSingle();
      const guideName = guide?.name ?? undefined;
      const status = row.status ?? "pending";

      let notificationEmail = input.customer_email;
      if (!notificationEmail && userId) {
        const { data: clientTelegram } = await admin
          .from("telegram_accounts")
          .select("email")
          .eq("user_id", userId)
          .maybeSingle();
        notificationEmail = clientTelegram?.email ?? null;
      }

      await enqueueEmail(admin, {
        templateName: "booking-confirmation-client",
        recipientEmail: notificationEmail,
        subject: status === "confirmed" ? "Booking confirmed" : "Booking request received",
        html: emailHtml(status === "confirmed" ? "Booking confirmed" : "Booking request received", [
          `Tour: ${experienceLabel}`,
          guideName ? `Guide: ${guideName}` : "",
          `Date: ${input.date}${input.start_time ? ` · ${input.start_time.slice(0, 5)}` : ""}`,
          `Guests: ${totalGuests}`,
          `Total: $${total}`,
          `Status: ${status}`,
        ].filter(Boolean)),
        text: `Booking ${status}\nTour: ${experienceLabel}\nDate: ${input.date}\nGuests: ${totalGuests}\nTotal: $${total}`,
        idempotencyKey: `booking-client-${row.id}`,
      });

      let clientChatId = input.customer_telegram_chat_id;
      if (!clientChatId && userId) {
        const { data: clientTelegram } = await admin
          .from("telegram_accounts")
          .select("telegram_chat_id")
          .eq("user_id", userId)
          .maybeSingle();
        clientChatId = clientTelegram?.telegram_chat_id ?? null;
      }
      await sendTelegramMessage(clientChatId, bookingDetailsText({
        title: status === "confirmed" ? "Booking confirmed" : "Booking request received",
        guideName,
        experience: experienceLabel,
        date: input.date,
        startTime: input.start_time,
        guests: totalGuests,
        status,
        url: `${APP_BASE_URL}/my-bookings`,
      }));

      await createNotification(admin, {
        userId,
        type: "booking_status",
        entityId: row.id,
        entityType: "booking",
        title: status === "confirmed" ? "Booking confirmed" : "Booking request sent",
        body: guideName ? `${experienceLabel} with ${guideName}` : experienceLabel,
        icon: status === "confirmed" ? "✅" : "📅",
        link: "/my-bookings",
      });

      if (guide?.user_id) {
        const { data: guideUser } = await admin.auth.admin.getUserById(guide.user_id);
        await enqueueEmail(admin, {
          templateName: "booking-new-guide",
          recipientEmail: guideUser?.user?.email,
          subject: status === "confirmed" ? "New booking" : "New booking request",
          html: emailHtml(status === "confirmed" ? "New booking" : "New booking request", [
            `Client: ${input.customer_name}`,
            `Tour: ${experienceLabel}`,
            `Date: ${input.date}${input.start_time ? ` · ${input.start_time.slice(0, 5)}` : ""}`,
            `Guests: ${totalGuests}`,
            `Total: $${total}`,
            `Status: ${status}`,
          ]),
          text: `New booking request\nClient: ${input.customer_name}\nTour: ${experienceLabel}\nDate: ${input.date}\nGuests: ${totalGuests}\nTotal: $${total}`,
          idempotencyKey: `booking-guide-${row.id}`,
        });

        const { data: guideTelegram } = await admin
          .from("telegram_accounts")
          .select("telegram_chat_id")
          .eq("user_id", guide.user_id)
          .maybeSingle();
        await sendTelegramMessage(guideTelegram?.telegram_chat_id, bookingDetailsText({
          title: "New booking request",
          customerName: input.customer_name,
          experience: experienceLabel,
          date: input.date,
          startTime: input.start_time,
          guests: totalGuests,
          status,
          url: `${APP_BASE_URL}/guide`,
        }));

        await createNotification(admin, {
          userId: guide.user_id,
          type: "booking_new",
          entityId: row.id,
          entityType: "booking",
          title: status === "confirmed" ? "New booking" : "New booking request",
          body: `${input.customer_name} — ${experienceLabel}`,
          icon: "📅",
          link: "/guide",
        });
      }
    } catch (e) {
      console.error("Booking notification side-effects failed", e);
    }

    return json({ booking: row });
  } catch (e: any) {
    console.error("[create-booking] failed", e);
    const message = e?.message ?? "Server error";
    const isValidation = /(offer|Tour|group|price|Slot|date|contact|Email|Telegram|payment|violates|constraint)/i.test(message);
    return json({ error: isValidation ? "ValidationError" : "ServerError", message }, isValidation ? 400 : 500);
  }
});

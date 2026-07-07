// Supabase Edge Function: get-booking-pdf-url
// Mobile-facing. Returns a signed public URL to the booking PDF voucher.
//
// The mobile app calls:
//   supabase.functions.invoke('get-booking-pdf-url', { body: { booking_id, locale? } })
// and opens the returned URL with Linking.openURL(url).
//
// Auth: requires signed-in user; caller must be the booking's client OR the guide.
// Status: PDF is available only for confirmed/completed bookings.
//
// The URL points at the web app's public route:
//   {APP_BASE_URL}/api/public/bookings/{id}/pdf?token={HMAC}&locale={locale}
// The HMAC uses SUPABASE_SERVICE_ROLE_KEY as seed and matches the web signer
// in src/lib/booking-pdf.server.ts (signBookingPdfToken).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { createHmac } from "node:crypto";

const APP_BASE_URL = "https://hamrohim.com";

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

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

function signToken(bookingId: string, serviceKey: string): string {
  return createHmac("sha256", `booking-pdf::${serviceKey}`)
    .update(bookingId)
    .digest("hex");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return json({ error: "ServerError", message: "Server not configured" }, 500);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token || token === SERVICE_KEY) {
    return json({ error: "Unauthorized", message: "Sign-in required" }, 401);
  }
  let userId: string;
  try {
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data?.user) {
      return json({ error: "Unauthorized", message: "Invalid session" }, 401);
    }
    userId = data.user.id;
  } catch {
    return json({ error: "Unauthorized", message: "Invalid session" }, 401);
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) ?? {};
  } catch {
    return json({ error: "ValidationError", message: "Invalid JSON" }, 400);
  }

  const bookingId = typeof body.booking_id === "string" ? body.booking_id.trim() : "";
  if (!bookingId || !isUuid(bookingId)) {
    return json({ error: "ValidationError", message: "Invalid booking_id" }, 400);
  }
  const rawLocale = typeof body.locale === "string" ? body.locale.trim().toLowerCase() : "";
  const locale = rawLocale === "en" || rawLocale === "uz" || rawLocale === "ru" ? rawLocale : "";

  try {
    const { data: row, error } = await admin
      .from("bookings")
      .select("id, user_id, guide_id, status, guides(user_id)")
      .eq("id", bookingId)
      .maybeSingle();
    if (error) throw error;
    if (!row) return json({ error: "NotFound", message: "Booking not found" }, 404);

    const guideUserId = (row as { guides?: { user_id?: string } }).guides?.user_id ?? null;
    if (row.user_id !== userId && guideUserId !== userId) {
      return json({ error: "Forbidden", message: "This booking is not yours" }, 403);
    }
    if (row.status !== "confirmed" && row.status !== "completed") {
      return json(
        { error: "NotAvailable", message: "PDF is available only for confirmed bookings" },
        409,
      );
    }

    const sig = signToken(bookingId, SERVICE_KEY);
    const qs = new URLSearchParams({ token: sig });
    if (locale) qs.set("locale", locale);
    const url = `${APP_BASE_URL}/api/public/bookings/${bookingId}/pdf?${qs.toString()}`;
    const filename = `hamroh-booking-${bookingId.slice(0, 8)}.pdf`;
    return json({ url, filename });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    console.error("[get-booking-pdf-url]", e);
    return json({ error: "ServerError", message }, 500);
  }
});

// Supabase Edge Function: create-booking
// Mobile-facing wrapper around the shared server-side booking pipeline.
//
// The mobile app calls:
//   supabase.functions.invoke('create-booking', { body: <bookingSchema fields> })
//
// This function:
//   1. Verifies the caller's JWT (optional — anonymous/guest bookings allowed,
//      same as the web contract).
//   2. Forwards the raw input + resolved user_id to the internal hook
//      `/api/public/hooks/create-booking` on the app server, authenticated with
//      the service role key.
//   3. Returns the created booking or a structured error.
//
// This keeps ALL booking logic (validation, pricing, offer check, DB triggers
// for commission/payout/slot reservation, emails, telegram, notifications,
// google calendar mirror) in a single code path shared with the web app.
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

// Stable production URL — immutable across renames. Uses the internal service-role
// hook that runs the same createBookingCore as the web `createBooking` server fn.
const APP_HOOK_URL =
  "https://project--6fe4ded5-fad3-4138-b141-63c14b76e50f.lovable.app/api/public/hooks/create-booking";

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

  let input: unknown;
  try {
    input = await req.json();
  } catch {
    return json({ error: "ValidationError", message: "Invalid JSON" }, 400);
  }

  try {
    const res = await fetch(APP_HOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({ input, user_id: userId }),
    });
    const text = await res.text();
    let payload: unknown;
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      payload = { error: "ServerError", message: text || "Unknown error" };
    }
    return new Response(JSON.stringify(payload), {
      status: res.status,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[create-booking] upstream call failed", e);
    return json(
      { error: "ServerError", message: e?.message ?? "Upstream call failed" },
      502,
    );
  }
});

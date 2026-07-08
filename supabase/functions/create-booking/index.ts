// Supabase Edge Function: create-booking
// Mobile-facing server-authoritative booking pipeline.
//
// Thin proxy to the canonical internal hook
// (src/routes/api/public/hooks/create-booking.ts → createBookingCore).
// This edge function verifies the caller's JWT (or accepts guests), then
// forwards the resolved user_id + validated input to the hook, which runs
// the exact same pipeline as the web app (`createBooking` server fn).
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

const HOOK_URL =
  "https://project--6fe4ded5-fad3-4138-b141-63c14b76e50f.lovable.app/api/public/hooks/create-booking";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return json({ error: "Server not configured" }, 500);
  }

  // Resolve caller identity from JWT (optional — guest bookings allowed).
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
    const hookToken = Deno.env.get("INTERNAL_HOOK_SECRET") ?? SERVICE_KEY;
    const res = await fetch(HOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${hookToken}`,
      },
      body: JSON.stringify({ user_id: userId, input }),
    });
    const payload = await res.json().catch(() => ({}));
    return json(payload, res.status);
  } catch (e: any) {
    console.error("[create-booking proxy] failed", e);
    return json({ error: "ServerError", message: e?.message ?? "Upstream failed" }, 502);
  }
});

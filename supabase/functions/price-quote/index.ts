// Supabase Edge Function: price-quote
// Mobile-facing server-authoritative price quote.
//
// Thin proxy to the canonical internal hook
// (src/routes/api/public/hooks/price-quote.ts → quoteBookingCore).
// Kept as an edge function so the mobile app can call it via
// supabase.functions.invoke('price-quote', { body: {...} }).

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
  "https://project--6fe4ded5-fad3-4138-b141-63c14b76e50f.lovable.app/api/public/hooks/price-quote";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "ValidationError", message: "Invalid JSON" }, 400);
  }

  try {
    const res = await fetch(HOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await res.json().catch(() => ({}));
    return json(payload, res.status);
  } catch (e: any) {
    console.error("[price-quote proxy] failed", e);
    return json({ error: "ServerError", message: e?.message ?? "Upstream failed" }, 502);
  }
});

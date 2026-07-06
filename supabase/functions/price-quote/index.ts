// Supabase Edge Function: price-quote
// Mobile-facing thin wrapper around the shared server-side price quote hook.
//
// Mobile app:
//   supabase.functions.invoke('price-quote', {
//     body: { tour_id, adults, children?, group_category?, language? }
//   })
//
// Response (200):
//   { quote: {
//       base_price, language_multiplier_pct,
//       subtotal, service_fee, service_fee_rate,
//       total, currency, pricing_mode, group_max
//   } }
// Error (400/500): { error, message }
//
// Uses the same math as create-booking — display exactly what will be charged.
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

const APP_HOOK_URL =
  "https://project--6fe4ded5-fad3-4138-b141-63c14b76e50f.lovable.app/api/public/hooks/price-quote";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let input: unknown;
  try {
    input = await req.json();
  } catch {
    return json({ error: "ValidationError", message: "Invalid JSON" }, 400);
  }

  try {
    const res = await fetch(APP_HOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input }),
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
    console.error("[price-quote] upstream call failed", e);
    return json(
      { error: "ServerError", message: e?.message ?? "Upstream call failed" },
      502,
    );
  }
});

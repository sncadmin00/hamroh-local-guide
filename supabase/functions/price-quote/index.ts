// Supabase Edge Function: price-quote
// Mobile-facing server-authoritative price quote endpoint.
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

const GROUP_MAX: Record<string, number> = {
  private: 2,
  small: 6,
  group: 12,
  large: 25,
};

const GROUP_CATEGORIES = new Set(Object.keys(GROUP_MAX));

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

function parseQuoteInput(raw: unknown) {
  const body = asRecord(raw);
  const input = asRecord(body.input ?? body);
  const tourId = typeof input.tour_id === "string" ? input.tour_id : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(tourId)) {
    throw new Error("Invalid tour_id");
  }

  const adults = Number(input.adults);
  if (!Number.isInteger(adults) || adults < 1 || adults > 50) {
    throw new Error("Adults must be between 1 and 50.");
  }

  const childrenRaw = input.children ?? 0;
  const children = Number(childrenRaw);
  if (!Number.isInteger(children) || children < 0 || children > 50) {
    throw new Error("Children must be between 0 and 50.");
  }

  const groupCategory =
    typeof input.group_category === "string" && input.group_category.length > 0
      ? input.group_category
      : null;
  if (groupCategory && !GROUP_CATEGORIES.has(groupCategory)) {
    throw new Error("Invalid group size.");
  }

  const language = typeof input.language === "string" && input.language.length > 0
    ? input.language
    : null;

  return { tour_id: tourId, adults, children, group_category: groupCategory, language };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let input: ReturnType<typeof parseQuoteInput>;
  try {
    input = parseQuoteInput(await req.json());
  } catch {
    return validation("Invalid input");
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SERVICE_KEY) {
      return json({ error: "ServerError", message: "Server not configured" }, 500);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: tour, error: tourErr } = await admin
      .from("tours")
      .select("id, price_from, pricing_mode, base_language, language_multipliers, group_prices, published")
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
    const serviceFeeRate =
      serviceFeeRateRaw >= 0 && serviceFeeRateRaw < 1 ? serviceFeeRateRaw : 0.05;
    const serviceFee = Math.round(subtotal * serviceFeeRate);
    const total = subtotal + serviceFee;

    return json({
      quote: {
        base_price: basePrice,
        language_multiplier_pct: mult,
        subtotal,
        service_fee: serviceFee,
        service_fee_rate: serviceFeeRate,
        total,
        currency: "USD",
        pricing_mode: pricingMode,
        group_max: GROUP_MAX,
      },
    });
  } catch (e: any) {
    console.error("[price-quote] failed", e);
    const message = e?.message ?? "Server error";
    const isValidation = /(Tour|group|price|language)/i.test(message);
    return json(
      { error: isValidation ? "ValidationError" : "ServerError", message },
      isValidation ? 400 : 500,
    );
  }
});

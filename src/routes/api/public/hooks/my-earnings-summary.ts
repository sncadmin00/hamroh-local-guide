/**
 * Public hook: earnings KPI + period stats for the caller (guide).
 *
 * Auth: Authorization: Bearer <supabase user JWT>.
 * Method: POST
 * Body: {
 *   period: 'today' | 'week' | 'month' | 'year' | 'custom' (default 'month'),
 *   from?: 'YYYY-MM-DD',   // required if period='custom'
 *   to?:   'YYYY-MM-DD',
 * }
 *
 * Returns: {
 *   currency: 'UZS',
 *   commissionRate: number,             // e.g. 0.15
 *   period: { from, to },
 *   kpi: {                              // always this month (calendar)
 *     monthTotalEarnings: number,       // net for completed bookings
 *     pendingPayout: number,            // lifetime net − paid out
 *     paidOut: number,                  // sum of payouts.status='paid'
 *     completedExperiences: number,
 *   },
 *   stats: {                            // for the requested period
 *     gross: number, commission: number, net: number,
 *     avgBookingValue: number, bookingsCount: number,
 *   },
 * }
 * All amounts UZS integers (rounded).
 */
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const DEFAULT_COMMISSION = 0.15;

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    "Access-Control-Max-Age": "86400",
  };
}

const bodySchema = z.object({
  period: z.enum(["today", "week", "month", "year", "custom"]).default("month"),
  from: z.string().optional(),
  to: z.string().optional(),
});

function periodBounds(period: string): { from: string; to: string } {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate();
  const fmt = (dt: Date) => dt.toISOString().slice(0, 10);
  if (period === "today") {
    const a = new Date(Date.UTC(y, m, d));
    return { from: fmt(a), to: fmt(a) };
  }
  if (period === "week") {
    const day = (now.getUTCDay() + 6) % 7;
    const start = new Date(Date.UTC(y, m, d - day));
    const end = new Date(Date.UTC(y, m, d - day + 6));
    return { from: fmt(start), to: fmt(end) };
  }
  if (period === "year") {
    return { from: `${y}-01-01`, to: `${y}-12-31` };
  }
  const first = new Date(Date.UTC(y, m, 1));
  const last = new Date(Date.UTC(y, m + 1, 0));
  return { from: fmt(first), to: fmt(last) };
}

export const Route = createFileRoute("/api/public/hooks/my-earnings-summary")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders() }),

      POST: async ({ request }) => {
        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.toLowerCase().startsWith("bearer ")
          ? authHeader.slice(7).trim()
          : "";
        if (!token) {
          return Response.json(
            { error: "Unauthorized", message: "Missing bearer token" },
            { status: 401, headers: corsHeaders() },
          );
        }

        const url = process.env.SUPABASE_URL;
        const pk = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!url || !pk) {
          return Response.json(
            { error: "ServerError", message: "Supabase env missing" },
            { status: 500, headers: corsHeaders() },
          );
        }

        const sb = createClient(url, pk, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
        });

        const { data: userRes, error: userErr } = await sb.auth.getUser(token);
        if (userErr || !userRes?.user) {
          return Response.json(
            { error: "Unauthorized", message: "Invalid or expired token" },
            { status: 401, headers: corsHeaders() },
          );
        }
        const userId = userRes.user.id;

        let raw: unknown = {};
        try {
          const t = await request.text();
          raw = t ? JSON.parse(t) : {};
        } catch {
          return Response.json(
            { error: "BadRequest", message: "Invalid JSON body" },
            { status: 400, headers: corsHeaders() },
          );
        }
        const parsed = bodySchema.safeParse(raw);
        if (!parsed.success) {
          return Response.json(
            { error: "BadRequest", message: parsed.error.issues[0]?.message ?? "Invalid input" },
            { status: 400, headers: corsHeaders() },
          );
        }

        const { data: guide } = await sb
          .from("guides")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();
        if (!guide) {
          return Response.json(
            { error: "NotFound", message: "You are not linked to a guide profile yet." },
            { status: 404, headers: corsHeaders() },
          );
        }
        const guideId = (guide as any).id as string;

        // commission rate
        const { data: rateRow } = await sb
          .from("app_settings")
          .select("value")
          .eq("key", "hamroh_commission_rate")
          .maybeSingle();
        const rateRaw = (rateRow as any)?.value;
        const rateNum = typeof rateRaw === "number" ? rateRaw : Number(rateRaw);
        const rate =
          Number.isFinite(rateNum) && rateNum >= 0 && rateNum < 1 ? rateNum : DEFAULT_COMMISSION;

        const bounds =
          parsed.data.period === "custom" && parsed.data.from && parsed.data.to
            ? { from: parsed.data.from, to: parsed.data.to }
            : periodBounds(parsed.data.period);

        // Period bookings
        const { data: rows, error } = await sb
          .from("bookings")
          .select("total, status")
          .eq("guide_id", guideId)
          .gte("date", bounds.from)
          .lte("date", bounds.to);
        if (error) {
          return Response.json(
            { error: "DBError", message: error.message },
            { status: 400, headers: corsHeaders() },
          );
        }
        const completed = ((rows ?? []) as any[]).filter((b) => b.status === "completed");
        const gross = completed.reduce((s, b) => s + Number(b.total ?? 0), 0);
        const commission = gross * rate;
        const net = gross - commission;
        const avg = completed.length ? gross / completed.length : 0;

        // KPI: this calendar month
        const month = periodBounds("month");
        const { data: monthRows } = await sb
          .from("bookings")
          .select("total, status")
          .eq("guide_id", guideId)
          .gte("date", month.from)
          .lte("date", month.to);
        const monthCompleted = ((monthRows ?? []) as any[]).filter(
          (b) => b.status === "completed",
        );
        const monthGross = monthCompleted.reduce((s, b) => s + Number(b.total ?? 0), 0);
        const monthNet = monthGross * (1 - rate);
        const completedExperiences = monthCompleted.length;

        // Lifetime net & paid out
        const { data: lifetimeRows } = await sb
          .from("bookings")
          .select("total")
          .eq("guide_id", guideId)
          .eq("status", "completed");
        const lifetimeGross = ((lifetimeRows ?? []) as any[]).reduce(
          (s, b) => s + Number(b.total ?? 0),
          0,
        );
        const lifetimeNet = lifetimeGross * (1 - rate);

        const { data: payouts } = await sb
          .from("payouts")
          .select("amount, status")
          .eq("guide_id", guideId);
        const paidOut = ((payouts ?? []) as any[])
          .filter((p) => p.status === "paid")
          .reduce((s, p) => s + Number(p.amount ?? 0), 0);
        const pendingPayout = Math.max(0, lifetimeNet - paidOut);

        return Response.json(
          {
            currency: "UZS",
            commissionRate: rate,
            period: bounds,
            kpi: {
              monthTotalEarnings: Math.round(monthNet),
              pendingPayout: Math.round(pendingPayout),
              paidOut: Math.round(paidOut),
              completedExperiences,
            },
            stats: {
              gross: Math.round(gross),
              commission: Math.round(commission),
              net: Math.round(net),
              avgBookingValue: Math.round(avg),
              bookingsCount: completed.length,
            },
          },
          { headers: corsHeaders() },
        );
      },
    },
  },
});

/**
 * Public hook: transaction list (bookings-as-earnings) for the caller (guide).
 *
 * Auth: Authorization: Bearer <supabase user JWT>.
 * Method: POST
 * Body (all optional): {
 *   from?: 'YYYY-MM-DD',
 *   to?:   'YYYY-MM-DD',
 *   status?: 'pending'|'confirmed'|'completed'|'cancelled'|'declined',
 *   tour_id?: uuid,
 * }
 *
 * Returns: {
 *   currency: 'UZS',
 *   commissionRate: number,
 *   rows: [{
 *     id, date, start_time, experience, customer_name, guests,
 *     gross, fee, net, status, tour_id,
 *   }, ...]
 * }
 * Money fields are UZS integers. Limit 500 rows, ordered by date DESC.
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
  from: z.string().optional(),
  to: z.string().optional(),
  status: z
    .enum(["pending", "confirmed", "completed", "cancelled", "declined"])
    .optional(),
  tour_id: z.string().uuid().optional(),
});

export const Route = createFileRoute("/api/public/hooks/my-transactions")({
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

        const { data: rateRow } = await sb
          .from("app_settings")
          .select("value")
          .eq("key", "hamroh_commission_rate")
          .maybeSingle();
        const rateRaw = (rateRow as any)?.value;
        const rateNum = typeof rateRaw === "number" ? rateRaw : Number(rateRaw);
        const rate =
          Number.isFinite(rateNum) && rateNum >= 0 && rateNum < 1 ? rateNum : DEFAULT_COMMISSION;

        let q = sb
          .from("bookings")
          .select(
            "id, date, start_time, experience, customer_name, guests, total, status, tour_id",
          )
          .eq("guide_id", guideId)
          .order("date", { ascending: false })
          .limit(500);
        if (parsed.data.from) q = q.gte("date", parsed.data.from);
        if (parsed.data.to) q = q.lte("date", parsed.data.to);
        if (parsed.data.status) q = q.eq("status", parsed.data.status);
        if (parsed.data.tour_id) q = q.eq("tour_id", parsed.data.tour_id);

        const { data: rows, error } = await q;
        if (error) {
          return Response.json(
            { error: "DBError", message: error.message },
            { status: 400, headers: corsHeaders() },
          );
        }

        const mapped = ((rows ?? []) as any[]).map((b) => {
          const gross = Number(b.total ?? 0);
          const fee = gross * rate;
          return {
            id: b.id,
            date: b.date,
            start_time: b.start_time,
            experience: b.experience,
            customer_name: b.customer_name,
            guests: b.guests,
            gross: Math.round(gross),
            fee: Math.round(fee),
            net: Math.round(gross - fee),
            status: b.status,
            tour_id: b.tour_id,
          };
        });

        return Response.json(
          { currency: "UZS", commissionRate: rate, rows: mapped },
          { headers: corsHeaders() },
        );
      },
    },
  },
});

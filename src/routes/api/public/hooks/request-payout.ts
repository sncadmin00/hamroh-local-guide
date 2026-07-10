/**
 * POST /api/public/hooks/request-payout
 * Auth: Bearer <supabase user JWT>.
 *
 * Body: {
 *   amount?: number,          // if omitted, request the whole pending payout
 *   step_up_token: string,    // from /payout-step-up/verify (purpose: request_payout)
 * }
 *
 * Response: {
 *   ok: true,
 *   payout: { id, payout_number, amount, currency, method, status, scheduled_at, created_at }
 * }
 *
 * Errors:
 *   403 { error: "StepUpRequired" }
 *   409 { error: "PayoutDetailsMissing" }         — guide has no saved method/details
 *   409 { error: "PayoutAlreadyPending" }         — there is a scheduled/processing payout
 *   400 { error: "BelowMinimum", min: number }    — amount < min_settlement_amount
 *   400 { error: "NothingToPayout" }              — pendingPayout is 0
 *   400 { error: "AmountExceedsPending", pending: number }
 */
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { consumeStepUpToken } from "@/lib/payout-step-up.server";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

const DEFAULT_COMMISSION = 0.15;
const DEFAULT_MIN = 50000;

const bodySchema = z.object({
  amount: z.number().positive().optional(),
  step_up_token: z.string().min(8),
});

export const Route = createFileRoute("/api/public/hooks/request-payout")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      POST: async ({ request }) => {
        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.toLowerCase().startsWith("bearer ")
          ? authHeader.slice(7).trim()
          : "";
        if (!token) {
          return Response.json({ error: "Unauthorized" }, { status: 401, headers: cors });
        }

        let raw: unknown = {};
        try {
          raw = await request.json();
        } catch {
          return Response.json({ error: "BadRequest", message: "Invalid JSON" }, { status: 400, headers: cors });
        }
        const parsed = bodySchema.safeParse(raw);
        if (!parsed.success) {
          return Response.json(
            { error: "BadRequest", message: parsed.error.issues[0]?.message ?? "Invalid input" },
            { status: 400, headers: cors },
          );
        }

        const url = process.env.SUPABASE_URL;
        const pk = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!url || !pk) {
          return Response.json({ error: "ServerError" }, { status: 500, headers: cors });
        }
        const sb = createClient(url, pk, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
        });
        const { data: userRes, error: userErr } = await sb.auth.getUser(token);
        if (userErr || !userRes?.user) {
          return Response.json({ error: "Unauthorized" }, { status: 401, headers: cors });
        }
        const userId = userRes.user.id;

        const ok = await consumeStepUpToken(userId, parsed.data.step_up_token, "request_payout");
        if (!ok) {
          return Response.json(
            { error: "StepUpRequired", message: "Re-run payout-step-up/start and verify." },
            { status: 403, headers: cors },
          );
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: guide } = await supabaseAdmin
          .from("guides")
          .select("id, payout_method, payout_details")
          .eq("user_id", userId)
          .maybeSingle();
        if (!guide) {
          return Response.json(
            { error: "NotFound", message: "You are not linked to a guide profile yet." },
            { status: 404, headers: cors },
          );
        }
        const g = guide as any;
        if (!g.payout_method || !g.payout_details) {
          return Response.json(
            {
              error: "PayoutDetailsMissing",
              message: "Save your payout method and details first via update-payout-details.",
            },
            { status: 409, headers: cors },
          );
        }

        // Block if scheduled/processing already exists.
        const { data: pending } = await supabaseAdmin
          .from("payouts")
          .select("id, status")
          .eq("guide_id", g.id)
          .in("status", ["scheduled", "processing"])
          .limit(1);
        if ((pending ?? []).length > 0) {
          return Response.json(
            {
              error: "PayoutAlreadyPending",
              message: "You already have a payout request being processed.",
            },
            { status: 409, headers: cors },
          );
        }

        // Compute pendingPayout = lifetime net − paid out.
        const { data: rateRow } = await supabaseAdmin
          .from("app_settings")
          .select("value")
          .eq("key", "hamroh_commission_rate")
          .maybeSingle();
        const rateRaw = (rateRow as any)?.value;
        const rateNum = typeof rateRaw === "number" ? rateRaw : Number(rateRaw);
        const rate =
          Number.isFinite(rateNum) && rateNum >= 0 && rateNum < 1 ? rateNum : DEFAULT_COMMISSION;

        const { data: minRow } = await supabaseAdmin
          .from("app_settings")
          .select("value")
          .eq("key", "min_settlement_amount")
          .maybeSingle();
        const minRaw = (minRow as any)?.value;
        const minNum = typeof minRaw === "number" ? minRaw : Number(minRaw);
        const minAmount = Number.isFinite(minNum) && minNum > 0 ? minNum : DEFAULT_MIN;

        const { data: completed } = await supabaseAdmin
          .from("bookings")
          .select("total")
          .eq("guide_id", g.id)
          .eq("status", "completed");
        const lifetimeGross = ((completed ?? []) as any[]).reduce(
          (s, b) => s + Number(b.total ?? 0),
          0,
        );
        const lifetimeNet = lifetimeGross * (1 - rate);

        const { data: allPayouts } = await supabaseAdmin
          .from("payouts")
          .select("amount, status")
          .eq("guide_id", g.id);
        const paidOut = ((allPayouts ?? []) as any[])
          .filter((p) => p.status === "paid")
          .reduce((s, p) => s + Number(p.amount ?? 0), 0);
        const pendingPayout = Math.max(0, Math.round(lifetimeNet - paidOut));

        if (pendingPayout <= 0) {
          return Response.json(
            { error: "NothingToPayout" },
            { status: 400, headers: cors },
          );
        }

        const requested = parsed.data.amount ?? pendingPayout;
        if (requested > pendingPayout) {
          return Response.json(
            { error: "AmountExceedsPending", pending: pendingPayout },
            { status: 400, headers: cors },
          );
        }
        if (requested < minAmount) {
          return Response.json(
            { error: "BelowMinimum", min: minAmount },
            { status: 400, headers: cors },
          );
        }

        const { data: created, error: insErr } = await supabaseAdmin
          .from("payouts")
          .insert({
            guide_id: g.id,
            method: g.payout_method,
            amount: requested,
            currency: "UZS",
            status: "scheduled",
            created_by: userId,
          } as any)
          .select(
            "id, payout_number, amount, currency, method, status, scheduled_at, created_at",
          )
          .single();
        if (insErr || !created) {
          return Response.json(
            { error: "DBError", message: insErr?.message ?? "Failed to create payout" },
            { status: 500, headers: cors },
          );
        }

        // Notify admins.
        try {
          const { data: admins } = await supabaseAdmin
            .from("user_roles")
            .select("user_id")
            .eq("role", "admin");
          const rows = ((admins ?? []) as any[]).map((r) => ({
            user_id: r.user_id,
            type: "payout_requested",
            title: "New payout request",
            body: `Guide requested payout of ${requested} via ${g.payout_method}.`,
            data: { guide_id: g.id, payout_id: (created as any).id, amount: requested },
          }));
          if (rows.length) await supabaseAdmin.from("notifications").insert(rows as any);
        } catch {
          /* best-effort */
        }

        return Response.json({ ok: true, payout: created }, { headers: cors });
      },
    },
  },
});

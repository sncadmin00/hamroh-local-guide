/**
 * POST /api/public/hooks/update-payout-details
 * Auth: Bearer <supabase user JWT>.
 *
 * Body: {
 *   method: 'bank' | 'click' | 'payme' | 'cash' | 'other',
 *   details: object,          // shape depends on `method` (see below)
 *   step_up_token: string,    // from /payout-step-up/verify (purpose: update_payout_details)
 * }
 *
 * Field shapes by method:
 *   bank:  { card_number: string(16 digits), bank_name: string, holder_name: string }
 *   click: { phone: string (E.164, +998...) }
 *   payme: { phone: string (E.164) }
 *   cash:  { }
 *   other: { note: string, max 300 chars }
 *
 * Response: { ok: true }
 *
 * Errors:
 *   403 { error: "StepUpRequired" }  — step_up_token invalid/expired/consumed
 *   400 { error: "BadRequest", message } — validation
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

const phoneRe = /^\+?\d{9,15}$/;

const bankSchema = z.object({
  card_number: z
    .string()
    .transform((s) => s.replace(/\s+/g, ""))
    .refine((s) => /^\d{16}$/.test(s), "card_number must be 16 digits"),
  bank_name: z.string().min(2).max(120),
  holder_name: z.string().min(2).max(120),
});
const walletSchema = z.object({
  phone: z.string().regex(phoneRe, "phone must be in E.164 format"),
});
const otherSchema = z.object({ note: z.string().min(1).max(300) });
const cashSchema = z.object({}).strict();

const bodySchema = z.object({
  method: z.enum(["bank", "click", "payme", "cash", "other"]),
  details: z.record(z.string(), z.unknown()).default({}),
  step_up_token: z.string().min(8),
});

export const Route = createFileRoute("/api/public/hooks/update-payout-details")({
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
        const { method, details, step_up_token } = parsed.data;

        let validatedDetails: Record<string, unknown> = {};
        try {
          if (method === "bank") validatedDetails = bankSchema.parse(details);
          else if (method === "click" || method === "payme") validatedDetails = walletSchema.parse(details);
          else if (method === "cash") validatedDetails = cashSchema.parse(details);
          else validatedDetails = otherSchema.parse(details);
        } catch (e: any) {
          return Response.json(
            { error: "BadRequest", message: e?.issues?.[0]?.message ?? "Invalid details" },
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

        const ok = await consumeStepUpToken(userId, step_up_token, "update_payout_details");
        if (!ok) {
          return Response.json(
            { error: "StepUpRequired", message: "Re-run payout-step-up/start and verify to obtain a fresh token." },
            { status: 403, headers: cors },
          );
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: guide } = await supabaseAdmin
          .from("guides")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();
        if (!guide) {
          return Response.json(
            { error: "NotFound", message: "You are not linked to a guide profile yet." },
            { status: 404, headers: cors },
          );
        }

        const { error: updErr } = await supabaseAdmin
          .from("guides")
          .update({
            payout_method: method,
            payout_details: validatedDetails,
            payout_details_updated_at: new Date().toISOString(),
          })
          .eq("id", (guide as any).id);
        if (updErr) {
          return Response.json(
            { error: "DBError", message: updErr.message },
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
            type: "payout_details_changed",
            title: "Guide changed payout details",
            body: `Guide ${(guide as any).id} updated payout method to ${method}.`,
            data: { guide_id: (guide as any).id, method },
          }));
          if (rows.length) await supabaseAdmin.from("notifications").insert(rows as any);
        } catch {
          /* best-effort */
        }

        return Response.json({ ok: true }, { headers: cors });
      },
    },
  },
});

/**
 * Return a short-lived signed URL to download a guide earnings report
 * (monthly / annual / tax) as PDF or CSV.
 *
 * Auth: Authorization: Bearer <supabase user access_token>.
 * Method: POST
 * Body: {
 *   kind: 'monthly' | 'annual' | 'tax',
 *   period: string,   // monthly/tax: 'YYYY-MM'; annual: 'YYYY'
 *   format?: 'pdf' | 'csv',  // default 'pdf'
 * }
 * Response: { url: string, filename: string, expires_in: number }
 *
 * The URL points at GET /api/earnings/report?... with an HMAC token
 * (signReportToken). No file is stored — the endpoint streams the file
 * on demand. Token has no expiry by itself; treat `expires_in` as a UX
 * hint (~ 1 hour) and re-request when the user retries later.
 */
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { signReportToken, type ReportKind } from "@/lib/earnings-report.server";

function cors(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    "Access-Control-Max-Age": "86400",
  };
}

const bodySchema = z.object({
  kind: z.enum(["monthly", "annual", "tax"]),
  period: z.string().min(4).max(10),
  format: z.enum(["pdf", "csv"]).optional().default("pdf"),
});

export const Route = createFileRoute("/api/public/hooks/my-report-url")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors() }),

      POST: async ({ request }) => {
        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.toLowerCase().startsWith("bearer ")
          ? authHeader.slice(7).trim()
          : "";
        if (!token) {
          return Response.json(
            { error: "Unauthorized", message: "Missing bearer token" },
            { status: 401, headers: cors() },
          );
        }

        const url = process.env.SUPABASE_URL;
        const pk = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!url || !pk) {
          return Response.json(
            { error: "ServerError", message: "Supabase env missing" },
            { status: 500, headers: cors() },
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
            { status: 401, headers: cors() },
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
            { status: 400, headers: cors() },
          );
        }
        const parsed = bodySchema.safeParse(raw);
        if (!parsed.success) {
          return Response.json(
            { error: "BadRequest", message: parsed.error.issues[0]?.message ?? "Invalid input" },
            { status: 400, headers: cors() },
          );
        }

        // Validate period format
        const { kind, period, format } = parsed.data;
        const okMonth = /^\d{4}-\d{2}$/.test(period);
        const okYear = /^\d{4}$/.test(period);
        if ((kind === "annual" && !okYear) || (kind !== "annual" && !okMonth)) {
          return Response.json(
            { error: "BadRequest", message: "period must be YYYY-MM (monthly/tax) or YYYY (annual)" },
            { status: 400, headers: cors() },
          );
        }

        const { data: guide } = await sb
          .from("guides")
          .select("id, name")
          .eq("user_id", userId)
          .maybeSingle();
        if (!guide) {
          return Response.json(
            { error: "NotFound", message: "You are not linked to a guide profile yet." },
            { status: 404, headers: cors() },
          );
        }
        const guideId = (guide as any).id as string;
        const guideName = ((guide as any).name as string) ?? "guide";

        const signed = signReportToken({ guideId, kind: kind as ReportKind, period });
        const origin = new URL(request.url).origin;
        const link = new URL("/api/earnings/report", origin);
        link.searchParams.set("guide_id", guideId);
        link.searchParams.set("kind", kind);
        link.searchParams.set("period", period);
        link.searchParams.set("format", format);
        link.searchParams.set("token", signed);

        const safeName = guideName.replace(/[^\p{L}\p{N}_-]+/gu, "_");
        const filename = `hamroh-${kind}-${safeName}-${period}.${format}`;

        return Response.json(
          {
            url: link.toString(),
            filename,
            expires_in: 3600,
          },
          { headers: cors() },
        );
      },
    },
  },
});

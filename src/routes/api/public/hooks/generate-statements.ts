/**
 * Auto-generate monthly Net Settlement statements.
 *
 * Default behavior: generate statements for the *previous* month (UTC) and
 * notify each guide on Telegram. Idempotent — re-running the same period
 * upserts existing statements.
 *
 * Optional body params (all optional):
 *   { year?: number, month?: number, notify?: boolean }
 *
 * Auth: Supabase publishable/anon key in `Authorization: Bearer …` or `apikey` header.
 */

import { createClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";
import {
  generateStatementsForPeriod,
  notifyGuideStatement,
} from "@/lib/statements.server";

export const Route = createFileRoute("/api/public/hooks/generate-statements")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth =
          request.headers.get("authorization") ??
          request.headers.get("apikey") ??
          "";
        const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : auth.trim();
        const expected =
          process.env.SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        if (!token || !expected || token !== expected) {
          return Response.json({ error: "Forbidden" }, { status: 403 });
        }

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!supabaseUrl || !serviceKey) {
          return Response.json({ error: "Server misconfigured" }, { status: 500 });
        }
        const supabase = createClient(supabaseUrl, serviceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        // Parse optional body
        let body: { year?: number; month?: number; notify?: boolean } = {};
        try {
          const text = await request.text();
          if (text) body = JSON.parse(text);
        } catch {
          // ignore — empty body is OK
        }

        // Default: previous month (UTC)
        let year = body.year;
        let month = body.month;
        if (!year || !month) {
          const now = new Date();
          const prev = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
          year = prev.getUTCFullYear();
          month = prev.getUTCMonth() + 1;
        }
        const notify = body.notify !== false; // default true

        try {
          const results = await generateStatementsForPeriod(supabase, year, month);
          let notified = 0;
          if (notify) {
            for (const r of results) {
              if (await notifyGuideStatement(supabase, r, year, month)) notified++;
            }
          }
          return Response.json({
            ok: true,
            period: { year, month },
            generated: results.length,
            notified,
          });
        } catch (e: any) {
          console.error("generate-statements failed", e);
          return Response.json(
            { error: e?.message ?? "Internal error" },
            { status: 500 },
          );
        }
      },
    },
  },
});

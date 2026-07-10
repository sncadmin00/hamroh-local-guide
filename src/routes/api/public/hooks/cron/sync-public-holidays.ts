/**
 * POST /api/public/hooks/cron/sync-public-holidays
 * Body (optional): { year?: number, country?: string }
 * Fetches national holidays from Calendarific and upserts them into
 * public.local_events as global (city_id = NULL, kind = 'holiday') rows.
 * Idempotent via external_id.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/cron/sync-public-holidays")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.CALENDARIFIC_API_KEY;
        if (!apiKey) {
          return Response.json({ error: "CALENDARIFIC_API_KEY not configured" }, { status: 500 });
        }

        let body: { year?: number; country?: string } = {};
        try {
          body = await request.json();
        } catch {
          /* empty body ok */
        }
        const country = (body.country ?? "UZ").toUpperCase();
        const year = body.year ?? new Date().getUTCFullYear();

        const url = `https://calendarific.com/api/v2/holidays?api_key=${apiKey}&country=${country}&year=${year}&type=national`;
        const res = await fetch(url);
        if (!res.ok) {
          return Response.json({ error: `Calendarific ${res.status}` }, { status: 502 });
        }
        const json = (await res.json()) as {
          response?: { holidays?: Array<{ name: string; description?: string; date: { iso: string }; canonical_url?: string; urlid?: string }> };
        };
        const holidays = json.response?.holidays ?? [];

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const rows = holidays.map((h) => {
          const date = h.date.iso.slice(0, 10);
          const externalId = `calendarific:${country}:${year}:${h.urlid ?? h.name.toLowerCase().replace(/\s+/g, "-")}:${date}`;
          return {
            external_id: externalId,
            title: h.name,
            description: h.description ?? null,
            date_start: date,
            date_end: date,
            source_url: h.canonical_url ?? null,
            kind: "holiday",
            city_id: null as string | null,
            is_published: true,
            sort_order: 0,
          };
        });

        if (rows.length === 0) {
          return Response.json({ ok: true, year, country, upserted: 0 });
        }

        const { error } = await supabaseAdmin
          .from("local_events")
          .upsert(rows as never, { onConflict: "external_id" });

        if (error) {
          return Response.json({ error: error.message }, { status: 500 });
        }
        return Response.json({ ok: true, year, country, upserted: rows.length });
      },
    },
  },
});

/**
 * GET /api/public/hooks/local-events?city_id=<uuid>&from=YYYY-MM-DD&to=YYYY-MM-DD
 * Public. Returns published local events overlapping the [from, to] window
 * for a given city. If from/to omitted, returns future events (date_end >= today).
 */
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const cors: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const Route = createFileRoute("/api/public/hooks/local-events")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const cityId = url.searchParams.get("city_id");
        const from = url.searchParams.get("from");
        const to = url.searchParams.get("to");

        if (from && !DATE_RE.test(from)) {
          return Response.json({ error: "Invalid 'from' (YYYY-MM-DD)" }, { status: 400, headers: cors });
        }
        if (to && !DATE_RE.test(to)) {
          return Response.json({ error: "Invalid 'to' (YYYY-MM-DD)" }, { status: 400, headers: cors });
        }

        const supabase = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          { auth: { persistSession: false, autoRefreshToken: false, storage: undefined } },
        );

        let q = supabase
          .from("local_events")
          .select("id, city_id, title, description, date_start, date_end, cover_url, source_url, sort_order")
          .eq("is_published", true);

        if (cityId) q = q.eq("city_id", cityId);

        // Overlap: event.date_start <= to AND event.date_end >= from
        const today = new Date().toISOString().slice(0, 10);
        const fromDate = from ?? today;
        q = q.gte("date_end", fromDate);
        if (to) q = q.lte("date_start", to);

        const { data, error } = await q
          .order("date_start", { ascending: true })
          .order("sort_order", { ascending: true });
        if (error) {
          return Response.json({ error: error.message }, { status: 500, headers: cors });
        }
        return Response.json({ items: data ?? [] }, { headers: cors });
      },
    },
  },
});

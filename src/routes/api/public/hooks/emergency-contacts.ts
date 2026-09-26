/**
 * GET /api/public/hooks/emergency-contacts?city_id=<uuid>
 * Public. Returns published emergency/useful contacts, optionally scoped
 * to a city (with global entries — city_id IS NULL — always included).
 * Sorted by sort_order, then label.
 * Optional ?lang=ru|uz|en: `label` / `notes` are returned in that language
 * (falls back to ru, then the original text). Raw label_*/notes_* are included too.
 */
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const cors: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

export const Route = createFileRoute("/api/public/hooks/emergency-contacts")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const cityId = url.searchParams.get("city_id");
        const langRaw = (url.searchParams.get("lang") ?? "").toLowerCase().slice(0, 2);
        const lang = ["ru", "uz", "en"].includes(langRaw) ? langRaw : null;

        const supabase = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          { auth: { persistSession: false, autoRefreshToken: false, storage: undefined } },
        );

        let q = supabase
          .from("emergency_contacts")
          .select("id, city_id, kind, category, label, phone, country_code, notes, sort_order, label_ru, label_uz, label_en, notes_ru, notes_uz, notes_en")
          .eq("is_published", true);

        if (cityId) {
          q = q.or(`city_id.eq.${cityId},city_id.is.null`);
        }

        const { data, error } = await q.order("sort_order", { ascending: true }).order("label", { ascending: true });
        if (error) {
          return Response.json({ error: error.message }, { status: 500, headers: cors });
        }
        const items = (data ?? []).map((r: any) => ({
          ...r,
          label: (lang && r[`label_${lang}`]) || r.label_ru || r.label,
          notes: (lang && r[`notes_${lang}`]) || r.notes_ru || r.notes,
        }));
        return Response.json({ items }, { headers: cors });
      },
    },
  },
});

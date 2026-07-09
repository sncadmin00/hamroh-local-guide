/**
 * Public reference endpoint: active site languages + localized field groups
 * for the `tours` table. Consumers (e.g. mobile app) build localized column
 * names dynamically as `${group}_${code}` instead of hardcoding them.
 *
 * No auth required — read-only reference data.
 */

import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const LOCALIZED_FIELD_GROUPS = [
  "title",
  "short_description",
  "description_md",
  "highlights",
  "included",
  "not_included",
] as const;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
} as const;

export const Route = createFileRoute("/api/public/site-languages")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      GET: async () => {
        const supabase = createClient<Database>(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
        );

        const { data, error } = await supabase
          .from("languages")
          .select("code, name, sort_order")
          .eq("is_active", true)
          .order("sort_order", { ascending: true });

        if (error) {
          return Response.json(
            { error: "Failed to load site languages" },
            { status: 500, headers: CORS_HEADERS },
          );
        }

        return Response.json(
          {
            languages: data ?? [],
            localized_field_groups: LOCALIZED_FIELD_GROUPS,
          },
          {
            headers: {
              ...CORS_HEADERS,
              "Cache-Control": "public, max-age=60, s-maxage=300",
            },
          },
        );
      },
    },
  },
});

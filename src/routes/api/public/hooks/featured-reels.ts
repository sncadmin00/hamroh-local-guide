/**
 * Public hook: list featured guide reels for the home page.
 *
 * Method: GET
 * Query: ?limit=<n>  (default 12, max 50)
 * Returns: { items: Array<{ id, guide_id, guide_slug, guide_name,
 *   video_url, thumbnail_url, caption, duration_seconds, created_at }> }
 *
 * Video URLs are signed (TTL 1h). Only posts that are visible AND
 * featured_on_home from a public/verified guide are returned.
 */
import { createFileRoute } from "@tanstack/react-router";

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Max-Age": "86400",
  };
}

const BUCKET = "guide-posts";
const SIGN_TTL = 3600;

export const Route = createFileRoute("/api/public/hooks/featured-reels")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders() }),

      GET: async ({ request }) => {
        const url = new URL(request.url);
        const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 12) || 12, 1), 50);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabaseAdmin as any)
          .from("guide_posts")
          .select("id, guide_id, video_path, thumbnail_url, caption, duration_seconds, created_at, guides!inner(slug, name, verified)")
          .eq("visible", true)
          .eq("featured_on_home", true)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: false })
          .limit(limit);

        if (error) {
          return Response.json({ error: error.message }, { status: 500, headers: corsHeaders() });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rows = (data ?? []) as any[];
        const isStoragePath = (p: unknown): p is string => typeof p === "string" && !!p && !/^https?:\/\//i.test(p);
        const paths = [
          ...rows.map((r) => r.video_path).filter((p): p is string => !!p),
          ...rows.map((r) => r.thumbnail_url).filter(isStoragePath),
        ];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: signed } = await (supabaseAdmin as any).storage.from(BUCKET).createSignedUrls(paths, SIGN_TTL);
        const signedMap = new Map<string, string>();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (signed ?? []).forEach((s: any) => {
          if (s?.path && s?.signedUrl) signedMap.set(s.path, s.signedUrl);
        });

        const items = rows.map((r) => ({
          id: r.id,
          guide_id: r.guide_id,
          guide_slug: r.guides?.slug ?? null,
          guide_name: r.guides?.name ?? null,
          video_url: r.video_path ? signedMap.get(r.video_path) ?? null : null,
          thumbnail_url: r.thumbnail_url
            ? signedMap.get(r.thumbnail_url) ?? r.thumbnail_url
            : null,
          caption: r.caption ?? "",
          duration_seconds: r.duration_seconds ?? null,
          created_at: r.created_at,
        }));

        return Response.json({ items }, { headers: corsHeaders() });
      },
    },
  },
});

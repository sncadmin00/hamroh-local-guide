/**
 * Public hook: list visible reels for a specific guide.
 *
 * Method: GET
 * Query: ?guide_id=<uuid>  OR  ?guide_slug=<slug>
 * Returns: { items: Array<{ id, video_url, thumbnail_url, caption,
 *   duration_seconds, created_at }> } — signed URLs (TTL 1h).
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

export const Route = createFileRoute("/api/public/hooks/guide-reels")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders() }),

      GET: async ({ request }) => {
        const url = new URL(request.url);
        const guideId = url.searchParams.get("guide_id");
        const guideSlug = url.searchParams.get("guide_slug");
        if (!guideId && !guideSlug) {
          return Response.json({ error: "Missing guide_id or guide_slug" }, { status: 400, headers: corsHeaders() });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        let resolvedGuideId = guideId;
        if (!resolvedGuideId && guideSlug) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: g } = await (supabaseAdmin as any)
            .from("guides").select("id").eq("slug", guideSlug).maybeSingle();
          resolvedGuideId = g?.id ?? null;
        }
        if (!resolvedGuideId) {
          return Response.json({ items: [] }, { headers: corsHeaders() });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabaseAdmin as any)
          .from("guide_posts")
          .select("id, video_path, thumbnail_url, caption, duration_seconds, created_at")
          .eq("guide_id", resolvedGuideId)
          .eq("visible", true)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) {
          return Response.json({ error: error.message }, { status: 500, headers: corsHeaders() });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rows = (data ?? []) as any[];
        const paths = rows.map((r) => r.video_path).filter((p): p is string => !!p);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: signed } = await (supabaseAdmin as any).storage.from(BUCKET).createSignedUrls(paths, SIGN_TTL);
        const signedMap = new Map<string, string>();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (signed ?? []).forEach((s: any) => { if (s?.path && s?.signedUrl) signedMap.set(s.path, s.signedUrl); });

        const items = rows.map((r) => ({
          id: r.id,
          video_url: r.video_path ? signedMap.get(r.video_path) ?? null : null,
          thumbnail_url: r.thumbnail_url ?? null,
          caption: r.caption ?? "",
          duration_seconds: r.duration_seconds ?? null,
          created_at: r.created_at,
        }));

        return Response.json({ items }, { headers: corsHeaders() });
      },
    },
  },
});

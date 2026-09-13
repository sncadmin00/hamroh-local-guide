/**
 * Public hook: full-screen Reels feed — ALL visible guide reels (not just
 * featured_on_home) from verified, published guides.
 *
 * Method: GET
 * Query:
 *   ?limit=<n>      (default 20, max 50)
 *   ?cursor=<token> (opaque; pass `next_cursor` from the previous response)
 *
 * Returns:
 * {
 *   items: Array<{
 *     id, guide_id, guide_slug, guide_name, featured_on_home,
 *     video_url, thumbnail_url, caption, duration_seconds, created_at
 *   }>,
 *   next_cursor: string | null,   // pass as ?cursor= for the next page; null = no more
 *   has_more: boolean
 * }
 *
 * Cursor pagination is keyset-based on (created_at DESC, id DESC), so it is
 * stable as new reels arrive. video_url / thumbnail_url are signed (TTL 1h).
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
const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

function decodeCursor(cursor: string | null): { created_at: string; id: string } | null {
  if (!cursor) return null;
  try {
    const raw = Buffer.from(cursor, "base64url").toString("utf8");
    const idx = raw.lastIndexOf("|");
    if (idx <= 0) return null;
    const created_at = raw.slice(0, idx);
    const id = raw.slice(idx + 1);
    if (!created_at || !id) return null;
    return { created_at, id };
  } catch {
    return null;
  }
}

function encodeCursor(createdAt: string, id: string): string {
  return Buffer.from(`${createdAt}|${id}`, "utf8").toString("base64url");
}

export const Route = createFileRoute("/api/public/hooks/all-reels")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders() }),

      GET: async ({ request }) => {
        const url = new URL(request.url);
        const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? DEFAULT_LIMIT) || DEFAULT_LIMIT, 1), MAX_LIMIT);
        const cursor = decodeCursor(url.searchParams.get("cursor"));
        if (url.searchParams.get("cursor") && !cursor) {
          return Response.json({ error: "Invalid cursor" }, { status: 400, headers: corsHeaders() });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let query = (supabaseAdmin as any)
          .from("guide_posts")
          .select("id, guide_id, video_path, thumbnail_url, caption, duration_seconds, created_at, featured_on_home, guides!inner(slug, name, verified)")
          .eq("visible", true)
          .eq("guides.verified", true)
          .eq("guides.published", true)
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .limit(limit + 1); // fetch one extra row to compute has_more

        if (cursor) {
          // keyset: rows strictly after the cursor position
          query = query.or(
            `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`,
          );
        }

        const { data, error } = await query;
        if (error) {
          return Response.json({ error: error.message }, { status: 500, headers: corsHeaders() });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rows = ((data ?? []) as any[]);
        const hasMore = rows.length > limit;
        const page = rows.slice(0, limit);

        const isStoragePath = (p: unknown): p is string => typeof p === "string" && !!p && !/^https?:\/\//i.test(p);
        const paths = [
          ...page.map((r) => r.video_path).filter((p): p is string => !!p),
          ...page.map((r) => r.thumbnail_url).filter(isStoragePath),
        ];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: signed } = await (supabaseAdmin as any).storage.from(BUCKET).createSignedUrls(paths, SIGN_TTL);
        const signedMap = new Map<string, string>();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (signed ?? []).forEach((s: any) => {
          if (s?.path && s?.signedUrl) signedMap.set(s.path, s.signedUrl);
        });

        const items = page.map((r) => ({
          id: r.id,
          guide_id: r.guide_id,
          guide_slug: r.guides?.slug ?? null,
          guide_name: r.guides?.name ?? null,
          featured_on_home: !!r.featured_on_home,
          video_url: r.video_path ? signedMap.get(r.video_path) ?? null : null,
          thumbnail_url: r.thumbnail_url ? signedMap.get(r.thumbnail_url) ?? r.thumbnail_url : null,
          caption: r.caption ?? "",
          duration_seconds: r.duration_seconds ?? null,
          created_at: r.created_at,
        }));

        const last = page[page.length - 1];
        const next_cursor = hasMore && last ? encodeCursor(last.created_at, last.id) : null;

        return Response.json({ items, next_cursor, has_more: hasMore }, { headers: corsHeaders() });
      },
    },
  },
});

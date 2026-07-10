/**
 * Public hook: signed URLs for a guide's own post (owner preview).
 *
 * POST /api/public/hooks/my-guide-post-signed-urls
 *   body: { id: uuid, ttlSeconds?: number (60..3600, default 3600) }
 *   -> { video_url, thumbnail_url }
 *
 * Auth: guide JWT. Server verifies the post belongs to the caller's guide.
 * Note: public viewer signed URLs are available at
 *   GET /api/public/hooks/guide-reels?guide_id=...  (list all visible)
 */
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    "Access-Control-Max-Age": "86400",
  };
}

const BodySchema = z.object({
  id: z.string().uuid(),
  ttlSeconds: z.number().int().min(60).max(3600).default(3600),
});

async function resolveUser(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim() : "";
  if (!token) return { error: "Missing bearer token", status: 401 as const };
  const url = process.env.SUPABASE_URL;
  const pk = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !pk) return { error: "Supabase env missing", status: 500 as const };
  const auth = createClient(url, pk, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
  });
  const { data, error } = await auth.auth.getUser(token);
  if (error || !data?.user) return { error: "Invalid or expired token", status: 401 as const };
  return { userId: data.user.id };
}

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: corsHeaders() });
}

export const Route = createFileRoute("/api/public/hooks/my-guide-post-signed-urls")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders() }),

      POST: async ({ request }) => {
        const auth = await resolveUser(request);
        if ("error" in auth) return json({ error: "Unauthorized", message: auth.error }, auth.status);

        let raw: unknown;
        try { raw = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
        const parsed = BodySchema.safeParse(raw);
        if (!parsed.success) return json({ error: "Validation error", details: parsed.error.flatten() }, 400);
        const { id, ttlSeconds } = parsed.data;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const s = supabaseAdmin as any;
        const { data: guide } = await s.from("guides").select("id").eq("user_id", auth.userId).maybeSingle();
        if (!guide) return json({ error: "Guide profile not found" }, 404);

        const { data: row, error } = await s.from("guide_posts")
          .select("video_path, thumbnail_url, guide_id").eq("id", id).maybeSingle();
        if (error) return json({ error: error.message }, 500);
        if (!row || row.guide_id !== guide.id) return json({ error: "Post not found" }, 404);

        const paths: string[] = [row.video_path];
        if (row.thumbnail_url) paths.push(row.thumbnail_url);
        const { data: signed, error: e2 } = await s.storage.from("guide-posts").createSignedUrls(paths, ttlSeconds);
        if (e2) return json({ error: e2.message }, 500);
        const byPath = new Map(((signed ?? []) as Array<{ path: string; signedUrl: string }>).map((r) => [r.path, r.signedUrl] as const));
        return json({
          video_url: byPath.get(row.video_path) ?? null,
          thumbnail_url: row.thumbnail_url ? byPath.get(row.thumbnail_url) ?? null : null,
        });
      },
    },
  },
});

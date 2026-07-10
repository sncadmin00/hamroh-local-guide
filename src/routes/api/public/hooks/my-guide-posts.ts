/**
 * Public hooks: guide's own posts (reels) CRUD for mobile.
 *
 * `public.guide_posts` has no GRANTs to anon/authenticated, so mobile
 * clients must go through these hooks. Auth by guide JWT; server uses
 * service_role, scoped strictly to auth.uid()'s own guide row.
 *
 * GET  /api/public/hooks/my-guide-posts
 *   -> { guide_id, posts: [...] }
 *
 * POST /api/public/hooks/my-guide-posts
 *   body: { action: "create" | "update" | "delete" | "toggle_visible"
 *         | "toggle_featured" | "reorder", ...fields }
 *
 * Actions:
 *  - create:          { video_path, thumbnail_url?, caption?, duration_seconds?, width?, height?, size_bytes? }
 *                     -> { ok, id }
 *  - update:          { id, caption }                              -> { ok }
 *  - delete:          { id }                                       -> { ok }
 *  - toggle_visible:  { id }                                       -> { ok, visible }
 *  - toggle_featured: { id }                                       -> { ok, featured_on_home }
 *  - reorder:         { id, direction: "up"|"down" }               -> { ok }
 *
 * Post limits enforced here + DB trigger guide_posts_enforce_limit (max 20 / guide).
 * Media limits: duration_seconds ≤ 90, size_bytes ≤ 50MB.
 */
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const MAX_DURATION_SEC = 90;
const MAX_BYTES = 50 * 1024 * 1024;
const MAX_POSTS_PER_GUIDE = 20;

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    "Access-Control-Max-Age": "86400",
  };
}

async function resolveUser(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getOwnedGuideId(supabaseAdmin: any, userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("guides").select("id").eq("user_id", userId).maybeSingle();
  return data?.id ?? null;
}

const createSchema = z.object({
  action: z.literal("create"),
  video_path: z.string().min(1).max(500),
  thumbnail_url: z.string().min(1).max(500).nullable().optional(),
  caption: z.string().trim().max(500).default(""),
  duration_seconds: z.number().int().positive().max(MAX_DURATION_SEC).optional(),
  width: z.number().int().positive().max(10000).optional(),
  height: z.number().int().positive().max(10000).optional(),
  size_bytes: z.number().int().positive().max(MAX_BYTES).optional(),
});

const idSchema = z.object({ id: z.string().uuid() });
const updateSchema = z.object({ action: z.literal("update"), id: z.string().uuid(), caption: z.string().trim().max(500) });
const deleteSchema = z.object({ action: z.literal("delete") }).merge(idSchema);
const toggleVisibleSchema = z.object({ action: z.literal("toggle_visible") }).merge(idSchema);
const toggleFeaturedSchema = z.object({ action: z.literal("toggle_featured") }).merge(idSchema);
const reorderSchema = z.object({
  action: z.literal("reorder"),
  id: z.string().uuid(),
  direction: z.enum(["up", "down"]),
});

const bodySchema = z.discriminatedUnion("action", [
  createSchema,
  updateSchema,
  deleteSchema,
  toggleVisibleSchema,
  toggleFeaturedSchema,
  reorderSchema,
]);

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: corsHeaders() });
}

export const Route = createFileRoute("/api/public/hooks/my-guide-posts")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders() }),

      GET: async ({ request }) => {
        const auth = await resolveUser(request);
        if ("error" in auth) return json({ error: "Unauthorized", message: auth.error }, auth.status);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const guideId = await getOwnedGuideId(supabaseAdmin, auth.userId);
        if (!guideId) return json({ error: "Guide profile not found" }, 404);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabaseAdmin as any)
          .from("guide_posts")
          .select("id, video_path, thumbnail_url, caption, visible, sort_order, featured_on_home, duration_seconds, width, height, size_bytes, created_at")
          .eq("guide_id", guideId)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: false });
        if (error) return json({ error: error.message }, 500);
        return json({ guide_id: guideId, posts: data ?? [] });
      },

      POST: async ({ request }) => {
        const auth = await resolveUser(request);
        if ("error" in auth) return json({ error: "Unauthorized", message: auth.error }, auth.status);

        let raw: unknown;
        try { raw = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
        const parsed = bodySchema.safeParse(raw);
        if (!parsed.success) return json({ error: "Validation error", details: parsed.error.flatten() }, 400);
        const input = parsed.data;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const guideId = await getOwnedGuideId(supabaseAdmin, auth.userId);
        if (!guideId) return json({ error: "Guide profile not found" }, 404);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const s = supabaseAdmin as any;

        // Helper: ensure the post belongs to this guide.
        async function ownRow(id: string) {
          const { data } = await s.from("guide_posts")
            .select("id, guide_id, visible, featured_on_home, video_path, thumbnail_url, sort_order")
            .eq("id", id).maybeSingle();
          if (!data || data.guide_id !== guideId) return null;
          return data as {
            id: string; guide_id: string; visible: boolean; featured_on_home: boolean;
            video_path: string; thumbnail_url: string | null; sort_order: number;
          };
        }

        if (input.action === "create") {
          if (!input.video_path.startsWith(`${guideId}/`)) {
            return json({ error: "video_path must start with your guide id" }, 400);
          }
          const { count } = await s.from("guide_posts")
            .select("*", { count: "exact", head: true }).eq("guide_id", guideId);
          if ((count ?? 0) >= MAX_POSTS_PER_GUIDE) {
            return json({ error: `Limit reached: max ${MAX_POSTS_PER_GUIDE} posts` }, 400);
          }
          const { data: maxRow } = await s.from("guide_posts")
            .select("sort_order").eq("guide_id", guideId)
            .order("sort_order", { ascending: false }).limit(1).maybeSingle();
          const nextOrder = (maxRow?.sort_order ?? -1) + 1;
          const { data: inserted, error } = await s.from("guide_posts").insert({
            guide_id: guideId,
            video_path: input.video_path,
            thumbnail_url: input.thumbnail_url ?? null,
            caption: input.caption ?? "",
            duration_seconds: input.duration_seconds ?? null,
            width: input.width ?? null,
            height: input.height ?? null,
            size_bytes: input.size_bytes ?? null,
            media_type: "reel",
            sort_order: nextOrder,
            visible: true,
          }).select("id").maybeSingle();
          if (error) return json({ error: error.message }, 400);
          return json({ ok: true, id: inserted?.id });
        }

        if (input.action === "update") {
          const row = await ownRow(input.id);
          if (!row) return json({ error: "Post not found" }, 404);
          const { error } = await s.from("guide_posts")
            .update({ caption: input.caption }).eq("id", input.id);
          if (error) return json({ error: error.message }, 400);
          return json({ ok: true });
        }

        if (input.action === "toggle_visible") {
          const row = await ownRow(input.id);
          if (!row) return json({ error: "Post not found" }, 404);
          const next = !row.visible;
          const { error } = await s.from("guide_posts").update({ visible: next }).eq("id", input.id);
          if (error) return json({ error: error.message }, 400);
          return json({ ok: true, visible: next });
        }

        if (input.action === "toggle_featured") {
          const row = await ownRow(input.id);
          if (!row) return json({ error: "Post not found" }, 404);
          const next = !row.featured_on_home;
          const { error } = await s.from("guide_posts").update({ featured_on_home: next }).eq("id", input.id);
          if (error) return json({ error: error.message }, 400);
          return json({ ok: true, featured_on_home: next });
        }

        if (input.action === "delete") {
          const row = await ownRow(input.id);
          if (!row) return json({ error: "Post not found" }, 404);
          const { error } = await s.from("guide_posts").delete().eq("id", input.id);
          if (error) return json({ error: error.message }, 400);
          const toRemove: string[] = [];
          if (row.video_path) toRemove.push(row.video_path);
          if (row.thumbnail_url && row.thumbnail_url.startsWith(`${guideId}/`)) toRemove.push(row.thumbnail_url);
          if (toRemove.length > 0) {
            await s.storage.from("guide-posts").remove(toRemove).catch(() => {});
          }
          return json({ ok: true });
        }

        if (input.action === "reorder") {
          const { data: rows, error } = await s.from("guide_posts")
            .select("id, sort_order").eq("guide_id", guideId)
            .order("sort_order", { ascending: true });
          if (error) return json({ error: error.message }, 400);
          const list: Array<{ id: string; sort_order: number }> = rows ?? [];
          const idx = list.findIndex((r) => r.id === input.id);
          if (idx < 0) return json({ error: "Post not found" }, 404);
          const targetIdx = input.direction === "up" ? idx - 1 : idx + 1;
          if (targetIdx < 0 || targetIdx >= list.length) return json({ ok: true });
          const a = list[idx];
          const b = list[targetIdx];
          await s.from("guide_posts").update({ sort_order: -1 }).eq("id", a.id);
          await s.from("guide_posts").update({ sort_order: a.sort_order }).eq("id", b.id);
          await s.from("guide_posts").update({ sort_order: b.sort_order }).eq("id", a.id);
          return json({ ok: true });
        }

        return json({ error: "Unknown action" }, 400);
      },
    },
  },
});

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MAX_POSTS_PER_GUIDE = 20;
const MAX_DURATION_SEC = 90;
const MAX_BYTES = 50 * 1024 * 1024;

// Auth-middleware Supabase client; we use `any` locally to avoid deep generic types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getOwnedGuideId(supabase: any, userId: string): Promise<string> {
  const { data, error } = await supabase
    .from("guides")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("No guide profile linked to your account");
  return data.id as string;
}

export const listMyGuidePosts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const guideId = await getOwnedGuideId(supabase, userId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("guide_posts")
      .select("id, video_path, thumbnail_url, caption, visible, sort_order, featured_on_home, duration_seconds, width, height, size_bytes, created_at")
      .eq("guide_id", guideId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { guideId, posts: (data ?? []) as Array<{
      id: string;
      video_path: string;
      thumbnail_url: string | null;
      caption: string;
      visible: boolean;
      sort_order: number;
      featured_on_home: boolean;
      duration_seconds: number | null;
      width: number | null;
      height: number | null;
      size_bytes: number | null;
      created_at: string;
    }> };
  });

export const toggleMyGuidePostFeatured = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const guideId = await getOwnedGuideId(supabase, userId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = supabase as any;
    const { data: row, error: e1 } = await s
      .from("guide_posts")
      .select("featured_on_home, guide_id")
      .eq("id", data.id)
      .maybeSingle();
    if (e1) throw new Error(e1.message);
    if (!row || row.guide_id !== guideId) throw new Error("Post not found");
    const next = !row.featured_on_home;
    const { error } = await s.from("guide_posts").update({ featured_on_home: next }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true, featured_on_home: next };
  });

const createSchema = z.object({
  video_path: z.string().min(1).max(500),
  thumbnail_url: z.string().min(1).max(500).nullable().optional(),
  caption: z.string().trim().max(500).default(""),
  duration_seconds: z.number().int().positive().max(MAX_DURATION_SEC).optional(),
  width: z.number().int().positive().max(10000).optional(),
  height: z.number().int().positive().max(10000).optional(),
  size_bytes: z.number().int().positive().max(MAX_BYTES).optional(),
});

export const createMyGuidePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => createSchema.parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const guideId = await getOwnedGuideId(supabase, userId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = supabase as any;

    // Ensure path is scoped to this guide: <guide_id>/<file>
    if (!data.video_path.startsWith(`${guideId}/`)) {
      throw new Error("Video path must start with your guide id");
    }

    const { count } = await s
      .from("guide_posts")
      .select("*", { count: "exact", head: true })
      .eq("guide_id", guideId);
    if ((count ?? 0) >= MAX_POSTS_PER_GUIDE) {
      throw new Error(`Limit reached: max ${MAX_POSTS_PER_GUIDE} posts`);
    }

    const { data: maxRow } = await s
      .from("guide_posts")
      .select("sort_order")
      .eq("guide_id", guideId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextOrder = (maxRow?.sort_order ?? -1) + 1;

    const { data: inserted, error } = await s
      .from("guide_posts")
      .insert({
        guide_id: guideId,
        video_path: data.video_path,
        thumbnail_url: data.thumbnail_url ?? null,
        caption: data.caption,
        duration_seconds: data.duration_seconds ?? null,
        width: data.width ?? null,
        height: data.height ?? null,
        size_bytes: data.size_bytes ?? null,
        media_type: "reel",
        sort_order: nextOrder,
        visible: true,
      })
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { ok: true, id: inserted?.id as string | undefined };
  });

const updateSchema = z.object({
  id: z.string().uuid(),
  caption: z.string().trim().max(500).optional(),
});

export const updateMyGuidePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => updateSchema.parse(input))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = supabase as any;
    const patch: { caption?: string } = {};
    if (data.caption !== undefined) patch.caption = data.caption;
    const { error } = await s.from("guide_posts").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleMyGuidePostVisible = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = supabase as any;
    const { data: row, error: e1 } = await s
      .from("guide_posts").select("visible").eq("id", data.id).maybeSingle();
    if (e1) throw new Error(e1.message);
    if (!row) throw new Error("Post not found");
    const { error } = await s
      .from("guide_posts").update({ visible: !row.visible }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteMyGuidePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const guideId = await getOwnedGuideId(supabase, userId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = supabase as any;

    const { data: row } = await s
      .from("guide_posts")
      .select("video_path, thumbnail_url, guide_id")
      .eq("id", data.id)
      .maybeSingle();
    if (!row || row.guide_id !== guideId) throw new Error("Post not found");

    const { error } = await s.from("guide_posts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);

    // Best-effort storage cleanup (video + thumbnail, both under guide-posts bucket)
    const toRemove: string[] = [];
    if (row.video_path) toRemove.push(row.video_path);
    if (row.thumbnail_url && row.thumbnail_url.startsWith(`${guideId}/`)) toRemove.push(row.thumbnail_url);
    if (toRemove.length > 0) {
      await s.storage.from("guide-posts").remove(toRemove).catch(() => {});
    }
    return { ok: true };
  });

export const reorderMyGuidePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), direction: z.enum(["up", "down"]) }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const guideId = await getOwnedGuideId(supabase, userId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = supabase as any;

    const { data: rows, error } = await s
      .from("guide_posts")
      .select("id, sort_order")
      .eq("guide_id", guideId)
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    const list: Array<{ id: string; sort_order: number }> = rows ?? [];
    const idx = list.findIndex((r) => r.id === data.id);
    if (idx < 0) throw new Error("Post not found");
    const targetIdx = data.direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return { ok: true };
    const a = list[idx];
    const b = list[targetIdx];
    await s.from("guide_posts").update({ sort_order: -1 }).eq("id", a.id);
    await s.from("guide_posts").update({ sort_order: a.sort_order }).eq("id", b.id);
    await s.from("guide_posts").update({ sort_order: b.sort_order }).eq("id", a.id);
    return { ok: true };
  });

/**
 * Generate short-lived signed URLs for the current guide's own post (owner preview).
 * For public viewer signed URLs, use GET /api/public/hooks/guide-post-url?id=<postId>.
 */
export const getMyGuidePostSignedUrls = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid(), ttlSeconds: z.number().int().min(60).max(3600).default(3600) }).parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const guideId = await getOwnedGuideId(supabase, userId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = supabase as any;
    const { data: row, error } = await s
      .from("guide_posts")
      .select("video_path, thumbnail_url, guide_id")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row || row.guide_id !== guideId) throw new Error("Post not found");

    const paths: string[] = [row.video_path];
    if (row.thumbnail_url) paths.push(row.thumbnail_url);
    const { data: signed, error: e2 } = await s.storage.from("guide-posts").createSignedUrls(paths, data.ttlSeconds);
    if (e2) throw new Error(e2.message);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const arr = (signed ?? []) as Array<{ path: string; signedUrl: string }>;
    const byPath = new Map(arr.map((r) => [r.path, r.signedUrl] as const));
    return {
      video_url: byPath.get(row.video_path) ?? null,
      thumbnail_url: row.thumbnail_url ? byPath.get(row.thumbnail_url) ?? null : null,
    };
  });

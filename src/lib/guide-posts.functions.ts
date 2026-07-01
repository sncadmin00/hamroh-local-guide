import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MAX_POSTS_PER_GUIDE = 20;

const platformEnum = z.enum(["instagram", "facebook", "tiktok", "youtube", "other"]);

async function getOwnedGuideId(supabase: ReturnType<typeof Object>, userId: string): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
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
    const { data, error } = await supabase
      .from("guide_posts")
      .select("id, platform, thumbnail_url, caption, visible, sort_order, featured_on_home, created_at")
      .eq("guide_id", guideId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { guideId, posts: data ?? [] };
  });

export const toggleMyGuidePostFeatured = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const guideId = await getOwnedGuideId(supabase, userId);
    const { data: row, error: e1 } = await supabase
      .from("guide_posts")
      .select("featured_on_home, guide_id")
      .eq("id", data.id)
      .maybeSingle();
    if (e1) throw new Error(e1.message);
    if (!row || row.guide_id !== guideId) throw new Error("Post not found");
    const next = !row.featured_on_home;
    const { error } = await supabase
      .from("guide_posts")
      .update({ featured_on_home: next })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true, featured_on_home: next };
  });

const createSchema = z.object({
  platform: platformEnum,
  caption: z.string().trim().max(500).default(""),
  thumbnail_url: z.string().url().max(1000),
});

export const createMyGuidePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => createSchema.parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const guideId = await getOwnedGuideId(supabase, userId);

    const { count } = await supabase
      .from("guide_posts")
      .select("*", { count: "exact", head: true })
      .eq("guide_id", guideId);
    if ((count ?? 0) >= MAX_POSTS_PER_GUIDE) {
      throw new Error(`Limit reached: max ${MAX_POSTS_PER_GUIDE} posts`);
    }

    const { data: maxRow } = await supabase
      .from("guide_posts")
      .select("sort_order")
      .eq("guide_id", guideId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextOrder = (maxRow?.sort_order ?? -1) + 1;

    const { error } = await supabase.from("guide_posts").insert({
      guide_id: guideId,
      platform: data.platform,
      caption: data.caption,
      thumbnail_url: data.thumbnail_url,
      url: "",
      sort_order: nextOrder,
      visible: true,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const updateSchema = z.object({
  id: z.string().uuid(),
  platform: platformEnum.optional(),
  caption: z.string().trim().max(500).optional(),
});

export const updateMyGuidePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => updateSchema.parse(input))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const patch: { platform?: string; caption?: string } = {};
    if (data.platform !== undefined) patch.platform = data.platform;
    if (data.caption !== undefined) patch.caption = data.caption;
    const { error } = await supabase.from("guide_posts").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleMyGuidePostVisible = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: row, error: e1 } = await supabase
      .from("guide_posts").select("visible").eq("id", data.id).maybeSingle();
    if (e1) throw new Error(e1.message);
    if (!row) throw new Error("Post not found");
    const { error } = await supabase
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

    // Fetch row to find storage path
    const { data: row } = await supabase
      .from("guide_posts").select("thumbnail_url").eq("id", data.id).maybeSingle();

    const { error } = await supabase.from("guide_posts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);

    // Best-effort file delete (only if it's a guide-photos URL in our posts/<guideId>/ folder)
    if (row?.thumbnail_url) {
      const marker = `/guide-photos/posts/${guideId}/`;
      const idx = row.thumbnail_url.indexOf(marker);
      if (idx >= 0) {
        const path = `posts/${guideId}/` + row.thumbnail_url.slice(idx + marker.length);
        await supabase.storage.from("guide-photos").remove([path]).catch(() => {});
      }
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

    const { data: rows, error } = await supabase
      .from("guide_posts")
      .select("id, sort_order")
      .eq("guide_id", guideId)
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    const list = rows ?? [];
    const idx = list.findIndex((r) => r.id === data.id);
    if (idx < 0) throw new Error("Post not found");
    const targetIdx = data.direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return { ok: true };
    const a = list[idx];
    const b = list[targetIdx];
    // Swap sort_order. Use temp negative value to avoid unique conflicts (no unique here but safe)
    await supabase.from("guide_posts").update({ sort_order: -1 }).eq("id", a.id);
    await supabase.from("guide_posts").update({ sort_order: a.sort_order }).eq("id", b.id);
    await supabase.from("guide_posts").update({ sort_order: b.sort_order }).eq("id", a.id);
    return { ok: true };
  });

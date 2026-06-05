import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ---------- Guide-side ----------

// Save phone + passport image path (path inside guide-identity bucket).
// Submitting (re)sets identity_verified=false and timestamps.
export const submitIdentity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    phone: z.string().trim().min(5).max(40),
    passport_path: z.string().trim().min(1).max(500),
  }).parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: guide } = await supabase
      .from("guides").select("id").eq("user_id", userId).maybeSingle();
    if (!guide) throw new Error("Guide profile not found");
    const { error } = await supabase
      .from("guides")
      .update({
        identity_phone: data.phone,
        identity_passport_url: data.passport_path,
        identity_submitted_at: new Date().toISOString(),
        identity_verified: false,
        identity_rejected_reason: null,
      })
      .eq("id", guide.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const submitIntroVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    video_path: z.string().trim().min(1).max(500),
  }).parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: guide } = await supabase
      .from("guides").select("id").eq("user_id", userId).maybeSingle();
    if (!guide) throw new Error("Guide profile not found");
    const { error } = await supabase
      .from("guides")
      .update({
        intro_video_url: data.video_path,
        intro_video_submitted_at: new Date().toISOString(),
        intro_video_verified: false,
        intro_video_rejected_reason: null,
      })
      .eq("id", guide.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMyVerification = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("guides")
      .select("id, identity_verified, identity_phone, identity_passport_url, identity_submitted_at, identity_rejected_reason, intro_video_url, intro_video_verified, intro_video_submitted_at, intro_video_rejected_reason, completed_tours_count, avg_response_minutes, verified_languages")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

// ---------- Admin-side ----------

async function ensureAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Admin only");
}

export const adminListVerifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await ensureAdmin(userId);
    const { data, error } = await supabaseAdmin
      .from("guides")
      .select("id, name, slug, photo_url, identity_verified, identity_phone, identity_passport_url, identity_submitted_at, identity_rejected_reason, intro_video_url, intro_video_verified, intro_video_submitted_at, intro_video_rejected_reason")
      .or("identity_submitted_at.not.is.null,intro_video_submitted_at.not.is.null")
      .order("identity_submitted_at", { ascending: false, nullsFirst: false });
    if (error) throw new Error(error.message);

    // Generate signed urls for review
    const rows = await Promise.all((data ?? []).map(async (g: any) => {
      let passport_signed: string | null = null;
      let video_signed: string | null = null;
      if (g.identity_passport_url) {
        const { data: s } = await supabaseAdmin.storage.from("guide-identity").createSignedUrl(g.identity_passport_url, 3600);
        passport_signed = s?.signedUrl ?? null;
      }
      if (g.intro_video_url) {
        const { data: s } = await supabaseAdmin.storage.from("guide-intro-videos").createSignedUrl(g.intro_video_url, 3600);
        video_signed = s?.signedUrl ?? null;
      }
      return { ...g, passport_signed, video_signed };
    }));
    return rows;
  });

export const adminSetIdentity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    guide_id: z.string().uuid(),
    approved: z.boolean(),
    reason: z.string().trim().max(500).optional(),
  }).parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await ensureAdmin(userId);
    const { error } = await supabaseAdmin
      .from("guides")
      .update({
        identity_verified: data.approved,
        identity_rejected_reason: data.approved ? null : (data.reason ?? "Rejected"),
      })
      .eq("id", data.guide_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminSetIntroVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    guide_id: z.string().uuid(),
    approved: z.boolean(),
    reason: z.string().trim().max(500).optional(),
  }).parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await ensureAdmin(userId);
    const { error } = await supabaseAdmin
      .from("guides")
      .update({
        intro_video_verified: data.approved,
        intro_video_rejected_reason: data.approved ? null : (data.reason ?? "Rejected"),
      })
      .eq("id", data.guide_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

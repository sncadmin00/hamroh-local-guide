import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PHOTO_BUCKET_SRC = "guide-application-photos";
const VIDEO_BUCKET_SRC = "guide-application-videos";
// guide-photos is the only public bucket (workspace policy blocks turning others public),
// so both portrait images AND the intro video are copied there.
const PHOTO_BUCKET_DST = "guide-photos";
const VIDEO_BUCKET_DST = "guide-photos";

function pathFromPublicUrl(url: string, bucket: string): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const i = url.indexOf(marker);
  if (i === -1) {
    const m2 = `/storage/v1/object/sign/${bucket}/`;
    const j = url.indexOf(m2);
    if (j === -1) return null;
    return url.slice(j + m2.length).split("?")[0];
  }
  return url.slice(i + marker.length);
}

async function copyToPublic(opts: {
  url: string;
  srcBucket: string;
  dstBucket: string;
  dstPrefix: string;
}): Promise<string> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const srcPath = pathFromPublicUrl(opts.url, opts.srcBucket);
  if (!srcPath) {
    // Already not in source bucket (e.g., already public). Return as-is.
    return opts.url;
  }
  const fileName = srcPath.split("/").pop() ?? `file-${Date.now()}`;
  const dstPath = `${opts.dstPrefix}/${fileName}`;

  // Download from source (private) bucket using service role
  const dl = await supabaseAdmin.storage.from(opts.srcBucket).download(srcPath);
  if (dl.error || !dl.data) throw new Error(`download failed: ${dl.error?.message ?? "no data"}`);

  const up = await supabaseAdmin.storage
    .from(opts.dstBucket)
    .upload(dstPath, dl.data, { upsert: true, contentType: dl.data.type || undefined });
  if (up.error) throw new Error(`upload failed: ${up.error.message}`);

  const { data: pub } = supabaseAdmin.storage.from(opts.dstBucket).getPublicUrl(dstPath);
  return pub.publicUrl;
}

/**
 * Finalize a guide profile after admin approval:
 * - Copy application portrait/video into public buckets
 * - Set identity_verified / intro_video_verified
 * - Merge verified_languages from language_tests (B1+)
 * Idempotent: re-running on an already-finalized guide just refreshes flags.
 */
export const finalizeApprovedGuide = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { application_id: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Admin only
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { data: app, error: appErr } = await supabaseAdmin
      .from("guide_applications")
      .select("id, user_id, full_name, portrait_url, video_url, photo_urls, language_tests, has_certificate, certificate_url, certificate_confirmed, tax_id")
      .eq("id", data.application_id)
      .maybeSingle();
    if (appErr) throw new Error(appErr.message);
    if (!app) throw new Error("Application not found");

    const { data: guide, error: gErr } = await supabaseAdmin
      .from("guides")
      .select("id, photo_url, intro_video_url, verified_languages")
      .eq("user_id", app.user_id!)
      .maybeSingle();
    if (gErr) throw new Error(gErr.message);
    if (!guide) throw new Error("Guide not found for this user");

    let photoUrl = guide.photo_url ?? null;
    let videoUrl = guide.intro_video_url ?? null;

    if (app.portrait_url) {
      try {
        photoUrl = await copyToPublic({
          url: app.portrait_url,
          srcBucket: PHOTO_BUCKET_SRC,
          dstBucket: PHOTO_BUCKET_DST,
          dstPrefix: `approved/${guide.id}`,
        });
      } catch (e) {
        console.error("portrait copy failed", e);
      }
    }
    if (app.video_url) {
      try {
        videoUrl = await copyToPublic({
          url: app.video_url,
          srcBucket: VIDEO_BUCKET_SRC,
          dstBucket: VIDEO_BUCKET_DST,
          dstPrefix: `approved/${guide.id}`,
        });
      } catch (e) {
        console.error("video copy failed", e);
      }
    }

    const tests = (app.language_tests as Array<{ language: string; level: string; skipped?: boolean }> | null) ?? [];
    const passed: Record<string, string> = {};
    for (const t of tests) {
      if (t.skipped) continue;
      if (["B1", "B2", "C1", "C2"].includes(t.level)) passed[t.language] = t.level;
    }
    const mergedLangs = {
      ...((guide.verified_languages as Record<string, string>) ?? {}),
      ...passed,
    };

    const isLicensed = !!(app.has_certificate && app.certificate_confirmed);
    const { error: upErr } = await supabaseAdmin
      .from("guides")
      .update({
        photo_url: photoUrl,
        intro_video_url: videoUrl,
        identity_verified: true,
        intro_video_verified: !!videoUrl,
        verified_languages: mergedLangs,
        verified: true,
        licensed: isLicensed,
        license_url: isLicensed ? app.certificate_url ?? null : null,
        licensed_at: isLicensed ? new Date().toISOString() : null,
        ...((app as any).tax_id ? { tax_status: "self_employed", tax_id: (app as any).tax_id } : {}),
      })
      .eq("id", guide.id);
    if (upErr) throw new Error(upErr.message);

    // Note: guide_posts is now a video-only reels feed. Application gallery
    // photos are no longer imported as posts — the guide uploads short videos
    // from the guide portal instead.




    return { ok: true, guide_id: guide.id, photo_url: photoUrl, intro_video_url: videoUrl };
  });

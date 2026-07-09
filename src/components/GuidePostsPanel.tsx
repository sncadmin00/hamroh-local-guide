import { useEffect, useState, useCallback, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Eye, EyeOff, Trash2, ArrowUp, ArrowDown, Loader2, Plus, Star, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useGuideI18n } from "@/lib/guide-i18n";
import {
  listMyGuidePosts,
  createMyGuidePost,
  deleteMyGuidePost,
  toggleMyGuidePostVisible,
  toggleMyGuidePostFeatured,
  reorderMyGuidePost,
} from "@/lib/guide-posts.functions";

type Post = {
  id: string;
  video_path: string;
  thumbnail_url: string | null;
  caption: string;
  visible: boolean;
  sort_order: number;
  featured_on_home: boolean;
  duration_seconds: number | null;
};

const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50 MB
const MAX_DURATION_SEC = 90;

export function GuidePostsPanel() {
  const { tg } = useGuideI18n();
  const [loading, setLoading] = useState(true);
  const [guideId, setGuideId] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [showForm, setShowForm] = useState(false);

  const fetchPosts = useServerFn(listMyGuidePosts);
  const createFn = useServerFn(createMyGuidePost);
  const deleteFn = useServerFn(deleteMyGuidePost);
  const toggleFn = useServerFn(toggleMyGuidePostVisible);
  const featureFn = useServerFn(toggleMyGuidePostFeatured);
  const reorderFn = useServerFn(reorderMyGuidePost);

  const load = useCallback(async () => {
    try {
      const res = await fetchPosts();
      setGuideId(res.guideId);
      setPosts(res.posts.map((p) => ({
        id: p.id,
        video_path: p.video_path,
        thumbnail_url: p.thumbnail_url,
        caption: p.caption,
        visible: p.visible,
        sort_order: p.sort_order,
        featured_on_home: p.featured_on_home,
        duration_seconds: p.duration_seconds,
      })));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [fetchPosts]);

  useEffect(() => { load(); }, [load]);

  // Preload signed thumbnail URLs for the owner's own posts.
  const thumbPaths = useMemo(
    () => posts.map((p) => p.thumbnail_url).filter((s): s is string => !!s),
    [posts],
  );
  const [thumbMap, setThumbMap] = useState<Record<string, string>>({});
  useEffect(() => {
    if (thumbPaths.length === 0) { setThumbMap({}); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase.storage.from("guide-posts").createSignedUrls(thumbPaths, 3600);
      if (cancelled) return;
      const map: Record<string, string> = {};
      (data ?? []).forEach((r) => { if (r.path && r.signedUrl) map[r.path] = r.signedUrl; });
      setThumbMap(map);
    })();
    return () => { cancelled = true; };
  }, [thumbPaths]);

  if (loading) {
    return (
      <div className="rounded-3xl bg-card p-6 ring-1 ring-border flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> {tg("posts.loading")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-card p-6 ring-1 ring-border">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="font-display text-lg font-semibold">{tg("posts.title")}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Short videos (reels) featured on the home page and your public profile.
              MP4, up to {MAX_DURATION_SEC}s, up to {Math.round(MAX_VIDEO_BYTES / 1024 / 1024)}MB.
            </p>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> {showForm ? tg("common.cancel") : tg("posts.add")}
          </button>
        </div>

        {showForm && guideId && (
          <div className="mt-4">
            <VideoPostForm
              guideId={guideId}
              onCreate={async (payload) => {
                try {
                  await createFn({ data: payload });
                  toast.success(tg("posts.added"));
                  setShowForm(false);
                  await load();
                } catch (e) {
                  toast.error((e as Error).message);
                }
              }}
            />
          </div>
        )}
      </div>

      {posts.length === 0 ? (
        <div className="rounded-3xl bg-card p-6 ring-1 ring-border text-sm text-muted-foreground">
          {tg("posts.empty")}
        </div>
      ) : (
        <ul className="space-y-3">
          {posts.map((p, idx) => (
            <li key={p.id} className="rounded-2xl bg-card ring-1 ring-border p-3 flex gap-3 items-start">
              <div className="w-20 h-28 rounded-xl bg-muted overflow-hidden flex-shrink-0 relative">
                {p.thumbnail_url && thumbMap[p.thumbnail_url] ? (
                  <img src={thumbMap[p.thumbnail_url]} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Video className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                {p.duration_seconds ? (
                  <span className="absolute bottom-1 right-1 text-[10px] px-1 rounded bg-black/70 text-white">
                    {p.duration_seconds}s
                  </span>
                ) : null}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                  <span>reel</span>
                  {!p.visible && <span className="text-amber-600">{tg("posts.hidden")}</span>}
                  {p.featured_on_home && <span className="text-amber-500 normal-case tracking-normal inline-flex items-center gap-1"><Star className="h-3 w-3 fill-amber-500" /> On home</span>}
                </div>
                <p className="text-sm mt-1 line-clamp-3 break-words">{p.caption || <span className="text-muted-foreground italic">{tg("posts.noCaption")}</span>}</p>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex gap-1">
                  <IconBtn title={tg("posts.moveUp")} disabled={idx === 0}
                    onClick={async () => { try { await reorderFn({ data: { id: p.id, direction: "up" } }); await load(); } catch (e) { toast.error((e as Error).message); } }}>
                    <ArrowUp className="h-4 w-4" />
                  </IconBtn>
                  <IconBtn title={tg("posts.moveDown")} disabled={idx === posts.length - 1}
                    onClick={async () => { try { await reorderFn({ data: { id: p.id, direction: "down" } }); await load(); } catch (e) { toast.error((e as Error).message); } }}>
                    <ArrowDown className="h-4 w-4" />
                  </IconBtn>
                </div>
                <div className="flex gap-1">
                  <IconBtn title={p.featured_on_home ? "Remove from home" : "Show on home"}
                    onClick={async () => { try { const r = await featureFn({ data: { id: p.id } }); toast.success(r.featured_on_home ? "Featured on home" : "Removed from home"); await load(); } catch (e) { toast.error((e as Error).message); } }}>
                    <Star className={`h-4 w-4 ${p.featured_on_home ? "fill-amber-500 text-amber-500" : ""}`} />
                  </IconBtn>
                  <IconBtn title={p.visible ? tg("posts.hide") : tg("posts.show")}
                    onClick={async () => { try { await toggleFn({ data: { id: p.id } }); await load(); } catch (e) { toast.error((e as Error).message); } }}>
                    {p.visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </IconBtn>
                  <IconBtn title={tg("posts.delete")}
                    onClick={async () => {
                      if (!confirm(tg("posts.deleteConfirm"))) return;
                      try { await deleteFn({ data: { id: p.id } }); toast.success(tg("common.deleted")); await load(); } catch (e) { toast.error((e as Error).message); }
                    }}>
                    <Trash2 className="h-4 w-4" />
                  </IconBtn>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function IconBtn({ children, onClick, title, disabled }: { children: React.ReactNode; onClick: () => void; title: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className="h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground disabled:opacity-30 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}

type CreatePayload = {
  video_path: string;
  thumbnail_url: string | null;
  caption: string;
  duration_seconds?: number;
  width?: number;
  height?: number;
  size_bytes?: number;
};

function VideoPostForm({ guideId, onCreate }: { guideId: string; onCreate: (p: CreatePayload) => Promise<void> }) {
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [meta, setMeta] = useState<{ duration: number; width: number; height: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMeta(null);
    setError(null);
    if (!file) return;
    if (file.size > MAX_VIDEO_BYTES) {
      setError(`Video is too large. Max ${Math.round(MAX_VIDEO_BYTES / 1024 / 1024)}MB.`);
      return;
    }
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.src = url;
    v.onloadedmetadata = () => {
      const duration = Math.round(v.duration);
      if (duration > MAX_DURATION_SEC) {
        setError(`Video is too long. Max ${MAX_DURATION_SEC}s.`);
      }
      setMeta({ duration, width: v.videoWidth, height: v.videoHeight });
      URL.revokeObjectURL(url);
    };
    v.onerror = () => {
      setError("Could not read video metadata. Please pick a valid MP4.");
      URL.revokeObjectURL(url);
    };
  }, [file]);

  async function generateThumbnail(videoFile: File): Promise<Blob | null> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(videoFile);
      const v = document.createElement("video");
      v.preload = "metadata";
      v.muted = true;
      v.playsInline = true;
      v.src = url;
      v.onloadeddata = () => {
        v.currentTime = Math.min(0.5, (v.duration || 1) / 2);
      };
      v.onseeked = () => {
        const canvas = document.createElement("canvas");
        canvas.width = v.videoWidth || 720;
        canvas.height = v.videoHeight || 1280;
        const ctx = canvas.getContext("2d");
        if (!ctx) { URL.revokeObjectURL(url); resolve(null); return; }
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => { URL.revokeObjectURL(url); resolve(blob); }, "image/jpeg", 0.85);
      };
      v.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { toast.error("Pick a video first"); return; }
    if (error) { toast.error(error); return; }
    setSubmitting(true);
    try {
      const uuid = crypto.randomUUID();
      const videoPath = `${guideId}/${uuid}.mp4`;
      const { error: upErr } = await supabase.storage
        .from("guide-posts")
        .upload(videoPath, file, { contentType: file.type || "video/mp4", upsert: false });
      if (upErr) throw upErr;

      let thumbPath: string | null = null;
      const thumbBlob = await generateThumbnail(file);
      if (thumbBlob) {
        thumbPath = `${guideId}/${uuid}.jpg`;
        const { error: thErr } = await supabase.storage
          .from("guide-posts")
          .upload(thumbPath, thumbBlob, { contentType: "image/jpeg", upsert: false });
        if (thErr) thumbPath = null; // non-fatal
      }

      await onCreate({
        video_path: videoPath,
        thumbnail_url: thumbPath,
        caption: caption.trim(),
        duration_seconds: meta?.duration,
        width: meta?.width,
        height: meta?.height,
        size_bytes: file.size,
      });
      setFile(null); setCaption(""); setMeta(null);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 border-t border-border pt-4">
      <div className="flex gap-3 items-start">
        <label className="w-28 h-28 rounded-xl bg-muted ring-1 ring-border overflow-hidden flex items-center justify-center cursor-pointer hover:bg-muted/70 flex-shrink-0">
          <Video className="h-6 w-6 text-muted-foreground" />
          <input
            type="file"
            accept="video/mp4,video/quicktime"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="text-xs text-muted-foreground">
            {file ? (
              <>
                <div className="truncate">{file.name}</div>
                <div>
                  {(file.size / 1024 / 1024).toFixed(1)}MB
                  {meta ? ` · ${meta.duration}s · ${meta.width}×${meta.height}` : ""}
                </div>
                {error && <div className="text-destructive mt-1">{error}</div>}
              </>
            ) : (
              <span>Tap to pick an MP4 (≤{MAX_DURATION_SEC}s, ≤{Math.round(MAX_VIDEO_BYTES / 1024 / 1024)}MB)</span>
            )}
          </div>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Caption (optional, max 500 chars)"
            maxLength={500}
            rows={3}
            className="w-full px-3 py-2 rounded-lg bg-background ring-1 ring-border text-sm resize-none"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={submitting || !file || !!error}
        className="inline-flex items-center gap-2 h-9 px-4 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Upload video
      </button>
    </form>
  );
}

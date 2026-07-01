import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Eye, EyeOff, Trash2, ArrowUp, ArrowDown, Loader2, Plus, ImagePlus, Star } from "lucide-react";
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
  platform: string;
  thumbnail_url: string | null;
  caption: string;
  visible: boolean;
  sort_order: number;
};

const PLATFORMS = ["instagram", "facebook", "tiktok", "youtube", "other"] as const;
type Platform = (typeof PLATFORMS)[number];

const MAX_BYTES = 5 * 1024 * 1024;

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
  const reorderFn = useServerFn(reorderMyGuidePost);

  const load = useCallback(async () => {
    try {
      const res = await fetchPosts();
      setGuideId(res.guideId);
      setPosts(res.posts as Post[]);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [fetchPosts]);

  useEffect(() => { load(); }, [load]);

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
              {tg("posts.text")}
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
            <PostForm
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
              <div className="w-20 h-20 rounded-xl bg-muted overflow-hidden flex-shrink-0">
                {p.thumbnail_url ? (
                  <img src={p.thumbnail_url} alt="" className="w-full h-full object-cover" />
                ) : null}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                  <span>{p.platform}</span>
                  {!p.visible && <span className="text-amber-600">{tg("posts.hidden")}</span>}
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

function PostForm({ guideId, onCreate }: { guideId: string; onCreate: (p: { platform: Platform; caption: string; thumbnail_url: string }) => Promise<void> }) {
  const { tg } = useGuideI18n();
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!file) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { toast.error(tg("posts.uploadImage")); return; }
    if (file.size > MAX_BYTES) { toast.error(tg("posts.tooLarge")); return; }
    setSubmitting(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `posts/${guideId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("guide-photos")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("guide-photos").getPublicUrl(path);
      await onCreate({ platform, caption: caption.trim(), thumbnail_url: pub.publicUrl });
      setCaption(""); setFile(null);
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
          {previewUrl ? (
            <img src={previewUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <ImagePlus className="h-6 w-6 text-muted-foreground" />
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <div className="flex-1 min-w-0 space-y-2">
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value as Platform)}
            className="w-full h-9 px-3 rounded-lg bg-background ring-1 ring-border text-sm"
          >
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>
            ))}
          </select>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder={tg("posts.captionPh")}
            maxLength={500}
            rows={3}
            className="w-full px-3 py-2 rounded-lg bg-background ring-1 ring-border text-sm resize-none"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={submitting || !file}
        className="inline-flex items-center gap-2 h-9 px-4 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        {tg("posts.add")}
      </button>
    </form>
  );
}

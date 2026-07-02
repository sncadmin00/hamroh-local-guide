import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Upload } from "lucide-react";

type AdminReel = {
  id: string;
  title: string;
  video_url: string;
  thumbnail_url: string | null;
  caption: string;
  posted_at: string | null;
  sort_order: number;
  visible: boolean;
};

const EMPTY: Partial<AdminReel> = {
  title: "",
  video_url: "",
  thumbnail_url: "",
  caption: "",
  posted_at: null,
  sort_order: 0,
  visible: true,
};

export function AdminReelsPanel() {
  const [items, setItems] = useState<AdminReel[]>([]);
  const [editing, setEditing] = useState<Partial<AdminReel> | null>(null);
  const [uploading, setUploading] = useState<"video" | "thumb" | null>(null);

  const load = async () => {
    const { data, error } = await (supabase as any)
      .from("admin_reels")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setItems((data ?? []) as AdminReel[]);
  };

  useEffect(() => { load(); }, []);

  const startNew = () => setEditing({ ...EMPTY });
  const startEdit = (r: AdminReel) => setEditing({ ...r });

  const remove = async (id: string) => {
    if (!confirm("Delete this reel?")) return;
    const { error } = await (supabase as any).from("admin_reels").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); load(); }
  };

  const toggleVisible = async (r: AdminReel) => {
    const { error } = await (supabase as any)
      .from("admin_reels")
      .update({ visible: !r.visible })
      .eq("id", r.id);
    if (error) toast.error(error.message);
    else load();
  };

  const uploadFile = async (file: File, kind: "video" | "thumb") => {
    setUploading(kind);
    try {
      const ext = file.name.split(".").pop() || (kind === "video" ? "mp4" : "jpg");
      const path = `admin-reels/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("guide-posts").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (error) { toast.error(error.message); return; }
      const { data } = supabase.storage.from("guide-posts").getPublicUrl(path);
      setEditing((e) => e ? { ...e, [kind === "video" ? "video_url" : "thumbnail_url"]: data.publicUrl } : e);
    } finally {
      setUploading(null);
    }
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.video_url) { toast.error("Video URL required"); return; }
    const payload = {
      title: editing.title ?? "",
      video_url: editing.video_url,
      thumbnail_url: editing.thumbnail_url || null,
      caption: editing.caption ?? "",
      posted_at: editing.posted_at || new Date().toISOString(),
      sort_order: editing.sort_order ?? 0,
      visible: editing.visible ?? true,
    };
    const req = editing.id
      ? (supabase as any).from("admin_reels").update(payload).eq("id", editing.id)
      : (supabase as any).from("admin_reels").insert(payload);
    const { error } = await req;
    if (error) { toast.error(error.message); return; }
    toast.success(editing.id ? "Updated" : "Added");
    setEditing(null);
    load();
  };

  return (
    <section className="mt-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold">Admin Reels ({items.length})</h2>
        <button
          onClick={startNew}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> New reel
        </button>
      </div>

      {editing && (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block text-sm">
              <span className="text-muted-foreground">Title</span>
              <input
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={editing.title ?? ""}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">Posted at</span>
              <input
                type="datetime-local"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={editing.posted_at ? new Date(editing.posted_at).toISOString().slice(0, 16) : ""}
                onChange={(e) => setEditing({ ...editing, posted_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
              />
            </label>
          </div>

          <label className="block text-sm">
            <span className="text-muted-foreground">Video URL</span>
            <div className="mt-1 flex gap-2">
              <input
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={editing.video_url ?? ""}
                onChange={(e) => setEditing({ ...editing, video_url: e.target.value })}
                placeholder="https://..."
              />
              <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-input px-3 py-2 text-xs">
                <Upload className="h-3 w-3" />
                {uploading === "video" ? "Uploading..." : "Upload"}
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], "video")}
                />
              </label>
            </div>
          </label>

          <label className="block text-sm">
            <span className="text-muted-foreground">Thumbnail URL</span>
            <div className="mt-1 flex gap-2">
              <input
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={editing.thumbnail_url ?? ""}
                onChange={(e) => setEditing({ ...editing, thumbnail_url: e.target.value })}
                placeholder="https://..."
              />
              <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-input px-3 py-2 text-xs">
                <Upload className="h-3 w-3" />
                {uploading === "thumb" ? "Uploading..." : "Upload"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], "thumb")}
                />
              </label>
            </div>
          </label>

          <label className="block text-sm">
            <span className="text-muted-foreground">Caption</span>
            <textarea
              rows={3}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={editing.caption ?? ""}
              onChange={(e) => setEditing({ ...editing, caption: e.target.value })}
            />
          </label>

          <div className="flex items-center gap-4">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editing.visible ?? true}
                onChange={(e) => setEditing({ ...editing, visible: e.target.checked })}
              />
              Visible
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Sort</span>
              <input
                type="number"
                className="w-20 rounded-md border border-input bg-background px-2 py-1 text-sm"
                value={editing.sort_order ?? 0}
                onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })}
              />
            </label>
          </div>

          <div className="flex gap-2">
            <button onClick={save} className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
              Save
            </button>
            <button onClick={() => setEditing(null)} className="rounded-full border border-input px-4 py-2 text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}

      <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
        {items.length === 0 && (
          <li className="p-4 text-sm text-muted-foreground">No reels yet.</li>
        )}
        {items.map((r) => (
          <li key={r.id} className="flex items-center gap-3 p-3">
            <div className="h-16 w-12 shrink-0 overflow-hidden rounded-md bg-secondary">
              {r.thumbnail_url ? (
                <img src={r.thumbnail_url} alt="" className="h-full w-full object-cover" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{r.title || "(untitled)"}</div>
              <div className="truncate text-xs text-muted-foreground">{r.caption}</div>
              <div className="text-[11px] text-muted-foreground">
                {r.visible ? "visible" : "hidden"} · sort {r.sort_order}
              </div>
            </div>
            <button onClick={() => toggleVisible(r)} className="rounded-full border border-input px-3 py-1 text-xs">
              {r.visible ? "Hide" : "Show"}
            </button>
            <button onClick={() => startEdit(r)} className="rounded-full border border-input px-3 py-1 text-xs">
              Edit
            </button>
            <button onClick={() => remove(r.id)} className="rounded-full border border-destructive/40 px-2 py-1 text-destructive">
              <Trash2 className="h-3 w-3" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

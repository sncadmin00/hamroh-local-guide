import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSpotlightsAdmin, SPOTLIGHT_KINDS } from "@/lib/content-queries";
import type { SpotlightKind, SpotlightRow } from "@/lib/spotlights";
import { toast } from "sonner";
import { Trash2, Plus, Upload } from "lucide-react";

const EMPTY: Partial<SpotlightRow> = {
  kind: "news",
  title_en: "",
  title_uz: "",
  title_ru: "",
  description_en: "",
  description_uz: "",
  description_ru: "",
  image_url: "",
  href: "/",
  is_active: true,
  sort_order: 0,
};

export function SpotlightsPanel() {
  const { data: items = [], refetch } = useSpotlightsAdmin();
  const [editing, setEditing] = useState<Partial<SpotlightRow> | null>(null);

  const startNew = () => setEditing({ ...EMPTY });
  const startEdit = (s: SpotlightRow) => setEditing({ ...s });

  const remove = async (id: string) => {
    if (!confirm("Delete this spotlight?")) return;
    const { error } = await (supabase as any).from("spotlights").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); refetch(); }
  };

  const toggleActive = async (s: SpotlightRow) => {
    const { error } = await (supabase as any).from("spotlights").update({ is_active: !s.is_active }).eq("id", s.id);
    if (error) toast.error(error.message);
    else refetch();
  };

  return (
    <section className="mt-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold">Spotlight banner</h2>
        <button
          onClick={startNew}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Add spotlight
        </button>
      </div>

      <p className="text-sm text-muted-foreground">Rotating cards shown above the AI input on the home page. Inactive items are hidden from the site.</p>

      {editing && (
        <SpotlightEditor
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); refetch(); }}
        />
      )}

      <div className="rounded-2xl bg-card ring-1 ring-border/60 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2">Order</th>
              <th className="text-left px-4 py-2">Kind</th>
              <th className="text-left px-4 py-2">Image</th>
              <th className="text-left px-4 py-2">Title (EN)</th>
              <th className="text-left px-4 py-2">Active</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.id} className="border-t border-border/60">
                <td className="px-4 py-2 w-16">{s.sort_order}</td>
                <td className="px-4 py-2 w-32">{s.kind}</td>
                <td className="px-4 py-2 w-16">
                  {s.image_url ? <img src={s.image_url} alt="" className="h-10 w-10 rounded object-cover" /> : <span className="text-xs text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-2">{s.title_en || <span className="text-muted-foreground italic">empty</span>}</td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => toggleActive(s)}
                    className={`px-2 py-0.5 rounded-full text-xs ${s.is_active ? "bg-green-100 text-green-700" : "bg-secondary text-muted-foreground"}`}
                  >
                    {s.is_active ? "active" : "hidden"}
                  </button>
                </td>
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  <button onClick={() => startEdit(s)} className="text-primary text-xs mr-3">Edit</button>
                  <button onClick={() => remove(s.id)} className="text-destructive"><Trash2 className="h-4 w-4 inline" /></button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">No spotlights yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SpotlightEditor({
  initial,
  onClose,
  onSaved,
}: {
  initial: Partial<SpotlightRow>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { setForm(initial); }, [initial]);

  const set = <K extends keyof SpotlightRow>(k: K, v: SpotlightRow[K]) => setForm((f) => ({ ...f, [k]: v }));

  const upload = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `spotlights/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("guide-photos").upload(path, file, { upsert: true });
    setUploading(false);
    if (error) { toast.error(error.message); return; }
    const { data } = supabase.storage.from("guide-photos").getPublicUrl(path);
    set("image_url", data.publicUrl);
  };

  const save = async () => {
    setSaving(true);
    const payload = {
      kind: form.kind ?? "news",
      title_en: form.title_en ?? "",
      title_uz: form.title_uz ?? "",
      title_ru: form.title_ru ?? "",
      description_en: form.description_en ?? "",
      description_uz: form.description_uz ?? "",
      description_ru: form.description_ru ?? "",
      image_url: form.image_url || null,
      href: form.href || "/",
      is_active: form.is_active ?? true,
      sort_order: form.sort_order ?? 0,
      expires_at: form.expires_at || null,
    };
    const q = form.id
      ? (supabase as any).from("spotlights").update(payload).eq("id", form.id)
      : (supabase as any).from("spotlights").insert(payload);
    const { error } = await q;
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved");
    onSaved();
  };

  return (
    <div className="rounded-2xl bg-card ring-1 ring-border/60 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{form.id ? "Edit spotlight" : "New spotlight"}</h3>
        <button onClick={onClose} className="text-sm text-muted-foreground">Cancel</button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="text-muted-foreground">Kind</span>
          <select
            value={form.kind ?? "news"}
            onChange={(e) => set("kind", e.target.value as SpotlightKind)}
            className="mt-1 w-full h-9 rounded-lg border border-border bg-background px-2"
          >
            {SPOTLIGHT_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-muted-foreground">Sort order</span>
          <input
            type="number"
            value={form.sort_order ?? 0}
            onChange={(e) => set("sort_order", Number(e.target.value))}
            className="mt-1 w-full h-9 rounded-lg border border-border bg-background px-2"
          />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {(["en","uz","ru"] as const).map((l) => (
          <div key={l} className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{l}</div>
            <input
              placeholder={`Title ${l}`}
              value={(form as any)[`title_${l}`] ?? ""}
              onChange={(e) => set(`title_${l}` as keyof SpotlightRow, e.target.value as never)}
              className="w-full h-9 rounded-lg border border-border bg-background px-2 text-sm"
            />
            <textarea
              placeholder={`Description ${l}`}
              value={(form as any)[`description_${l}`] ?? ""}
              onChange={(e) => set(`description_${l}` as keyof SpotlightRow, e.target.value as never)}
              rows={2}
              className="w-full rounded-lg border border-border bg-background p-2 text-sm"
            />
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <label className="text-sm">
          <span className="text-muted-foreground">Link (href)</span>
          <input
            placeholder="/guides/aziz or /tours/aral-tour"
            value={form.href ?? "/"}
            onChange={(e) => set("href", e.target.value)}
            className="mt-1 w-full h-9 rounded-lg border border-border bg-background px-2"
          />
        </label>
        <label className="text-sm flex items-end gap-2">
          <input
            type="checkbox"
            checked={form.is_active ?? true}
            onChange={(e) => set("is_active", e.target.checked)}
            className="h-4 w-4"
          />
          <span>Active</span>
        </label>
      </div>

      <div className="space-y-2">
        <div className="text-sm text-muted-foreground">Image</div>
        <div className="flex items-center gap-3">
          {form.image_url ? (
            <img src={form.image_url} alt="" className="h-16 w-16 rounded-lg object-cover ring-1 ring-border" />
          ) : (
            <div className="h-16 w-16 rounded-lg bg-secondary" />
          )}
          <label className="inline-flex items-center gap-2 h-9 px-3 rounded-full bg-secondary text-sm cursor-pointer hover:bg-secondary/80">
            <Upload className="h-4 w-4" />
            {uploading ? "Uploading…" : "Upload image"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }}
            />
          </label>
          {form.image_url && (
            <button onClick={() => set("image_url", "")} className="text-xs text-destructive">Remove</button>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="h-10 px-5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

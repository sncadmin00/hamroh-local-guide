import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToursAdmin, useCities, useCategories, useGuidesAdmin, type TourRow } from "@/lib/content-queries";
import { toast } from "sonner";
import { Trash2, Plus, Upload } from "lucide-react";

const EMPTY: Partial<TourRow> = {
  slug: "",
  title: "",
  short_description: "",
  description_md: "",
  cover_url: "",
  city_id: "",
  duration_hours: 2,
  price_from: 0,
  highlights: [],
  included: [],
  not_included: [],
  published: false,
  sort_order: 0,
  price_by_language: {},
  languages: [],
  transport_included: false,
};

export function ToursPanel() {
  const { data: tours = [], refetch } = useToursAdmin();
  const { data: cities = [] } = useCities();
  const { data: categories = [] } = useCategories();
  const { data: guides = [] } = useGuidesAdmin();
  const [editing, setEditing] = useState<Partial<TourRow> | null>(null);

  const startNew = () => setEditing({ ...EMPTY, city_id: cities[0]?.id ?? "", guide_id: guides[0]?.dbId ?? "" });
  const startEdit = (t: TourRow) => setEditing({ ...t });

  const remove = async (id: string) => {
    if (!confirm("Delete this tour?")) return;
    await (supabase as any).from("tour_categories").delete().eq("tour_id", id);
    const { error } = await (supabase as any).from("tours").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); refetch(); }
  };

  const togglePublished = async (t: TourRow) => {
    const { error } = await (supabase as any).from("tours").update({ published: !t.published }).eq("id", t.id);
    if (error) toast.error(error.message);
    else refetch();
  };

  return (
    <section className="mt-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold">Tours</h2>
        <button
          onClick={startNew}
          disabled={cities.length === 0 || guides.length === 0}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Add tour
        </button>
      </div>

      {editing && (
        <TourEditor
          initial={editing}
          cities={cities}
          categories={categories}
          guides={guides}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); refetch(); }}
        />
      )}

      <div className="rounded-2xl bg-card ring-1 ring-border/60 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2">Order</th>
              <th className="text-left px-4 py-2">Cover</th>
              <th className="text-left px-4 py-2">Title</th>
              <th className="text-left px-4 py-2">Guide</th>
              <th className="text-left px-4 py-2">City</th>
              <th className="text-left px-4 py-2">Price</th>
              <th className="text-left px-4 py-2">Published</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {tours.map((t) => (
              <tr key={t.id} className="border-t border-border/60">
                <td className="px-4 py-2 w-16">{t.sort_order}</td>
                <td className="px-4 py-2 w-16">
                  {t.cover_url ? <img src={t.cover_url} alt="" className="h-10 w-14 rounded object-cover" /> : <span className="text-xs text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-2">
                  <div className="font-medium">{t.title}</div>
                  <div className="text-xs text-muted-foreground">/{t.slug}</div>
                </td>
                <td className="px-4 py-2 text-xs">{t.guides?.name ?? "—"}</td>
                <td className="px-4 py-2">{t.cities?.name ?? "—"}</td>
                <td className="px-4 py-2">${Number(t.price_from).toFixed(0)}</td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => togglePublished(t)}
                    className={`px-2 py-0.5 rounded-full text-xs ${t.published ? "bg-green-100 text-green-700" : "bg-secondary text-muted-foreground"}`}
                  >
                    {t.published ? "live" : "draft"}
                  </button>
                </td>
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  <button onClick={() => startEdit(t)} className="text-primary text-xs mr-3">Edit</button>
                  <button onClick={() => remove(t.id)} className="text-destructive"><Trash2 className="h-4 w-4 inline" /></button>
                </td>
              </tr>
            ))}
            {tours.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">No tours yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function arrToText(a: string[] | undefined) { return (a ?? []).join("\n"); }
function textToArr(s: string) { return s.split("\n").map((x) => x.trim()).filter(Boolean); }

function TourEditor({
  initial,
  cities,
  categories,
  guides,
  onClose,
  onSaved,
}: {
  initial: Partial<TourRow>;
  cities: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  guides: { dbId: string; name: string; languages: string[] }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedCats, setSelectedCats] = useState<string[]>(
    (initial.tour_categories ?? []).map((tc) => tc.category_id),
  );

  useEffect(() => { setForm(initial); }, [initial]);

  const set = <K extends keyof TourRow>(k: K, v: TourRow[K]) => setForm((f) => ({ ...f, [k]: v }));

  const currentGuide = guides.find((g) => g.dbId === form.guide_id);
  const guideLangs = currentGuide?.languages ?? [];

  const toggleCat = (id: string) => setSelectedCats((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  const toggleTourLang = (lng: string) => {
    const cur = form.languages ?? [];
    set("languages", (cur.includes(lng) ? cur.filter((x) => x !== lng) : [...cur, lng]) as any);
  };
  const setLangPrice = (lng: string, value: string) => {
    const n = Number(value);
    const next = { ...(form.price_by_language ?? {}) };
    if (Number.isFinite(n) && n > 0) next[lng] = n;
    else delete next[lng];
    set("price_by_language", next as any);
  };

  const upload = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `tours/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("guide-photos").upload(path, file, { upsert: true });
    setUploading(false);
    if (error) { toast.error(error.message); return; }
    const { data } = supabase.storage.from("guide-photos").getPublicUrl(path);
    set("cover_url", data.publicUrl);
  };

  const save = async () => {
    const titleRu = (form as any).title_ru ?? "";
    const titleUz = (form as any).title_uz ?? "";
    const titleEn = (form as any).title_en ?? "";
    const anyTitle = titleRu || titleEn || titleUz || form.title || "";
    if (!form.slug || !anyTitle || !form.city_id || !form.guide_id) {
      toast.error("Slug, at least one title, city and guide are required");
      return;
    }
    setSaving(true);
    const cleanedPbl: Record<string, number> = {};
    for (const [k, v] of Object.entries(form.price_by_language ?? {})) {
      const n = Number(v);
      if (Number.isFinite(n) && n > 0) cleanedPbl[k] = n;
    }
    const payload = {
      slug: form.slug,
      title: anyTitle,
      title_ru: titleRu,
      title_uz: titleUz,
      title_en: titleEn,
      short_description: (form as any).short_description_ru || (form as any).short_description_en || (form as any).short_description_uz || form.short_description || "",
      short_description_ru: (form as any).short_description_ru ?? "",
      short_description_uz: (form as any).short_description_uz ?? "",
      short_description_en: (form as any).short_description_en ?? "",
      description_md: (form as any).description_md_ru || (form as any).description_md_en || (form as any).description_md_uz || form.description_md || "",
      description_md_ru: (form as any).description_md_ru ?? "",
      description_md_uz: (form as any).description_md_uz ?? "",
      description_md_en: (form as any).description_md_en ?? "",
      cover_url: form.cover_url || null,
      city_id: form.city_id,
      guide_id: form.guide_id,
      duration_hours: Number(form.duration_hours ?? 0),
      price_from: Number(form.price_from ?? 0),
      price_by_language: cleanedPbl,
      languages: form.languages ?? [],
      transport_included: !!form.transport_included,
      highlights: form.highlights ?? [],
      included: form.included ?? [],
      not_included: form.not_included ?? [],
      published: form.published ?? false,
      sort_order: form.sort_order ?? 0,
    };


    let tourId = form.id;
    if (tourId) {
      const { error } = await (supabase as any).from("tours").update(payload).eq("id", tourId);
      if (error) { setSaving(false); toast.error(error.message); return; }
    } else {
      const { data, error } = await (supabase as any).from("tours").insert(payload).select("id").single();
      if (error) { setSaving(false); toast.error(error.message); return; }
      tourId = data.id;
    }

    await (supabase as any).from("tour_categories").delete().eq("tour_id", tourId);
    if (selectedCats.length > 0) {
      await (supabase as any).from("tour_categories").insert(selectedCats.map((cid) => ({ tour_id: tourId, category_id: cid })));
    }

    setSaving(false);
    toast.success("Saved");
    onSaved();
  };

  return (
    <div className="rounded-2xl bg-card ring-1 ring-border/60 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{form.id ? "Edit tour" : "New tour"}</h3>
        <button onClick={onClose} className="text-sm text-muted-foreground">Cancel</button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="text-muted-foreground">Slug</span>
          <input value={form.slug ?? ""} onChange={(e) => set("slug", e.target.value)} className="mt-1 w-full h-9 rounded-lg border border-border bg-background px-2" />
        </label>
        <label className="text-sm">
          <span className="text-muted-foreground">Title</span>
          <input value={form.title ?? ""} onChange={(e) => set("title", e.target.value)} className="mt-1 w-full h-9 rounded-lg border border-border bg-background px-2" />
        </label>
      </div>

      <label className="text-sm block">
        <span className="text-muted-foreground">Short description (1 line)</span>
        <input value={form.short_description ?? ""} onChange={(e) => set("short_description", e.target.value)} className="mt-1 w-full h-9 rounded-lg border border-border bg-background px-2" />
      </label>

      <label className="text-sm block">
        <span className="text-muted-foreground">Full description</span>
        <textarea value={form.description_md ?? ""} onChange={(e) => set("description_md", e.target.value)} rows={5} className="mt-1 w-full rounded-lg border border-border bg-background p-2" />
      </label>

      <div className="grid gap-3 sm:grid-cols-4">
        <label className="text-sm">
          <span className="text-muted-foreground">Guide (owner)</span>
          <select value={form.guide_id ?? ""} onChange={(e) => set("guide_id", e.target.value)} className="mt-1 w-full h-9 rounded-lg border border-border bg-background px-2">
            <option value="">—</option>
            {guides.map((g) => <option key={g.dbId} value={g.dbId}>{g.name}</option>)}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-muted-foreground">City</span>
          <select value={form.city_id ?? ""} onChange={(e) => set("city_id", e.target.value)} className="mt-1 w-full h-9 rounded-lg border border-border bg-background px-2">
            {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-muted-foreground">Duration (h)</span>
          <input type="number" step="0.5" value={form.duration_hours ?? 0} onChange={(e) => set("duration_hours", Number(e.target.value))} className="mt-1 w-full h-9 rounded-lg border border-border bg-background px-2" />
        </label>
        <label className="text-sm">
          <span className="text-muted-foreground">Base price ($)</span>
          <input type="number" value={form.price_from ?? 0} onChange={(e) => set("price_from", Number(e.target.value))} className="mt-1 w-full h-9 rounded-lg border border-border bg-background px-2" />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm inline-flex items-center gap-2 h-9">
          <input type="checkbox" checked={!!form.transport_included} onChange={(e) => set("transport_included", e.target.checked)} className="h-4 w-4" />
          <span>Transport included</span>
        </label>
        <label className="text-sm">
          <span className="text-muted-foreground">Sort order</span>
          <input type="number" value={form.sort_order ?? 0} onChange={(e) => set("sort_order", Number(e.target.value))} className="mt-1 w-full h-9 rounded-lg border border-border bg-background px-2" />
        </label>
      </div>

      {guideLangs.length > 0 && (
        <div>
          <div className="text-sm text-muted-foreground mb-2">Tour languages & price per language</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {guideLangs.map((lng) => {
              const enabled = (form.languages ?? []).includes(lng);
              return (
                <div key={lng} className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 h-11 text-sm">
                  <label className="inline-flex items-center gap-2 flex-1">
                    <input type="checkbox" checked={enabled} onChange={() => toggleTourLang(lng)} className="h-4 w-4" />
                    <span className="font-medium">{lng}</span>
                  </label>
                  <span className="text-muted-foreground">$</span>
                  <input
                    type="number"
                    min={0}
                    value={(form.price_by_language ?? {})[lng] ?? ""}
                    onChange={(e) => setLangPrice(lng, e.target.value)}
                    placeholder={String(form.price_from || 0)}
                    disabled={!enabled}
                    className="w-20 h-9 bg-transparent outline-none text-sm tabular-nums disabled:opacity-50"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm">
          <span className="text-muted-foreground">Highlights (one per line)</span>
          <textarea value={arrToText(form.highlights)} onChange={(e) => set("highlights", textToArr(e.target.value))} rows={4} className="mt-1 w-full rounded-lg border border-border bg-background p-2" />
        </label>
        <label className="text-sm">
          <span className="text-muted-foreground">Included (one per line)</span>
          <textarea value={arrToText(form.included)} onChange={(e) => set("included", textToArr(e.target.value))} rows={4} className="mt-1 w-full rounded-lg border border-border bg-background p-2" />
        </label>
        <label className="text-sm">
          <span className="text-muted-foreground">Not included (one per line)</span>
          <textarea value={arrToText(form.not_included)} onChange={(e) => set("not_included", textToArr(e.target.value))} rows={4} className="mt-1 w-full rounded-lg border border-border bg-background p-2" />
        </label>
      </div>

      <div>
        <div className="text-sm text-muted-foreground mb-1">Categories</div>
        <div className="flex flex-wrap gap-1.5">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => toggleCat(c.id)}
              className={`px-3 h-8 rounded-full text-sm ${selectedCats.includes(c.id) ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-secondary/80"}`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-sm text-muted-foreground">Cover image</div>
        <div className="flex items-center gap-3">
          {form.cover_url ? (
            <img src={form.cover_url} alt="" className="h-20 w-28 rounded-lg object-cover ring-1 ring-border" />
          ) : (
            <div className="h-20 w-28 rounded-lg bg-secondary" />
          )}
          <label className="inline-flex items-center gap-2 h-9 px-3 rounded-full bg-secondary text-sm cursor-pointer hover:bg-secondary/80">
            <Upload className="h-4 w-4" />
            {uploading ? "Uploading…" : "Upload"}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
          </label>
          {form.cover_url && <button onClick={() => set("cover_url", "")} className="text-xs text-destructive">Remove</button>}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <label className="text-sm inline-flex items-center gap-2">
          <input type="checkbox" checked={form.published ?? false} onChange={(e) => set("published", e.target.checked)} className="h-4 w-4" />
          <span>Published</span>
        </label>
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

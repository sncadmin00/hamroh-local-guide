import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

type City = { id: string; name: string };

type Contact = {
  id: string;
  city_id: string | null;
  kind: "police" | "ambulance" | "fire" | "tourist_police" | "consulate" | "embassy" | "representation" | "other";
  category: "emergency" | "useful";
  label: string;
  phone: string;
  country_code: string | null;
  notes: string | null;
  sort_order: number;
  is_published: boolean;
};

const KINDS: Contact["kind"][] = ["police", "ambulance", "fire", "tourist_police", "consulate", "embassy", "representation", "other"];
const CATEGORIES: Contact["category"][] = ["emergency", "useful"];

const EMPTY: Partial<Contact> = {
  city_id: null,
  kind: "other",
  category: "emergency",
  label: "",
  phone: "",
  country_code: "UZ",
  notes: "",
  sort_order: 0,
  is_published: true,
};

export function EmergencyContactsPanel() {
  const [items, setItems] = useState<Contact[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [editing, setEditing] = useState<Partial<Contact> | null>(null);

  const load = async () => {
    const [a, b] = await Promise.all([
      (supabase as any).from("emergency_contacts").select("*").order("sort_order").order("label"),
      supabase.from("cities").select("id, name").order("name"),
    ]);
    if (a.error) toast.error(a.error.message);
    else setItems((a.data ?? []) as Contact[]);
    if (b.data) setCities(b.data as City[]);
  };

  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    if (!confirm("Delete this contact?")) return;
    const { error } = await (supabase as any).from("emergency_contacts").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); load(); }
  };

  const togglePublished = async (r: Contact) => {
    const { error } = await (supabase as any)
      .from("emergency_contacts")
      .update({ is_published: !r.is_published })
      .eq("id", r.id);
    if (error) toast.error(error.message);
    else load();
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.label || !editing.phone || !editing.kind) {
      toast.error("Label, phone, kind required");
      return;
    }
    const payload = {
      city_id: editing.city_id || null,
      kind: editing.kind,
      category: editing.category ?? "emergency",
      label: editing.label,
      phone: editing.phone,
      country_code: editing.country_code || null,
      notes: editing.notes || null,
      sort_order: editing.sort_order ?? 0,
      is_published: editing.is_published ?? true,
    };
    const req = editing.id
      ? (supabase as any).from("emergency_contacts").update(payload).eq("id", editing.id)
      : (supabase as any).from("emergency_contacts").insert(payload);
    const { error } = await req;
    if (error) { toast.error(error.message); return; }
    toast.success(editing.id ? "Updated" : "Added");
    setEditing(null);
    load();
  };

  const cityName = (id: string | null) => id ? (cities.find((c) => c.id === id)?.name ?? "?") : "Global";

  return (
    <section className="mt-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold">Emergency contacts ({items.length})</h2>
        <button
          onClick={() => setEditing({ ...EMPTY })}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> New contact
        </button>
      </div>

      {editing && (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block text-sm">
              <span className="text-muted-foreground">City (empty = global)</span>
              <select
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={editing.city_id ?? ""}
                onChange={(e) => setEditing({ ...editing, city_id: e.target.value || null })}
              >
                <option value="">— Global —</option>
                {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">Kind</span>
              <select
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={editing.kind ?? "other"}
                onChange={(e) => setEditing({ ...editing, kind: e.target.value as Contact["kind"] })}
              >
                {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">Label</span>
              <input
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={editing.label ?? ""}
                onChange={(e) => setEditing({ ...editing, label: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">Phone</span>
              <input
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={editing.phone ?? ""}
                onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">Country code</span>
              <input
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={editing.country_code ?? ""}
                onChange={(e) => setEditing({ ...editing, country_code: e.target.value })}
                placeholder="UZ"
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">Sort order</span>
              <input
                type="number"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={editing.sort_order ?? 0}
                onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })}
              />
            </label>
          </div>

          <label className="block text-sm">
            <span className="text-muted-foreground">Notes</span>
            <textarea
              rows={2}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={editing.notes ?? ""}
              onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
            />
          </label>

          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={editing.is_published ?? true}
              onChange={(e) => setEditing({ ...editing, is_published: e.target.checked })}
            />
            Published
          </label>

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
        {items.length === 0 && <li className="p-4 text-sm text-muted-foreground">No contacts yet.</li>}
        {items.map((r) => (
          <li key={r.id} className="flex items-center gap-3 p-3">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">
                {r.label} <span className="text-muted-foreground">· {r.phone}</span>
              </div>
              <div className="text-[11px] text-muted-foreground">
                {cityName(r.city_id)} · {r.kind} · {r.country_code ?? "—"} · sort {r.sort_order} · {r.is_published ? "published" : "hidden"}
                {r.notes ? ` · ${r.notes}` : ""}
              </div>
            </div>
            <button onClick={() => togglePublished(r)} className="rounded-full border border-input px-3 py-1 text-xs">
              {r.is_published ? "Hide" : "Publish"}
            </button>
            <button onClick={() => setEditing(r)} className="rounded-full border border-input px-3 py-1 text-xs">
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

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { X, Loader2, MapPin, Clock, Check, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Suggestion = {
  id: string;
  name: string;
  region: string | null;
  note: string | null;
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
  created_city_id: string | null;
  created_at: string;
};

export function SuggestCityModal({
  open,
  onClose,
  onApproved,
}: {
  open: boolean;
  onClose: () => void;
  onApproved?: () => void;
}) {
  const [name, setName] = useState("");
  const [region, setRegion] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) { setRows([]); setLoading(false); return; }
      const r = await fetch("/api/public/hooks/suggest-city", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await r.json();
      if (r.ok && Array.isArray(j.suggestions)) setRows(j.suggestions);
    } finally {
      setLoading(false);
    }
  }, [open]);

  useEffect(() => { load(); }, [load]);

  if (!open) return null;

  const submit = async () => {
    if (!name.trim() || name.trim().length < 2) {
      toast.error("Please enter the city name");
      return;
    }
    setSaving(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) { toast.error("Please sign in"); return; }
      const r = await fetch("/api/public/hooks/suggest-city", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          region: region.trim() || undefined,
          note: note.trim() || undefined,
        }),
      });
      const j = await r.json();
      if (!r.ok) { toast.error(j.message ?? "Failed"); return; }
      if (j.already_exists) {
        toast.success(`"${j.city.name}" already exists — you can select it.`);
        onApproved?.();
      } else if (j.duplicate) {
        toast.info("You've already submitted this city.");
      } else {
        toast.success("Sent for review");
      }
      setName(""); setRegion(""); setNote("");
      await load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto bg-card ring-1 ring-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2 font-display">
            <MapPin className="h-5 w-5" /> Suggest a city
          </h2>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-secondary" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Missing a city? Send it for review. Once approved, it becomes available in your tour form.
        </p>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium">City name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Nukus"
              className="mt-1 w-full h-10 rounded-lg px-3 text-sm bg-background border border-border"
            />
          </div>
          <div>
            <label className="text-xs font-medium">Region (optional)</label>
            <input
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="e.g. Karakalpakstan"
              className="mt-1 w-full h-10 rounded-lg px-3 text-sm bg-background border border-border"
            />
          </div>
          <div>
            <label className="text-xs font-medium">Note (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Why should we add it?"
              className="mt-1 w-full rounded-lg px-3 py-2 text-sm bg-background border border-border"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 h-10 rounded-full text-sm border border-border">Cancel</button>
          <button
            onClick={submit}
            disabled={saving}
            className="px-4 h-10 rounded-full text-sm font-semibold inline-flex items-center gap-2 bg-primary text-primary-foreground disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Send for review
          </button>
        </div>

        <div className="mt-6 border-t border-border pt-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">Your submissions</p>
          {loading ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-xs text-muted-foreground">No suggestions yet.</p>
          ) : (
            <ul className="space-y-2">
              {rows.map((r) => (
                <li key={r.id} className="flex items-start justify-between gap-3 rounded-lg border border-border p-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{r.name}{r.region ? <span className="text-xs text-muted-foreground"> · {r.region}</span> : null}</p>
                    {r.admin_note && <p className="text-xs italic text-muted-foreground mt-0.5">Admin: {r.admin_note}</p>}
                  </div>
                  <StatusBadge status={r.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Suggestion["status"] }) {
  const cfg =
    status === "approved" ? { icon: Check, color: "#7AB87A", label: "Approved" }
    : status === "rejected" ? { icon: XCircle, color: "#E07A5F", label: "Rejected" }
    : { icon: Clock, color: "#C9A84C", label: "Pending" };
  const Icon = cfg.icon;
  return (
    <span
      className="shrink-0 inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
      style={{ background: `color-mix(in srgb, ${cfg.color} 15%, transparent)`, color: cfg.color }}
    >
      <Icon className="h-3 w-3" /> {cfg.label}
    </span>
  );
}

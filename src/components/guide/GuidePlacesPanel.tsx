import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Plus, Clock, Check, X } from "lucide-react";
import { SuggestPlaceModal } from "@/components/SuggestPlaceModal";

type Row = {
  id: string;
  name: string;
  city_name: string;
  category: string;
  description: string;
  status: string;
  created_at: string;
};

export function GuidePlacesPanel({ guideId }: { guideId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) { setLoading(false); return; }
    const { data } = await supabase
      .from("place_suggestions")
      .select("id,name,city_name,category,description,status,created_at")
      .eq("submitted_by", uid)
      .order("created_at", { ascending: false });
    setRows((data as Row[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="rounded-2xl p-6" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold" style={{ fontFamily: "'DM Serif Display', serif" }}>My places</h2>
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Submit places you love — an admin will review and publish them.</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 px-4 h-10 rounded-full text-sm font-semibold"
          style={{ background: "#C9A84C", color: "#0F1F5C" }}
        >
          <Plus className="h-4 w-4" /> Add a place
        </button>
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>Loading…</p>
      ) : rows.length === 0 ? (
        <div className="text-sm py-8 text-center" style={{ color: "var(--muted-foreground)" }}>
          <MapPin className="h-8 w-8 mx-auto mb-2 opacity-60" />
          No submissions yet.
        </div>
      ) : (
        <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
          {rows.map((r) => (
            <li key={r.id} className="py-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-sm">{r.name} <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>/ {r.category} · {r.city_name}</span></p>
                <p className="text-xs mt-1 line-clamp-2" style={{ color: "var(--muted-foreground)" }}>{r.description}</p>
              </div>
              <StatusBadge status={r.status} />
            </li>
          ))}
        </ul>
      )}

      <SuggestPlaceModal
        open={open}
        onClose={() => setOpen(false)}
        source="guide"
        guideId={guideId}
        onSubmitted={load}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { icon: React.ElementType; color: string; label: string }> = {
    pending: { icon: Clock, color: "#C9A84C", label: "Pending" },
    approved: { icon: Check, color: "#7AB87A", label: "Approved" },
    rejected: { icon: X, color: "#E07A5F", label: "Rejected" },
  };
  const cfg = map[status] || map.pending;
  const Icon = cfg.icon;
  return (
    <span
      className="shrink-0 inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full"
      style={{ background: `color-mix(in srgb, ${cfg.color} 15%, transparent)`, color: cfg.color }}
    >
      <Icon className="h-3 w-3" /> {cfg.label}
    </span>
  );
}

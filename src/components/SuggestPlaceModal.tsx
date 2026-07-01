import { useEffect, useState } from "react";
import { toast } from "sonner";
import { X, Loader2, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type City = { id: string; name: string };

const CATEGORIES = ["attraction", "restaurant", "cafe", "market", "museum", "nature", "nightlife", "shop", "other"];

export function SuggestPlaceModal({
  open,
  onClose,
  source = "client",
  guideId,
  onSubmitted,
}: {
  open: boolean;
  onClose: () => void;
  source?: "client" | "guide";
  guideId?: string;
  onSubmitted?: () => void;
}) {
  const [cities, setCities] = useState<City[]>([]);
  const [cityId, setCityId] = useState("");
  const [category, setCategory] = useState("attraction");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    supabase.from("cities").select("id,name").order("name").then(({ data }) => {
      if (data) setCities(data as City[]);
    });
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setContactEmail(data.user.email);
    });
  }, [open]);

  if (!open) return null;

  const submit = async () => {
    if (!name.trim() || !cityId || !description.trim()) {
      toast.error("Please fill name, city and description");
      return;
    }
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      toast.error("Please sign in first");
      setSaving(false);
      return;
    }
    const city = cities.find((c) => c.id === cityId);
    const { error } = await supabase.from("place_suggestions").insert({
      city_id: cityId,
      city_name: city?.name ?? "",
      category,
      name: name.trim(),
      description: description.trim(),
      source_url: sourceUrl.trim(),
      contact_email: contactEmail.trim(),
      source,
      submitted_by: userId,
      guide_id: guideId ?? null,
      status: "pending",
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Thanks! Your suggestion was sent for review");
    setName("");
    setDescription("");
    setSourceUrl("");
    onSubmitted?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
        style={{ background: "var(--card)", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2" style={{ fontFamily: "'DM Serif Display', serif" }}>
            <MapPin className="h-5 w-5" /> Suggest a place
          </h2>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-secondary">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-xs mb-4" style={{ color: "var(--muted-foreground)" }}>
          Tell us about a spot worth sharing. Our team will review and publish it.
        </p>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium">Place name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full h-10 rounded-lg px-3 text-sm" style={{ background: "var(--background)", border: "1px solid var(--border)" }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium">City *</label>
              <select value={cityId} onChange={(e) => setCityId(e.target.value)} className="mt-1 w-full h-10 rounded-lg px-2 text-sm" style={{ background: "var(--background)", border: "1px solid var(--border)" }}>
                <option value="">Select…</option>
                {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 w-full h-10 rounded-lg px-2 text-sm" style={{ background: "var(--background)", border: "1px solid var(--border)" }}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium">Description *</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="mt-1 w-full rounded-lg px-3 py-2 text-sm" style={{ background: "var(--background)", border: "1px solid var(--border)" }} />
          </div>
          <div>
            <label className="text-xs font-medium">Link (optional)</label>
            <input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://…" className="mt-1 w-full h-10 rounded-lg px-3 text-sm" style={{ background: "var(--background)", border: "1px solid var(--border)" }} />
          </div>
          <div>
            <label className="text-xs font-medium">Contact email (optional)</label>
            <input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="mt-1 w-full h-10 rounded-lg px-3 text-sm" style={{ background: "var(--background)", border: "1px solid var(--border)" }} />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 h-10 rounded-full text-sm" style={{ border: "1px solid var(--border)" }}>Cancel</button>
          <button
            onClick={submit}
            disabled={saving}
            className="px-4 h-10 rounded-full text-sm font-semibold inline-flex items-center gap-2"
            style={{ background: "#C9A84C", color: "#0F1F5C" }}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Send for review
          </button>
        </div>
      </div>
    </div>
  );
}

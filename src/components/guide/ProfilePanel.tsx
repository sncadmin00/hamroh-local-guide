import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, X, Image as ImageIcon } from "lucide-react";
import { updateMyTaxInfo } from "@/lib/earnings.functions";
import { useGuideI18n } from "@/lib/guide-i18n";

type MediaItem = { url: string; label: string; source: "photo" | "tour" | "post" };

export function ProfilePanel({ guideId }: { guideId: string }) {
  const { tg } = useGuideI18n();
  const updateTaxFn = useServerFn(updateMyTaxInfo);
  const [currentCover, setCurrentCover] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [taxStatus, setTaxStatus] = useState<"none" | "self_employed" | "ip">("none");
  const [taxId, setTaxId] = useState("");
  const [taxSaving, setTaxSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const [g, t, p] = await Promise.all([
        supabase.from("guides").select("photo_url, cover_url, tax_status, tax_id").eq("id", guideId).maybeSingle(),
        supabase.from("tours").select("title, cover_url").eq("guide_id", guideId).not("cover_url", "is", null),
        supabase.from("guide_posts").select("caption, thumbnail_url").eq("guide_id", guideId).not("thumbnail_url", "is", null),
      ]);
      if (!alive) return;
      const items: MediaItem[] = [];
      if (g.data?.photo_url) items.push({ url: g.data.photo_url, label: "Profile photo", source: "photo" });
      (t.data ?? []).forEach((row) => {
        if (row.cover_url) items.push({ url: row.cover_url, label: row.title || "Tour", source: "tour" });
      });
      (p.data ?? []).forEach((row) => {
        if (row.thumbnail_url) items.push({ url: row.thumbnail_url, label: row.caption || "Post", source: "post" });
      });
      // dedupe by url
      const seen = new Set<string>();
      const unique = items.filter((m) => (seen.has(m.url) ? false : (seen.add(m.url), true)));
      setMedia(unique);
      setPhotoUrl(g.data?.photo_url ?? null);
      setCurrentCover(g.data?.cover_url ?? null);
      setTaxStatus(((g.data as any)?.tax_status ?? "none") as any);
      setTaxId(((g.data as any)?.tax_id ?? "") as string);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [guideId]);

  const saveTax = async () => {
    setTaxSaving(true);
    try {
      await updateTaxFn({ data: { tax_status: taxStatus, tax_id: taxId.trim() || null } });
      toast.success(tg("common.saved"));
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setTaxSaving(false);
    }
  };

  const save = async (url: string | null) => {
    setSaving(true);
    const { error } = await supabase.from("guides").update({ cover_url: url }).eq("id", guideId);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setCurrentCover(url);
    toast.success(url ? "Cover banner updated" : "Cover banner removed");
  };

  const effectiveCover = currentCover || photoUrl;

  return (
    <section className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold">Cover banner</h2>
        <p className="mt-1 text-sm text-muted-foreground">Choose the wide image shown above your profile. Pick from your existing media — profile photo, tour covers, or post images.</p>
      </div>

      <div className="overflow-hidden rounded-2xl ring-1 ring-border/60 bg-secondary">
        {effectiveCover ? (
          <img src={effectiveCover} alt="Current cover" className="aspect-[16/9] w-full object-cover" />
        ) : (
          <div className="aspect-[16/9] w-full grid place-items-center text-muted-foreground text-sm">
            <span className="inline-flex items-center gap-2"><ImageIcon className="h-4 w-4" /> No cover yet</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 text-sm">
        <span className="text-muted-foreground">
          {currentCover ? "Custom cover set" : "Using profile photo as fallback"}
        </span>
        {currentCover && (
          <button
            type="button"
            disabled={saving}
            onClick={() => save(null)}
            className="inline-flex items-center gap-1 rounded-full bg-secondary hover:bg-muted px-3 h-8 text-xs"
          >
            <X className="h-3.5 w-3.5" /> Remove cover
          </button>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Pick from your media</h3>
        {loading ? (
          <p className="mt-3 text-sm text-muted-foreground">Loading…</p>
        ) : media.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No images found yet. Add a profile photo, tour covers, or posts to use as a banner.</p>
        ) : (
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {media.map((m) => {
              const selected = currentCover === m.url;
              return (
                <button
                  key={m.url}
                  type="button"
                  disabled={saving || selected}
                  onClick={() => save(m.url)}
                  className={`group relative overflow-hidden rounded-xl ring-1 transition ${
                    selected ? "ring-2 ring-primary" : "ring-border/60 hover:ring-foreground/40"
                  }`}
                  title={m.label}
                >
                  <img src={m.url} alt={m.label} className="aspect-[16/9] w-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5">
                    <span className="text-[10px] font-medium text-white capitalize">{m.source}</span>
                    {selected && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                        <Check className="h-3 w-3" /> Active
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-3 pt-6 border-t border-border">
        <h2 className="font-display text-xl font-semibold">{tg("profile.tax.title")}</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="text-sm flex flex-col gap-1">
            <span className="text-muted-foreground">{tg("profile.tax.status")}</span>
            <select
              value={taxStatus}
              onChange={(e) => setTaxStatus(e.target.value as any)}
              className="h-10 px-3 rounded-md border border-border bg-background"
            >
              <option value="none">{tg("profile.tax.none")}</option>
              <option value="self_employed">{tg("profile.tax.self")}</option>
              <option value="ip">{tg("profile.tax.ip")}</option>
            </select>
          </label>
          <label className="text-sm flex flex-col gap-1">
            <span className="text-muted-foreground">{tg("profile.tax.id")}</span>
            <input
              value={taxId}
              onChange={(e) => setTaxId(e.target.value.replace(/\D/g, "").slice(0, 14))}
              placeholder={tg("profile.tax.idPh")}
              className="h-10 px-3 rounded-md border border-border bg-background"
            />
          </label>
        </div>
        <button
          onClick={saveTax}
          disabled={taxSaving}
          className="h-10 px-5 rounded-full bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
        >
          {taxSaving ? tg("common.loading") : tg("common.save")}
        </button>
      </div>
    </section>
  );
}

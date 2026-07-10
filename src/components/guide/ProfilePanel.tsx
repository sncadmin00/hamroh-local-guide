import { useEffect, useRef, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, X, Image as ImageIcon, Upload, Loader2, Camera, Plus, Car, Video, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { getMyTaxInfo, updateMyTaxInfo } from "@/lib/earnings.functions";
import { getMyVerification, submitIntroVideo } from "@/lib/guide-verification.functions";
import { useGuideI18n } from "@/lib/guide-i18n";

type MediaItem = { url: string; label: string; source: "photo" | "tour" };

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB
const MAX_VIDEO_BYTES = 80 * 1024 * 1024; // 80MB

export function ProfilePanel({ guideId }: { guideId: string }) {
  const { tg } = useGuideI18n();
  const updateTaxFn = useServerFn(updateMyTaxInfo);
  const getTaxFn = useServerFn(getMyTaxInfo);
  const [userId, setUserId] = useState<string | null>(null);
  const [currentCover, setCurrentCover] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [bio, setBio] = useState("");
  const [initialProfile, setInitialProfile] = useState({ name: "", tagline: "", bio: "" });
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [taxStatus, setTaxStatus] = useState<"none" | "self_employed" | "ip">("none");
  const [taxId, setTaxId] = useState("");
  const [taxSaving, setTaxSaving] = useState(false);
  const [languages, setLanguages] = useState<string[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [hasTransport, setHasTransport] = useState(false);
  const [transportSeats, setTransportSeats] = useState<number | null>(null);
  const [initialSkills, setInitialSkills] = useState({ languages: [] as string[], specialties: [] as string[], hasTransport: false, transportSeats: null as number | null });
  const [savingSkills, setSavingSkills] = useState(false);
  const [langInput, setLangInput] = useState("");
  const [specInput, setSpecInput] = useState("");
  const coverInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id ?? null;
      const [g, t, tax] = await Promise.all([
        supabase.from("guides").select("name, tagline, bio, photo_url, cover_url, languages, specialties, has_transport, transport_seats").eq("id", guideId).maybeSingle(),
        supabase.from("tours").select("title, cover_url").eq("guide_id", guideId).not("cover_url", "is", null),
        getTaxFn().catch(() => ({ tax_status: "none" as const, tax_id: "" })),
      ]);
      if (!alive) return;
      const items: MediaItem[] = [];
      if (g.data?.photo_url) items.push({ url: g.data.photo_url, label: "Profile photo", source: "photo" });
      (t.data ?? []).forEach((row) => {
        if (row.cover_url) items.push({ url: row.cover_url, label: row.title || "Tour", source: "tour" });
      });
      const seen = new Set<string>();
      const unique = items.filter((m) => (seen.has(m.url) ? false : (seen.add(m.url), true)));
      setUserId(uid);
      setMedia(unique);
      setPhotoUrl(g.data?.photo_url ?? null);
      setCurrentCover(g.data?.cover_url ?? null);
      const n = g.data?.name ?? "";
      const tl = g.data?.tagline ?? "";
      const b = g.data?.bio ?? "";
      setName(n); setTagline(tl); setBio(b);
      setInitialProfile({ name: n, tagline: tl, bio: b });
      const langs = (g.data?.languages ?? []) as string[];
      const specs = (g.data?.specialties ?? []) as string[];
      const ht = !!g.data?.has_transport;
      const ts = (g.data?.transport_seats ?? null) as number | null;
      setLanguages(langs); setSpecialties(specs); setHasTransport(ht); setTransportSeats(ts);
      setInitialSkills({ languages: langs, specialties: specs, hasTransport: ht, transportSeats: ts });
      setTaxStatus(((tax as any)?.tax_status ?? "none") as any);
      setTaxId(((tax as any)?.tax_id ?? "") as string);
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

  const saveCover = async (url: string | null) => {
    setSaving(true);
    const { error } = await supabase.from("guides").update({ cover_url: url }).eq("id", guideId);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setCurrentCover(url);
    toast.success(url ? "Cover banner updated" : "Cover banner removed");
  };

  const uploadImage = async (file: File, prefix: string) => {
    if (!userId) throw new Error("Not signed in");
    if (!file.type.startsWith("image/")) throw new Error("Please pick an image file");
    if (file.size > MAX_IMAGE_BYTES) throw new Error("Image is larger than 8MB");
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `${userId}/${prefix}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("tour-photos").upload(path, file, {
      upsert: true, contentType: file.type,
    });
    if (error) throw error;
    const { data } = supabase.storage.from("tour-photos").getPublicUrl(path);
    return data.publicUrl;
  };

  const onPickCoverFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    e.target.value = "";
    setUploadingCover(true);
    try {
      const url = await uploadImage(file, "cover");
      const { error } = await supabase.from("guides").update({ cover_url: url }).eq("id", guideId);
      if (error) throw error;
      setCurrentCover(url);
      setMedia((prev) => [{ url, label: "Uploaded cover", source: "photo" }, ...prev.filter((m) => m.url !== url)]);
      toast.success("Cover banner updated");
    } catch (err: any) { toast.error(err.message); }
    setUploadingCover(false);
  };

  const onPickAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    e.target.value = "";
    setUploadingAvatar(true);
    try {
      const url = await uploadImage(file, "avatar");
      const { error } = await supabase.from("guides").update({ photo_url: url }).eq("id", guideId);
      if (error) throw error;
      setPhotoUrl(url);
      setMedia((prev) => {
        const rest = prev.filter((m) => m.source !== "photo");
        return [{ url, label: "Profile photo", source: "photo" }, ...rest];
      });
      toast.success("Profile photo updated");
    } catch (err: any) { toast.error(err.message); }
    setUploadingAvatar(false);
  };

  const dirtyProfile =
    name.trim() !== initialProfile.name ||
    tagline.trim() !== initialProfile.tagline ||
    bio.trim() !== initialProfile.bio;

  const saveProfile = async () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    setSavingProfile(true);
    const patch = { name: name.trim(), tagline: tagline.trim(), bio: bio.trim() };
    const { error } = await supabase.from("guides").update(patch).eq("id", guideId);
    setSavingProfile(false);
    if (error) { toast.error(error.message); return; }
    setInitialProfile(patch);
    toast.success(tg("common.saved"));
  };

  const sameArr = (a: string[], b: string[]) => a.length === b.length && a.every((v, i) => v === b[i]);
  const dirtySkills =
    !sameArr(languages, initialSkills.languages) ||
    !sameArr(specialties, initialSkills.specialties) ||
    hasTransport !== initialSkills.hasTransport ||
    (transportSeats ?? null) !== (initialSkills.transportSeats ?? null);

  const addChip = (list: string[], value: string, setList: (v: string[]) => void, setInput: (v: string) => void, max = 12) => {
    const v = value.trim().slice(0, 40);
    if (!v) return;
    if (list.length >= max) { toast.error(`Max ${max} items`); return; }
    if (list.some((x) => x.toLowerCase() === v.toLowerCase())) { setInput(""); return; }
    setList([...list, v]);
    setInput("");
  };

  const saveSkills = async () => {
    setSavingSkills(true);
    const seats = hasTransport ? (transportSeats && transportSeats > 0 ? transportSeats : null) : null;
    const { error } = await supabase.from("guides").update({
      languages,
      specialties,
      has_transport: hasTransport,
      transport_seats: seats,
    }).eq("id", guideId);
    setSavingSkills(false);
    if (error) { toast.error(error.message); return; }
    setInitialSkills({ languages, specialties, hasTransport, transportSeats: seats });
    setTransportSeats(seats);
    toast.success(tg("common.saved"));
  };

  const effectiveCover = currentCover || photoUrl;


  return (
    <section className="space-y-8">
      {/* Basic info */}
      <div className="space-y-4">
        <div>
          <h2 className="font-display text-xl font-semibold">Profile info</h2>
          <p className="mt-1 text-sm text-muted-foreground">Your name, tagline and bio shown to travelers.</p>
        </div>

        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            <div className="h-20 w-20 overflow-hidden rounded-full ring-1 ring-border/60 bg-secondary grid place-items-center">
              {photoUrl ? (
                <img src={photoUrl} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploadingAvatar || !userId}
              className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-primary text-primary-foreground grid place-items-center ring-2 ring-background disabled:opacity-60"
              title="Change profile photo"
            >
              {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </button>
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={onPickAvatarFile} />
          </div>

          <div className="flex-1 min-w-0 space-y-3">
            <label className="text-sm flex flex-col gap-1">
              <span className="text-muted-foreground">Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 80))}
                className="h-10 px-3 rounded-md border border-border bg-background"
              />
            </label>
            <label className="text-sm flex flex-col gap-1">
              <span className="text-muted-foreground">Tagline <span className="text-xs">({tagline.length}/120)</span></span>
              <input
                value={tagline}
                onChange={(e) => setTagline(e.target.value.slice(0, 120))}
                placeholder="Short one-liner shown under your name"
                className="h-10 px-3 rounded-md border border-border bg-background"
              />
            </label>
          </div>
        </div>

        <label className="text-sm flex flex-col gap-1">
          <span className="text-muted-foreground">Bio <span className="text-xs">({bio.length}/1000)</span></span>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 1000))}
            rows={5}
            placeholder="Tell travelers about yourself, your style and what makes your tours special."
            className="px-3 py-2 rounded-md border border-border bg-background resize-y"
          />
        </label>

        <div>
          <button
            onClick={saveProfile}
            disabled={savingProfile || !dirtyProfile}
            className="h-10 px-5 rounded-full bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
          >
            {savingProfile ? tg("common.loading") : tg("common.save")}
          </button>
        </div>
      </div>

      {/* Skills & mobility */}
      <div className="space-y-5 pt-6 border-t border-border">
        <div>
          <h2 className="font-display text-xl font-semibold">Languages, specialties & transport</h2>
          <p className="mt-1 text-sm text-muted-foreground">Shown on your public profile and used for search filters.</p>
        </div>

        {/* Languages */}
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">Languages you speak <span className="text-xs">({languages.length}/12)</span></div>
          <div className="flex flex-wrap gap-2">
            {languages.map((l) => (
              <span key={l} className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 h-8 text-xs">
                {l}
                <button type="button" onClick={() => setLanguages(languages.filter((x) => x !== l))} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={langInput}
              onChange={(e) => setLangInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addChip(languages, langInput, setLanguages, setLangInput); } }}
              placeholder="e.g. English"
              className="flex-1 h-10 px-3 rounded-md border border-border bg-background text-sm"
            />
            <button type="button" onClick={() => addChip(languages, langInput, setLanguages, setLangInput)} className="inline-flex items-center gap-1 rounded-full bg-secondary hover:bg-muted px-3 h-10 text-xs">
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </div>
        </div>

        {/* Specialties */}
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">Specialties <span className="text-xs">({specialties.length}/12)</span></div>
          <div className="flex flex-wrap gap-2">
            {specialties.map((s) => (
              <span key={s} className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 h-8 text-xs">
                {s}
                <button type="button" onClick={() => setSpecialties(specialties.filter((x) => x !== s))} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={specInput}
              onChange={(e) => setSpecInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addChip(specialties, specInput, setSpecialties, setSpecInput); } }}
              placeholder="e.g. History, Food, Photography"
              className="flex-1 h-10 px-3 rounded-md border border-border bg-background text-sm"
            />
            <button type="button" onClick={() => addChip(specialties, specInput, setSpecialties, setSpecInput)} className="inline-flex items-center gap-1 rounded-full bg-secondary hover:bg-muted px-3 h-10 text-xs">
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </div>
        </div>

        {/* Transport */}
        <div className="space-y-2">
          <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={hasTransport} onChange={(e) => setHasTransport(e.target.checked)} className="h-4 w-4" />
            <Car className="h-4 w-4 text-muted-foreground" />
            <span>I have my own transport for tours</span>
          </label>
          {hasTransport && (
            <label className="text-sm flex flex-col gap-1 max-w-[220px]">
              <span className="text-muted-foreground">Seats (passengers)</span>
              <input
                type="number"
                min={1}
                max={60}
                value={transportSeats ?? ""}
                onChange={(e) => setTransportSeats(e.target.value ? Math.max(1, Math.min(60, parseInt(e.target.value, 10) || 0)) : null)}
                placeholder="e.g. 4"
                className="h-10 px-3 rounded-md border border-border bg-background"
              />
            </label>
          )}
        </div>

        <div>
          <button
            onClick={saveSkills}
            disabled={savingSkills || !dirtySkills}
            className="h-10 px-5 rounded-full bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
          >
            {savingSkills ? tg("common.loading") : tg("common.save")}
          </button>
        </div>
      </div>



      {/* Cover banner */}
      <div className="space-y-4 pt-6 border-t border-border">
        <div>
          <h2 className="font-display text-xl font-semibold">Cover banner</h2>
          <p className="mt-1 text-sm text-muted-foreground">The wide image shown above your public profile. Upload a new one or pick from your existing media.</p>
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

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => coverInputRef.current?.click()}
            disabled={uploadingCover || !userId}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-4 h-9 text-xs font-medium disabled:opacity-60"
          >
            {uploadingCover ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            Upload new cover
          </button>
          <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={onPickCoverFile} />
          {currentCover && (
            <button
              type="button"
              disabled={saving}
              onClick={() => saveCover(null)}
              className="inline-flex items-center gap-1 rounded-full bg-secondary hover:bg-muted px-3 h-9 text-xs"
            >
              <X className="h-3.5 w-3.5" /> Remove cover
            </button>
          )}
          <span className="text-muted-foreground text-xs">
            {currentCover ? "Custom cover set" : "Using profile photo as fallback"}
          </span>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Pick from your media</h3>
          {loading ? (
            <p className="mt-3 text-sm text-muted-foreground">Loading…</p>
          ) : media.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No images found yet. Upload a cover above, add a profile photo, or add tour covers.</p>
          ) : (
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {media.map((m) => {
                const selected = currentCover === m.url;
                return (
                  <button
                    key={m.url}
                    type="button"
                    disabled={saving || selected}
                    onClick={() => saveCover(m.url)}
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
      </div>

      {/* Tax */}
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

import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Video, Upload, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  getMyVerification,
  submitIdentity,
  submitIntroVideo,
} from "@/lib/guide-verification.functions";

type V = Awaited<ReturnType<typeof getMyVerification>>;

function StatusPill({ verified, submittedAt, rejected }: { verified: boolean; submittedAt: string | null; rejected: string | null }) {
  if (verified) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-xs font-medium">
        <CheckCircle2 className="h-3.5 w-3.5" /> Verified
      </span>
    );
  }
  if (rejected) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 text-destructive px-2.5 py-1 text-xs font-medium">
        <AlertCircle className="h-3.5 w-3.5" /> Rejected: {rejected}
      </span>
    );
  }
  if (submittedAt) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-muted text-muted-foreground px-2.5 py-1 text-xs font-medium">
        <Clock className="h-3.5 w-3.5" /> Pending review
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted text-muted-foreground px-2.5 py-1 text-xs">
      Not submitted
    </span>
  );
}

export function VerificationPanel() {
  const fetchV = useServerFn(getMyVerification);
  const subIdentity = useServerFn(submitIdentity);
  const subVideo = useServerFn(submitIntroVideo);
  const [data, setData] = useState<V | null>(null);
  const [loading, setLoading] = useState(true);

  const [phone, setPhone] = useState("");
  const [passportFile, setPassportFile] = useState<File | null>(null);
  const [savingId, setSavingId] = useState(false);

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [savingVideo, setSavingVideo] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const v = await fetchV();
      setData(v);
      if (v?.identity_phone) setPhone(v.identity_phone);
    } catch (e) { toast.error((e as Error).message); }
    setLoading(false);
  }, [fetchV]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="grid place-items-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  if (!data) return null;

  const guideId = data.id;
  const hasVerifiedLanguage = Object.keys((data.verified_languages ?? {}) as Record<string, string>).length > 0;

  const uploadFile = async (file: File, bucket: string, prefix: string) => {
    const ext = file.name.split(".").pop() || "bin";
    const path = `${guideId}/${prefix}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    if (error) throw error;
    return path;
  };

  const onSubmitIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) { toast.error("Enter phone"); return; }
    if (!passportFile && !data.identity_passport_url) { toast.error("Upload passport photo"); return; }
    setSavingId(true);
    try {
      let path = data.identity_passport_url ?? "";
      if (passportFile) path = await uploadFile(passportFile, "guide-identity", "passport");
      await subIdentity({ data: { phone: phone.trim(), passport_path: path } });
      toast.success("Submitted for review");
      setPassportFile(null);
      await load();
    } catch (e) { toast.error((e as Error).message); }
    setSavingId(false);
  };

  const onSubmitVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoFile) { toast.error("Choose a video"); return; }
    if (videoFile.size > 80 * 1024 * 1024) { toast.error("Video too large (max 80 MB)"); return; }
    setSavingVideo(true);
    try {
      const path = await uploadFile(videoFile, "guide-intro-videos", "intro");
      await subVideo({ data: { video_path: path } });
      toast.success("Submitted for review");
      setVideoFile(null);
      await load();
    } catch (e) { toast.error((e as Error).message); }
    setSavingVideo(false);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-card ring-1 ring-border p-5">
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Verification status</p>
        <div className="grid sm:grid-cols-3 gap-3 text-sm">
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="font-medium flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" /> Identity</p>
            <div className="mt-2"><StatusPill verified={!!data.identity_verified} submittedAt={data.identity_submitted_at} rejected={data.identity_rejected_reason} /></div>
          </div>
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="font-medium">Language</p>
            <div className="mt-2">
              {hasVerifiedLanguage ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-xs font-medium"><CheckCircle2 className="h-3.5 w-3.5" /> Verified</span>
              ) : (
                <span className="text-xs text-muted-foreground">Pass the AI language test (B1+)</span>
              )}
            </div>
          </div>
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="font-medium flex items-center gap-1.5"><Video className="h-4 w-4" /> Intro video</p>
            <div className="mt-2"><StatusPill verified={!!data.intro_video_verified} submittedAt={data.intro_video_submitted_at} rejected={data.intro_video_rejected_reason} /></div>
          </div>
        </div>
      </div>

      <form onSubmit={onSubmitIdentity} className="rounded-2xl bg-card ring-1 ring-border p-5 space-y-3">
        <p className="font-display text-lg font-semibold flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> Identity verification</p>
        <p className="text-sm text-muted-foreground">Email is verified via your login. Provide phone + a clear photo of your passport / ID. Admin will review within 1–2 days.</p>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Phone</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+998 ..."
            className="mt-1 w-full h-10 rounded-lg border border-input bg-background px-3 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Passport / ID photo</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setPassportFile(e.target.files?.[0] ?? null)}
            className="mt-1 w-full text-sm"
          />
          {data.identity_passport_url && !passportFile && (
            <p className="text-xs text-muted-foreground mt-1">Existing file kept. Choose new to replace.</p>
          )}
        </div>
        <button
          type="submit"
          disabled={savingId}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
        >
          {savingId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Submit for review
        </button>
      </form>

      <form onSubmit={onSubmitVideo} className="rounded-2xl bg-card ring-1 ring-border p-5 space-y-3">
        <p className="font-display text-lg font-semibold flex items-center gap-2"><Video className="h-5 w-5" /> Intro video</p>
        <p className="text-sm text-muted-foreground">Record a short video (up to 60 sec): introduce yourself, your city, your style. Admin will review within 1–2 days.</p>
        <input
          type="file"
          accept="video/*"
          onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
          className="w-full text-sm"
        />
        <button
          type="submit"
          disabled={savingVideo}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
        >
          {savingVideo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Submit for review
        </button>
      </form>

      <div className="rounded-2xl bg-muted/40 ring-1 ring-border p-5">
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Auto-tracked stats</p>
        <div className="grid sm:grid-cols-3 gap-3 text-sm">
          <div><p className="text-xs text-muted-foreground">Completed tours</p><p className="font-medium">{data.completed_tours_count}</p></div>
          <div><p className="text-xs text-muted-foreground">Median response</p><p className="font-medium">{data.avg_response_minutes === null ? "—" : `${Math.round(Number(data.avg_response_minutes))} min`}</p></div>
          <div><p className="text-xs text-muted-foreground">Verified languages</p><p className="font-medium">{Object.keys((data.verified_languages ?? {}) as Record<string, string>).length}</p></div>
        </div>
      </div>
    </div>
  );
}

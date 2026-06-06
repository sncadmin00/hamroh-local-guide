import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Check, X, ShieldCheck, Video } from "lucide-react";
import {
  adminListVerifications,
  adminSetIdentity,
  adminSetIntroVideo,
} from "@/lib/guide-verification.functions";
import { useAdminI18n } from "@/lib/admin-i18n";

type Row = Awaited<ReturnType<typeof adminListVerifications>>[number];

export function VerificationsPanel() {
  const { ta } = useAdminI18n();
  const fetchList = useServerFn(adminListVerifications);
  const setId = useServerFn(adminSetIdentity);
  const setVideo = useServerFn(adminSetIntroVideo);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await fetchList()); } catch (e) { toast.error((e as Error).message); }
    setLoading(false);
  }, [fetchList]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="py-10 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  if (!rows.length) return <p className="text-sm text-muted-foreground py-10 text-center">{ta("verifs.empty")}</p>;

  const act = async (fn: (i: any) => Promise<unknown>, payload: any, msg: string) => {
    try { await fn(payload); toast.success(msg); await load(); }
    catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="space-y-4">
      {rows.map((g) => (
        <div key={g.id} className="rounded-xl ring-1 ring-border bg-card p-4">
          <div className="flex items-center gap-3 mb-3">
            <img src={g.photo_url || ""} alt={g.name} className="h-10 w-10 rounded-full object-cover bg-muted" />
            <div className="flex-1 min-w-0">
              <p className="font-medium">{g.name}</p>
              <p className="text-xs text-muted-foreground">{g.slug}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-lg bg-muted/40 p-3 space-y-2">
              <p className="text-sm font-medium flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" /> {ta("verifs.identity")} {g.identity_verified ? "✓" : ""}</p>
              <p className="text-xs">{ta("verifs.phone")} {g.identity_phone || "—"}</p>
              {g.passport_signed ? (
                <a href={g.passport_signed} target="_blank" rel="noreferrer" className="text-xs text-primary underline">{ta("verifs.openPassport")}</a>
              ) : <p className="text-xs text-muted-foreground">{ta("verifs.noFile")}</p>}
              {g.identity_submitted_at && (
                <p className="text-[10px] text-muted-foreground">{ta("verifs.submitted")} {new Date(g.identity_submitted_at).toLocaleString()}</p>
              )}
              {g.identity_rejected_reason && <p className="text-xs text-destructive">{g.identity_rejected_reason}</p>}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => act(setId, { data: { guide_id: g.id, approved: true } }, ta("verifs.identityApproved"))}
                  className="inline-flex items-center gap-1 h-8 px-3 rounded-full bg-primary text-primary-foreground text-xs font-medium"
                  disabled={!g.identity_submitted_at}
                >
                  <Check className="h-3 w-3" /> {ta("common.approve")}
                </button>
                <button
                  onClick={() => {
                    const reason = prompt(ta("verifs.rejectionReason")) ?? undefined;
                    act(setId, { data: { guide_id: g.id, approved: false, reason } }, ta("verifs.identityRejected"));
                  }}
                  className="inline-flex items-center gap-1 h-8 px-3 rounded-full bg-destructive/10 text-destructive text-xs font-medium"
                  disabled={!g.identity_submitted_at}
                >
                  <X className="h-3 w-3" /> {ta("common.reject")}
                </button>
              </div>
            </div>

            <div className="rounded-lg bg-muted/40 p-3 space-y-2">
              <p className="text-sm font-medium flex items-center gap-1.5"><Video className="h-4 w-4" /> {ta("verifs.introVideo")} {g.intro_video_verified ? "✓" : ""}</p>
              {g.video_signed ? (
                <video src={g.video_signed} controls className="w-full rounded max-h-60 bg-black" />
              ) : <p className="text-xs text-muted-foreground">{ta("verifs.noFile")}</p>}
              {g.intro_video_submitted_at && (
                <p className="text-[10px] text-muted-foreground">{ta("verifs.submitted")} {new Date(g.intro_video_submitted_at).toLocaleString()}</p>
              )}
              {g.intro_video_rejected_reason && <p className="text-xs text-destructive">{g.intro_video_rejected_reason}</p>}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => act(setVideo, { data: { guide_id: g.id, approved: true } }, ta("verifs.videoApproved"))}
                  className="inline-flex items-center gap-1 h-8 px-3 rounded-full bg-primary text-primary-foreground text-xs font-medium"
                  disabled={!g.intro_video_submitted_at}
                >
                  <Check className="h-3 w-3" /> {ta("common.approve")}
                </button>
                <button
                  onClick={() => {
                    const reason = prompt(ta("verifs.rejectionReason")) ?? undefined;
                    act(setVideo, { data: { guide_id: g.id, approved: false, reason } }, ta("verifs.videoRejected"));
                  }}
                  className="inline-flex items-center gap-1 h-8 px-3 rounded-full bg-destructive/10 text-destructive text-xs font-medium"
                  disabled={!g.intro_video_submitted_at}
                >
                  <X className="h-3 w-3" /> {ta("common.reject")}
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

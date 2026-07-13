import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Loader2, ExternalLink } from "lucide-react";
import {
  listPendingTours,
  approveTour,
  rejectTour,
} from "@/lib/admin-portal.functions";

type PendingTour = {
  id: string;
  slug: string;
  title: string;
  cover_url: string | null;
  price_from: number | null;
  submitted_at: string | null;
  moderation_status: "pending_review" | "rejected";
  rejection_reason: string | null;
  guides: { name: string } | null;
  cities: { name: string } | null;
};

export function TourModerationPanel() {
  const [rows, setRows] = useState<PendingTour[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const list = useServerFn(listPendingTours);
  const approve = useServerFn(approveTour);
  const reject = useServerFn(rejectTour);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = (await list()) as PendingTour[];
      setRows(data);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [list]);

  useEffect(() => { void load(); }, [load]);

  const onApprove = async (id: string) => {
    setBusyId(id);
    try {
      await approve({ data: { id } });
      toast.success("Approved & published");
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to approve");
    } finally {
      setBusyId(null);
    }
  };

  const onReject = async (id: string) => {
    if (!reason.trim() || reason.trim().length < 3) {
      toast.error("Enter a rejection reason (min 3 chars)");
      return;
    }
    setBusyId(id);
    try {
      await reject({ data: { id, reason: reason.trim() } });
      toast.success("Rejected");
      setRejectingId(null);
      setReason("");
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to reject");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="mt-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold">Tour moderation</h2>
        <span className="text-xs text-muted-foreground">
          {rows.filter((r) => r.moderation_status === "pending_review").length} pending
        </span>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground py-8 text-center">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl bg-card ring-1 ring-border/60 p-8 text-center text-sm text-muted-foreground">
          Nothing waiting for review.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((t) => (
            <div key={t.id} className="rounded-2xl bg-card ring-1 ring-border/60 p-4">
              <div className="flex gap-4">
                {t.cover_url ? (
                  <img src={t.cover_url} alt="" className="h-20 w-28 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="h-20 w-28 rounded-lg bg-secondary flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium truncate">{t.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {t.guides?.name ?? "—"} · {t.cities?.name ?? "—"} · from ${Number(t.price_from ?? 0).toFixed(0)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Submitted {t.submitted_at ? new Date(t.submitted_at).toLocaleString() : "—"}
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                      t.moderation_status === "pending_review"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-red-100 text-red-800"
                    }`}>
                      {t.moderation_status === "pending_review" ? "Pending" : "Rejected"}
                    </span>
                  </div>

                  {t.moderation_status === "rejected" && t.rejection_reason && (
                    <div className="mt-2 text-xs text-muted-foreground italic">
                      Prev. reason: {t.rejection_reason}
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <a
                      href={`/tours/${t.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 h-8 px-3 rounded-full ring-1 ring-border text-xs hover:bg-secondary"
                    >
                      <ExternalLink className="h-3 w-3" /> Preview
                    </a>
                    <button
                      onClick={() => onApprove(t.id)}
                      disabled={busyId === t.id}
                      className="inline-flex items-center gap-1 h-8 px-3 rounded-full bg-green-600 text-white text-xs font-medium hover:opacity-90 disabled:opacity-50"
                    >
                      {busyId === t.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                      Approve & publish
                    </button>
                    {rejectingId === t.id ? null : (
                      <button
                        onClick={() => { setRejectingId(t.id); setReason(""); }}
                        disabled={busyId === t.id}
                        className="inline-flex items-center gap-1 h-8 px-3 rounded-full ring-1 ring-destructive text-destructive text-xs font-medium hover:bg-destructive/10 disabled:opacity-50"
                      >
                        <XCircle className="h-3 w-3" /> Reject
                      </button>
                    )}
                  </div>

                  {rejectingId === t.id && (
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                      <input
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Reason for rejection (shown to the guide)"
                        className="flex-1 h-8 rounded-lg border border-border bg-background px-2 text-sm"
                        maxLength={1000}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => onReject(t.id)}
                          disabled={busyId === t.id}
                          className="h-8 px-3 rounded-full bg-destructive text-destructive-foreground text-xs font-medium hover:opacity-90 disabled:opacity-50"
                        >
                          Confirm reject
                        </button>
                        <button
                          onClick={() => { setRejectingId(null); setReason(""); }}
                          className="h-8 px-3 rounded-full text-xs text-muted-foreground"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

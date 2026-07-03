import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { listMyBookings, cancelBookingAsClient, respondToProposal } from "@/lib/my-bookings.functions";
import { getBookingPdf } from "@/lib/booking-pdf.functions";
import { Calendar, Users, ArrowLeft, MessageSquare, X, CalendarClock, Check, FileDown } from "lucide-react";
import { ReviewForm } from "@/components/ReviewForm";
import { ContinueInAppBanner } from "@/components/ContinueInAppBanner";


export const Route = createFileRoute("/my-bookings")({
  head: () => ({ meta: [{ title: "My bookings — Hamroh" }] }),
  component: MyBookingsPage,
  errorComponent: ({ error }) => (
    <div className="min-h-screen flex items-center justify-center text-sm text-destructive">
      {error.message}
    </div>
  ),
  notFoundComponent: () => <div>Not found</div>,
});

function MyBookingsPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const fetchBookings = useServerFn(listMyBookings);
  const cancelBooking = useServerFn(cancelBookingAsClient);
  const respondProposal = useServerFn(respondToProposal);
  const fetchPdf = useServerFn(getBookingPdf);
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);
  const qc = useQueryClient();

  const downloadPdf = async (id: string) => {
    setPdfLoadingId(id);
    try {
      const res = await fetchPdf({ data: { id } });
      const bin = atob(res.pdfBase64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPdfLoadingId(null);
    }
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) navigate({ to: "/login", replace: true });
      else setReady(true);
    });
  }, [navigate]);

  const q = useQuery({
    queryKey: ["my-bookings"],
    queryFn: () => fetchBookings(),
    enabled: ready,
  });

  const cancelMut = useMutation({
    mutationFn: (vars: { id: string; reason?: string }) =>
      cancelBooking({ data: vars }),
    onSuccess: () => {
      toast.success("Booking cancelled");
      qc.invalidateQueries({ queryKey: ["my-bookings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const proposalMut = useMutation({
    mutationFn: (vars: { id: string; accept: boolean }) =>
      respondProposal({ data: vars }),
    onSuccess: (_d, vars) => {
      toast.success(vars.accept ? "Booking confirmed" : "Proposal declined");
      qc.invalidateQueries({ queryKey: ["my-bookings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleCancel = (id: string) => {
    const reason = window.prompt("Reason for cancellation (optional):") ?? undefined;
    if (window.confirm("Cancel this booking?")) cancelMut.mutate({ id, reason });
  };


  if (!ready) return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Loading…</div>;

  const bookings = q.data ?? [];

  return (
    <div className="min-h-screen bg-secondary/20">
      <ContinueInAppBanner />
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-2xl font-semibold">My bookings</h1>
          <Link to="/ai" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to Hamroh AI
          </Link>
        </div>

        {q.isLoading && <p className="text-sm text-muted-foreground">Loading bookings…</p>}

        {!q.isLoading && bookings.length === 0 && (
          <div className="rounded-2xl bg-card ring-1 ring-border/60 p-8 text-center">
            <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-4">You have no bookings yet.</p>
            <Link to="/ai" className="inline-flex items-center justify-center h-10 px-5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
              Find a guide
            </Link>
          </div>
        )}

        <ul className="space-y-3">
          {bookings.map((b) => {
            const guide = (b as { guides?: { name?: string; slug?: string; photo_url?: string } }).guides;
            const statusColor =
              b.status === "confirmed" ? "bg-green-500/10 text-green-700" :
              b.status === "pending" ? "bg-amber-500/10 text-amber-700" :
              b.status === "cancelled" || b.status === "declined" ? "bg-destructive/10 text-destructive" :
              "bg-secondary text-muted-foreground";
            return (
              <li key={b.id} className="rounded-2xl bg-card ring-1 ring-border/60 p-4 flex gap-4">
                {guide?.photo_url ? (
                  <img src={guide.photo_url} alt={guide.name ?? ""} className="h-16 w-16 rounded-xl object-cover shrink-0" />
                ) : (
                  <div className="h-16 w-16 rounded-xl bg-secondary shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{b.experience}</p>
                      <p className="text-sm text-muted-foreground truncate">with {guide?.name?.split(" ")[0] ?? "guide"}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor} shrink-0`}>{b.status}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{b.date}{b.start_time ? ` · ${String(b.start_time).slice(0,5)}` : ""}</span>
                    <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{b.guests} {b.guests === 1 ? "guest" : "guests"}</span>
                    <span className="font-medium text-foreground">${Number(b.total).toFixed(0)}</span>
                  </div>
                  {(() => {
                    const bb = b as { expires_at?: string | null };
                    if (b.status !== "pending" || !bb.expires_at) return null;
                    const msLeft = new Date(bb.expires_at).getTime() - Date.now();
                    if (msLeft <= 0) return (
                      <p className="mt-2 text-xs text-destructive">Guide didn't respond in time. This request will expire shortly.</p>
                    );
                    const hours = Math.floor(msLeft / 3600000);
                    const mins = Math.floor((msLeft % 3600000) / 60000);
                    const label = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
                    return (
                      <p className="mt-2 text-xs text-amber-700">⏱ Waiting for guide — auto-expires in {label}</p>
                    );
                  })()}
                  {(() => {
                    const bb = b as { proposed_date?: string | null; proposed_time?: string | null; proposed_note?: string | null };
                    if (!bb.proposed_date || !bb.proposed_time) return null;
                    return (
                      <div className="mt-3 rounded-xl bg-amber-500/10 ring-1 ring-amber-500/30 p-3">
                        <div className="flex items-start gap-2">
                          <CalendarClock className="h-4 w-4 text-amber-700 mt-0.5 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-amber-900">Guide proposed a new time</p>
                            <p className="text-sm text-amber-900 mt-0.5">
                              {bb.proposed_date} · {String(bb.proposed_time).slice(0, 5)}
                            </p>
                            {bb.proposed_note && (
                              <p className="text-xs text-amber-900/80 mt-1">"{bb.proposed_note}"</p>
                            )}
                            <div className="mt-2 flex gap-2">
                              <button
                                onClick={() => proposalMut.mutate({ id: b.id, accept: true })}
                                disabled={proposalMut.isPending}
                                className="h-8 px-3 rounded-full bg-foreground text-background text-xs font-medium inline-flex items-center gap-1 disabled:opacity-50"
                              >
                                <Check className="h-3.5 w-3.5" /> Accept
                              </button>
                              <button
                                onClick={() => proposalMut.mutate({ id: b.id, accept: false })}
                                disabled={proposalMut.isPending}
                                className="h-8 px-3 rounded-full bg-background ring-1 ring-border text-xs font-medium inline-flex items-center gap-1 disabled:opacity-50"
                              >
                                <X className="h-3.5 w-3.5" /> Decline
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <Link
                      to="/messages/$bookingId"
                      params={{ bookingId: b.id }}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                    >
                      <MessageSquare className="h-3.5 w-3.5" /> Message guide
                    </Link>
                    {b.status !== "cancelled" && b.status !== "declined" && (
                      <button
                        onClick={() => handleCancel(b.id)}
                        disabled={cancelMut.isPending}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-destructive hover:underline disabled:opacity-50"
                      >
                        <X className="h-3.5 w-3.5" /> Cancel
                      </button>
                    )}
                    {(b.status === "confirmed" || b.status === "completed") && (
                      <button
                        onClick={() => downloadPdf(b.id)}
                        disabled={pdfLoadingId === b.id}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline disabled:opacity-50"
                      >
                        <FileDown className="h-3.5 w-3.5" /> {pdfLoadingId === b.id ? "Generating…" : "Download PDF"}
                      </button>
                    )}
                  </div>
                  {(() => {
                    const tripDate = new Date(b.date);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const eligible =
                      ["confirmed", "completed"].includes(String(b.status)) &&
                      tripDate.getTime() <= today.getTime();
                    return eligible ? (
                      <ReviewForm bookingId={b.id} guideName={guide?.name} />
                    ) : null;
                  })()}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

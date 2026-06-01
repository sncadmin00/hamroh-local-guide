import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { listMyBookings } from "@/lib/my-bookings.functions";
import { Calendar, Users, ArrowLeft, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/my-bookings")({
  head: () => ({ meta: [{ title: "My bookings — Sancho" }] }),
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

  if (!ready) return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Loading…</div>;

  const bookings = q.data ?? [];

  return (
    <div className="min-h-screen bg-secondary/20">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-2xl font-semibold">My bookings</h1>
          <Link to="/ai" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to Sancho AI
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
                      <p className="text-sm text-muted-foreground truncate">with {guide?.name ?? "guide"}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor} shrink-0`}>{b.status}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{b.date}{b.start_time ? ` · ${String(b.start_time).slice(0,5)}` : ""}</span>
                    <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{b.guests} {b.guests === 1 ? "guest" : "guests"}</span>
                    <span className="font-medium text-foreground">${Number(b.total).toFixed(0)}</span>
                  </div>
                  <Link
                    to="/messages/$bookingId"
                    params={{ bookingId: b.id }}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                  >
                    <MessageSquare className="h-3.5 w-3.5" /> Message guide
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

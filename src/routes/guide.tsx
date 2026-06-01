import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calendar, Plus, Trash2, Check, X, LogOut, Loader2, Copy, Link2 } from "lucide-react";
import {
  getMyGuide,
  listMySlots,
  addSlot,
  deleteSlot,
  listMyBookings,
  updateBookingStatus,
} from "@/lib/guide-portal.functions";

export const Route = createFileRoute("/guide")({
  head: () => ({ meta: [{ title: "Guide portal — Sancho" }] }),
  component: GuidePortal,
});

type Slot = {
  id: string;
  date: string;
  start_time: string;
  duration_minutes: number;
  is_booked: boolean;
  booking_id: string | null;
};

type Booking = {
  id: string;
  customer_name: string;
  customer_email: string;
  experience: string;
  date: string;
  start_time: string | null;
  duration_minutes: number | null;
  guests: number;
  total: number;
  status: string;
  notes: string;
  created_at: string;
  slot_id: string | null;
};

function GuidePortal() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [guide, setGuide] = useState<{ id: string; name: string; slug: string; tagline: string; referral_code: string | null; referral_clicks: number; cities?: { name: string } | null } | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [tab, setTab] = useState<"availability" | "bookings" | "referral">("availability");

  const fetchGuide = useServerFn(getMyGuide);
  const fetchSlots = useServerFn(listMySlots);
  const fetchBookings = useServerFn(listMyBookings);
  const addSlotFn = useServerFn(addSlot);
  const deleteSlotFn = useServerFn(deleteSlot);
  const updateStatusFn = useServerFn(updateBookingStatus);

  const load = useCallback(async () => {
    const [g, s, b] = await Promise.all([fetchGuide(), fetchSlots(), fetchBookings()]);
    setGuide(g as typeof guide);
    setSlots(s as Slot[]);
    setBookings(b as Booking[]);
  }, [fetchGuide, fetchSlots, fetchBookings]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      if (!data.user) {
        navigate({ to: "/login", replace: true });
        return;
      }
      setChecking(false);
      load().catch((e) => toast.error(e.message));
    })();
    return () => { mounted = false; };
  }, [load, navigate]);

  if (checking) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }

  if (!guide) {
    return (
      <div className="min-h-screen container mx-auto px-4 py-20 max-w-2xl text-center">
        <h1 className="font-display text-2xl font-semibold">No guide profile linked</h1>
        <p className="mt-3 text-muted-foreground">
          Your account is not linked to a guide profile yet. Ask an administrator to invite you to the portal.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/" className="h-10 px-4 inline-flex items-center rounded-full bg-secondary text-sm font-medium">Home</Link>
          <button
            onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/login" }); }}
            className="h-10 px-4 inline-flex items-center rounded-full bg-foreground text-background text-sm font-medium"
          >Sign out</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border bg-background">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Guide portal</p>
            <p className="font-display text-lg font-semibold truncate">{guide.name}</p>
          </div>
          <button
            onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/login" }); }}
            className="inline-flex items-center gap-2 h-9 px-3 rounded-full text-sm hover:bg-muted"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex gap-2 mb-6 flex-wrap">
          <TabBtn active={tab === "availability"} onClick={() => setTab("availability")}>
            <Calendar className="h-4 w-4" /> Availability
          </TabBtn>
          <TabBtn active={tab === "bookings"} onClick={() => setTab("bookings")}>
            Bookings ({bookings.length})
          </TabBtn>
          <TabBtn active={tab === "referral"} onClick={() => setTab("referral")}>
            <Link2 className="h-4 w-4" /> Referral
          </TabBtn>
        </div>

        {tab === "availability" && (
          <AvailabilityPanel
            slots={slots}
            onAdd={async (payload) => {
              try {
                await addSlotFn({ data: payload });
                toast.success("Slot added");
                await load();
              } catch (e) { toast.error((e as Error).message); }
            }}
            onDelete={async (id) => {
              try {
                await deleteSlotFn({ data: { id } });
                toast.success("Slot removed");
                await load();
              } catch (e) { toast.error((e as Error).message); }
            }}
          />
        )}

        {tab === "bookings" && (
          <BookingsPanel
            bookings={bookings}
            onAction={async (id, status) => {
              try {
                await updateStatusFn({ data: { id, status } });
                toast.success(`Booking ${status}`);
                await load();
              } catch (e) { toast.error((e as Error).message); }
            }}
          />
        )}

        {tab === "referral" && (
          <ReferralPanel code={guide.referral_code} clicks={guide.referral_clicks} />
        )}
      </div>
    </div>
  );
}

function ReferralPanel({ code, clicks }: { code: string | null; clicks: number }) {
  if (!code) {
    return (
      <div className="rounded-3xl bg-card p-6 ring-1 ring-border text-sm text-muted-foreground">
        No referral code assigned yet. Contact an administrator.
      </div>
    );
  }
  const link = `https://hamroh-local-guide.lovable.app/?ref=${code}`;
  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-card p-6 ring-1 ring-border">
        <h2 className="font-display text-lg font-semibold">Your referral link</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Share it on social media. Every traveller who books through it counts toward your stats.
        </p>
        <div className="mt-4 flex items-center gap-2">
          <input readOnly value={link} className="flex-1 h-11 rounded-xl border border-input bg-background px-3 text-sm font-mono" />
          <button
            onClick={async () => { await navigator.clipboard.writeText(link); toast.success("Copied"); }}
            className="h-11 px-4 rounded-xl bg-foreground text-background text-sm font-medium inline-flex items-center gap-2"
          >
            <Copy className="h-4 w-4" /> Copy
          </button>
        </div>
      </div>
      <div className="rounded-3xl bg-card p-6 ring-1 ring-border">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Total link clicks</p>
        <p className="mt-1 font-display text-3xl font-semibold">{clicks}</p>
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 h-10 px-4 rounded-full text-sm font-medium transition ${active ? "bg-foreground text-background" : "bg-background ring-1 ring-border hover:bg-muted"}`}
    >{children}</button>
  );
}

function AvailabilityPanel({
  slots, onAdd, onDelete,
}: {
  slots: Slot[];
  onAdd: (p: { date: string; start_time: string; duration_minutes: number }) => void;
  onDelete: (id: string) => void;
}) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [duration, setDuration] = useState(120);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-card p-6 ring-1 ring-border">
        <h2 className="font-display text-lg font-semibold">Add free slot</h2>
        <p className="text-sm text-muted-foreground mt-1">When you have slots here, travellers can book you instantly. Without slots, all bookings come as requests.</p>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
          <label className="text-sm">
            <span className="text-xs text-muted-foreground">Date</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full h-11 rounded-xl border border-input bg-background px-3 text-sm" />
          </label>
          <label className="text-sm">
            <span className="text-xs text-muted-foreground">Start time</span>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-1 w-full h-11 rounded-xl border border-input bg-background px-3 text-sm" />
          </label>
          <label className="text-sm">
            <span className="text-xs text-muted-foreground">Duration (min)</span>
            <input type="number" min={30} max={720} step={30} value={duration} onChange={(e) => setDuration(Number(e.target.value) || 120)} className="mt-1 w-full h-11 rounded-xl border border-input bg-background px-3 text-sm" />
          </label>
          <button
            disabled={!date || !time}
            onClick={() => onAdd({ date, start_time: time, duration_minutes: duration })}
            className="h-11 mt-[18px] rounded-xl bg-foreground text-background text-sm font-medium inline-flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Add slot
          </button>
        </div>
      </div>

      <div className="rounded-3xl bg-card p-6 ring-1 ring-border">
        <h2 className="font-display text-lg font-semibold">Upcoming slots</h2>
        {slots.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No slots yet. Add some above to enable instant booking.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {slots.map((s) => (
              <li key={s.id} className="py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{s.date} · {s.start_time.slice(0, 5)} · {s.duration_minutes} min</p>
                  <p className="text-xs text-muted-foreground">{s.is_booked ? "Booked" : "Available"}</p>
                </div>
                {!s.is_booked && (
                  <button onClick={() => onDelete(s.id)} className="h-9 w-9 grid place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function BookingsPanel({
  bookings, onAction,
}: {
  bookings: Booking[];
  onAction: (id: string, status: "confirmed" | "declined" | "cancelled") => void;
}) {
  if (bookings.length === 0) {
    return <div className="rounded-3xl bg-card p-6 ring-1 ring-border text-sm text-muted-foreground">No bookings yet.</div>;
  }
  return (
    <div className="space-y-3">
      {bookings.map((b) => (
        <div key={b.id} className="rounded-2xl bg-card p-5 ring-1 ring-border">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium">{b.customer_name} · {b.guests} {b.guests === 1 ? "guest" : "guests"}</p>
              <p className="text-xs text-muted-foreground truncate">{b.customer_email}</p>
              <p className="text-sm mt-2">
                <span className="font-medium">{b.experience}</span> — {b.date}
                {b.start_time && <> · {b.start_time.slice(0, 5)}</>}
                {b.duration_minutes && <> · {b.duration_minutes} min</>}
              </p>
              {b.notes && <p className="text-sm text-muted-foreground mt-1">"{b.notes}"</p>}
              <p className="text-xs text-muted-foreground mt-2">
                Status: <StatusPill status={b.status} /> · ${Number(b.total).toFixed(0)} · {b.slot_id ? "Instant" : "Request"}
              </p>
            </div>
            {b.status === "pending" && (
              <div className="flex gap-2 shrink-0">
                <button onClick={() => onAction(b.id, "confirmed")} className="h-9 px-3 rounded-full bg-foreground text-background text-xs font-medium inline-flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" /> Confirm
                </button>
                <button onClick={() => onAction(b.id, "declined")} className="h-9 px-3 rounded-full bg-muted text-foreground text-xs font-medium inline-flex items-center gap-1">
                  <X className="h-3.5 w-3.5" /> Decline
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-amber-500/15 text-amber-700",
    confirmed: "bg-emerald-500/15 text-emerald-700",
    declined: "bg-destructive/15 text-destructive",
    cancelled: "bg-muted text-muted-foreground",
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${map[status] ?? "bg-muted"}`}>{status}</span>;
}

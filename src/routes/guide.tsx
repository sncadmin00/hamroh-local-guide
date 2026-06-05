import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calendar, CalendarClock, CalendarDays, Plus, Trash2, Check, X, LogOut, Loader2, Copy, Link2, Image as ImageIcon, Compass, Pencil, MapPin, Sparkles } from "lucide-react";
import { CalendarPanel } from "@/components/guide/CalendarPanel";
import { GuideAIPanel } from "@/components/guide/GuideAIPanel";

import {
  getMyGuide,
  listMySlots,
  addSlot,
  deleteSlot,
  listMyBookings,
  updateBookingStatus,
  proposeBookingTime,
  listMyTours,
  upsertTour,
  deleteTour,
  updateMyCities,
  updateMyLanguages,
  recordMyLanguageTest,
} from "@/lib/guide-portal.functions";
import { assessLanguageTest } from "@/lib/language-test.functions";
import { useCities, useCategories } from "@/lib/content-queries";
import { GuidePostsPanel } from "@/components/GuidePostsPanel";

export const Route = createFileRoute("/guide")({
  head: () => ({ meta: [{ title: "Guide portal — Hamroh" }] }),
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
  customer_email: string | null;
  customer_telegram_username: string | null;
  experience: string;
  language?: string | null;
  date: string;
  start_time: string | null;
  duration_minutes: number | null;
  guests: number;
  total: number;
  status: string;
  notes: string;
  created_at: string;
  slot_id: string | null;
  proposed_date?: string | null;
  proposed_time?: string | null;
  proposed_note?: string | null;
  proposed_at?: string | null;
  expires_at?: string | null;
};

type MyGuide = {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  referral_code: string | null;
  referral_clicks: number;
  city_id: string;
  extra_city_ids: string[] | null;
  languages: string[] | null;
  cities?: { name: string } | null;
};

function GuidePortal() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [guide, setGuide] = useState<MyGuide | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [tab, setTab] = useState<"calendar" | "ai" | "availability" | "bookings" | "tours" | "cities" | "languages" | "posts" | "referral">("calendar");

  const fetchGuide = useServerFn(getMyGuide);
  const fetchSlots = useServerFn(listMySlots);
  const fetchBookings = useServerFn(listMyBookings);
  const addSlotFn = useServerFn(addSlot);
  const deleteSlotFn = useServerFn(deleteSlot);
  const updateStatusFn = useServerFn(updateBookingStatus);
  const proposeTimeFn = useServerFn(proposeBookingTime);

  const load = useCallback(async () => {
    const [g, s, b] = await Promise.all([fetchGuide(), fetchSlots(), fetchBookings()]);
    setGuide(g as MyGuide | null);
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
          <TabBtn active={tab === "calendar"} onClick={() => setTab("calendar")}>
            <CalendarDays className="h-4 w-4" /> Calendar
          </TabBtn>
          <TabBtn active={tab === "ai"} onClick={() => setTab("ai")}>
            <Sparkles className="h-4 w-4" /> AI
          </TabBtn>
          <TabBtn active={tab === "availability"} onClick={() => setTab("availability")}>
            <Calendar className="h-4 w-4" /> Availability
          </TabBtn>
          <TabBtn active={tab === "tours"} onClick={() => setTab("tours")}>
            <Compass className="h-4 w-4" /> My tours
          </TabBtn>
          <TabBtn active={tab === "bookings"} onClick={() => setTab("bookings")}>
            Bookings ({bookings.length})
          </TabBtn>
          <TabBtn active={tab === "cities"} onClick={() => setTab("cities")}>
            <MapPin className="h-4 w-4" /> Cities
          </TabBtn>
          <TabBtn active={tab === "languages"} onClick={() => setTab("languages")}>
            Languages
          </TabBtn>
          <TabBtn active={tab === "posts"} onClick={() => setTab("posts")}>
            <ImageIcon className="h-4 w-4" /> Posts
          </TabBtn>
          <TabBtn active={tab === "referral"} onClick={() => setTab("referral")}>
            <Link2 className="h-4 w-4" /> Referral
          </TabBtn>
        </div>

        {tab === "calendar" && <CalendarPanel />}
        {tab === "ai" && <GuideAIPanel />}

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
            onPropose={async (bookingId, date, time, note) => {
              try {
                await proposeTimeFn({ data: { id: bookingId, date, time, note: note || undefined } });
                toast.success("Proposal sent to client");
                await load();
              } catch (e) { toast.error((e as Error).message); }
            }}
          />
        )}

        {tab === "tours" && <ToursPanel />}

        {tab === "cities" && (
          <CitiesPanel
            guideCityId={guide.city_id}
            currentExtra={guide.extra_city_ids ?? []}
            onSaved={() => load()}
          />
        )}

        {tab === "languages" && (
          <LanguagesPanel
            current={guide.languages ?? []}
            onSaved={() => load()}
          />
        )}

        {tab === "posts" && <GuidePostsPanel />}

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
  bookings, onAction, onPropose,
}: {
  bookings: Booking[];
  onAction: (id: string, status: "confirmed" | "declined" | "cancelled") => void;
  onPropose: (bookingId: string, date: string, time: string, note: string) => Promise<void>;
}) {
  const [proposeFor, setProposeFor] = useState<string | null>(null);
  const [pDate, setPDate] = useState("");
  const [pTime, setPTime] = useState("");
  const [pNote, setPNote] = useState("");
  const [sending, setSending] = useState(false);

  if (bookings.length === 0) {
    return <div className="rounded-3xl bg-card p-6 ring-1 ring-border text-sm text-muted-foreground">No bookings yet.</div>;
  }
  return (
    <div className="space-y-3">
      {bookings.map((b) => (
        <div key={b.id} className="rounded-2xl bg-card p-5 ring-1 ring-border">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <p className="font-medium">{b.customer_name} · {b.guests} {b.guests === 1 ? "guest" : "guests"}</p>
              <p className="text-xs text-muted-foreground truncate">
                {b.customer_email || (b.customer_telegram_username ? `@${b.customer_telegram_username}` : "Telegram")}
              </p>
              <p className="text-sm mt-2">
                <span className="font-medium">{b.experience}</span> — {b.date}
                {b.start_time && <> · {b.start_time.slice(0, 5)}</>}
                {b.duration_minutes && <> · {b.duration_minutes} min</>}
              </p>
              {b.notes && <p className="text-sm text-muted-foreground mt-1">"{b.notes}"</p>}
              {b.proposed_date && b.proposed_time && (
                <p className="mt-2 text-xs inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-500/15 text-amber-700">
                  <CalendarClock className="h-3.5 w-3.5" />
                  Awaiting client response: {b.proposed_date} · {b.proposed_time.slice(0, 5)}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                Status: <StatusPill status={b.status} /> · ${Number(b.total).toFixed(0)} · {b.slot_id ? "Instant" : "Request"}
              </p>
              {b.status === "pending" && b.expires_at && (() => {
                const msLeft = new Date(b.expires_at).getTime() - Date.now();
                if (msLeft <= 0) return <p className="mt-1 text-xs text-destructive">⌛ Deadline passed — will auto-expire shortly</p>;
                const hours = Math.floor(msLeft / 3600000);
                const mins = Math.floor((msLeft % 3600000) / 60000);
                const label = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
                const urgent = msLeft < 2 * 3600000;
                return (
                  <p className={`mt-1 text-xs ${urgent ? "text-destructive font-medium" : "text-amber-700"}`}>
                    ⏱ Respond within {label} or the request will auto-expire
                  </p>
                );
              })()}
            </div>
            {b.status === "pending" && (
              <div className="flex gap-2 shrink-0 flex-wrap">
                <button onClick={() => onAction(b.id, "confirmed")} className="h-9 px-3 rounded-full bg-foreground text-background text-xs font-medium inline-flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" /> Confirm
                </button>
                <button
                  onClick={() => {
                    setProposeFor(proposeFor === b.id ? null : b.id);
                    setPDate(b.date);
                    setPTime(b.start_time ? b.start_time.slice(0, 5) : "");
                    setPNote("");
                  }}
                  className="h-9 px-3 rounded-full bg-muted text-foreground text-xs font-medium inline-flex items-center gap-1"
                >
                  <CalendarClock className="h-3.5 w-3.5" /> Propose time
                </button>
                <button onClick={() => onAction(b.id, "declined")} className="h-9 px-3 rounded-full bg-muted text-foreground text-xs font-medium inline-flex items-center gap-1">
                  <X className="h-3.5 w-3.5" /> Decline
                </button>
              </div>
            )}
          </div>

          {proposeFor === b.id && (
            <div className="mt-4 pt-4 border-t border-border space-y-3">
              <p className="text-xs text-muted-foreground">Suggest a different date and time. The client will get this as a message.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-xs font-medium">
                  Date
                  <input type="date" value={pDate} onChange={(e) => setPDate(e.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" />
                </label>
                <label className="text-xs font-medium">
                  Time
                  <input type="time" value={pTime} onChange={(e) => setPTime(e.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" />
                </label>
              </div>
              <label className="text-xs font-medium block">
                Note (optional)
                <textarea value={pNote} onChange={(e) => setPNote(e.target.value)} rows={2}
                  placeholder="Why this time works better…"
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
              </label>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setProposeFor(null)} className="h-9 px-3 rounded-full bg-muted text-foreground text-xs font-medium">
                  Cancel
                </button>
                <button
                  disabled={!pDate || !pTime || sending}
                  onClick={async () => {
                    setSending(true);
                    try {
                      await onPropose(b.id, pDate, pTime, pNote.trim());
                      setProposeFor(null);
                    } finally { setSending(false); }
                  }}
                  className="h-9 px-3 rounded-full bg-foreground text-background text-xs font-medium inline-flex items-center gap-1 disabled:opacity-50"
                >
                  {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CalendarClock className="h-3.5 w-3.5" />}
                  Send proposal
                </button>
              </div>
            </div>
          )}
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

type Tour = {
  id: string;
  slug: string;
  title: string;
  short_description: string;
  cover_url: string | null;
  city_id: string;
  duration_hours: number;
  price_from: number;
  price_by_language: Record<string, number>;
  pricing_mode: "fixed" | "by_group";
  base_language: string;
  language_multipliers: Record<string, number>;
  group_prices: Record<string, number>;
  children_free_under: number;
  languages: string[];
  transport_included: boolean;
  highlights: string[];
  included: string[];
  not_included: string[];
  published: boolean;
  sort_order: number;
  category_ids: string[];
};

const GROUP_KEYS = ["private", "small", "group", "large"] as const;
const GROUP_LABELS: Record<(typeof GROUP_KEYS)[number], string> = {
  private: "Private (up to 2)",
  small: "Small group (up to 6)",
  group: "Group (up to 12)",
  large: "Large group (up to 25)",
};

function ToursPanel() {
  const [languages, setLanguages] = useState<string[]>([]);
  const [cities, setCities] = useState<Array<{ id: string; name: string }>>([]);
  const [defaultCityId, setDefaultCityId] = useState<string>("");
  const [items, setItems] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Tour | null>(null);
  const [creating, setCreating] = useState(false);

  const fetchList = useServerFn(listMyTours);
  const upsertFn = useServerFn(upsertTour);
  const deleteFn = useServerFn(deleteTour);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchList() as { guide: { languages: string[]; city_id: string } | null; cities: Array<{ id: string; name: string }>; tours: Tour[] };
      setLanguages(res.guide?.languages ?? []);
      setCities(res.cities ?? []);
      setDefaultCityId(res.guide?.city_id ?? "");
      setItems(res.tours.map((t) => ({
        ...t,
        price_by_language: (t.price_by_language ?? {}) as Record<string, number>,
        pricing_mode: (t.pricing_mode === "by_group" ? "by_group" : "fixed") as "fixed" | "by_group",
        base_language: t.base_language ?? (res.guide?.languages?.[0] ?? "Russian"),
        language_multipliers: (t.language_multipliers ?? {}) as Record<string, number>,
        group_prices: (t.group_prices ?? {}) as Record<string, number>,
        children_free_under: Number(t.children_free_under ?? 16),
        languages: t.languages ?? [],
        highlights: t.highlights ?? [],
        included: t.included ?? [],
        not_included: t.not_included ?? [],
        category_ids: t.category_ids ?? [],
      })));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [fetchList]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div className="rounded-3xl bg-card p-6 ring-1 ring-border text-sm text-muted-foreground inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-card p-6 ring-1 ring-border">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold">Your tours</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Create the tours you offer. Travellers see your prices per language and pick a date.
            </p>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="h-10 px-4 rounded-full bg-foreground text-background text-sm font-medium inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Add tour
          </button>
        </div>
        {languages.length === 0 && (
          <p className="mt-4 text-sm text-amber-700 bg-amber-500/10 rounded-xl p-3">
            Add languages on the Languages tab first so you can set per-language prices.
          </p>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-3xl bg-card p-6 ring-1 ring-border text-sm text-muted-foreground">No tours yet. Click "Add tour" to create one.</div>
      ) : (
        <div className="space-y-3">
          {items.map((it) => (
            <div key={it.id} className="rounded-2xl bg-card p-5 ring-1 ring-border">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{it.title} {!it.published && <span className="text-[10px] uppercase text-muted-foreground ml-1">draft</span>}</p>
                  <p className="text-xs text-muted-foreground">{Number(it.duration_hours)}h · {it.pricing_mode === "by_group" ? "by group size" : `$${it.price_from}`} {it.transport_included && "· transport"}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {it.pricing_mode === "by_group"
                      ? GROUP_KEYS.filter((k) => (it.group_prices[k] ?? 0) > 0).map((k) => (
                          <span key={k} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs bg-primary/10 text-primary ring-1 ring-primary/20">
                            <span className="font-medium">{GROUP_LABELS[k]}</span>
                            <span className="tabular-nums">${it.group_prices[k]}</span>
                          </span>
                        ))
                      : it.languages.map((lng) => {
                          const mult = it.language_multipliers[lng];
                          const isBase = lng === it.base_language;
                          return (
                            <span key={lng} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs bg-primary/10 text-primary ring-1 ring-primary/20">
                              <span className="font-medium">{lng}</span>
                              <span className="tabular-nums">{isBase ? "base" : (mult ? `+${mult}%` : "+0%")}</span>
                            </span>
                          );
                        })}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => setEditing(it)} className="h-9 w-9 grid place-items-center rounded-full text-muted-foreground hover:bg-muted">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm(`Delete "${it.title}"?`)) return;
                      try { await deleteFn({ data: { id: it.id } }); toast.success("Deleted"); load(); }
                      catch (e) { toast.error((e as Error).message); }
                    }}
                    className="h-9 w-9 grid place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {(editing || creating) && (
        <TourEditor
          languages={languages}
          cities={cities}
          defaultCityId={defaultCityId}
          initial={editing}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSave={async (payload) => {
            try {
              await upsertFn({ data: payload });
              toast.success("Saved");
              setEditing(null);
              setCreating(false);
              load();
            } catch (e) { toast.error((e as Error).message); }
          }}
        />
      )}
    </div>
  );
}

function arrToText(a: string[]) { return a.join("\n"); }
function textToArr(s: string) { return s.split("\n").map((x) => x.trim()).filter(Boolean); }

function TourEditor({
  languages, cities, defaultCityId, initial, onClose, onSave,
}: {
  languages: string[];
  cities: Array<{ id: string; name: string }>;
  defaultCityId: string;
  initial: Tour | null;
  onClose: () => void;
  onSave: (payload: {
    id?: string;
    title: string;
    short_description: string;
    cover_url: string | null;
    city_id: string;
    duration_hours: number;
    pricing_mode: "fixed" | "by_group";
    fixed_price: number;
    group_prices: Partial<Record<(typeof GROUP_KEYS)[number], number>>;
    base_language: string;
    language_multipliers: Record<string, number>;
    children_free_under: number;
    languages: string[];
    transport_included: boolean;
    highlights: string[];
    included: string[];
    not_included: string[];
    published: boolean;
    sort_order: number;
    category_ids: string[];
  }) => void;
}) {
  const { data: categories = [] } = useCategories();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [shortDesc, setShortDesc] = useState(initial?.short_description ?? "");
  const [coverUrl, setCoverUrl] = useState(initial?.cover_url ?? "");
  const [cityId, setCityId] = useState(initial?.city_id ?? defaultCityId);
  const [durationHours, setDurationHours] = useState<number>(initial?.duration_hours ?? 2);
  const [pricingMode, setPricingMode] = useState<"fixed" | "by_group">(initial?.pricing_mode ?? "fixed");
  const [fixedPrice, setFixedPrice] = useState<number>(
    initial?.pricing_mode === "by_group" ? 0 : Number(initial?.group_prices?.fixed ?? initial?.price_from ?? 0),
  );
  const [groupPricesText, setGroupPricesText] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    GROUP_KEYS.forEach((k) => {
      const v = initial?.group_prices?.[k];
      out[k] = v ? String(v) : "";
    });
    return out;
  });
  const [baseLanguage, setBaseLanguage] = useState<string>(initial?.base_language ?? languages[0] ?? "Russian");
  const [langMultsText, setLangMultsText] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    languages.forEach((l) => {
      const v = initial?.language_multipliers?.[l];
      out[l] = v !== undefined ? String(v) : "";
    });
    return out;
  });
  const [childrenFreeUnder, setChildrenFreeUnder] = useState<number>(initial?.children_free_under ?? 16);
  const [transportIncluded, setTransportIncluded] = useState<boolean>(initial?.transport_included ?? false);
  const [tourLangs, setTourLangs] = useState<string[]>(initial?.languages ?? languages);
  const [highlights, setHighlights] = useState(arrToText(initial?.highlights ?? []));
  const [included, setIncluded] = useState(arrToText(initial?.included ?? []));
  const [notIncluded, setNotIncluded] = useState(arrToText(initial?.not_included ?? []));
  const [published, setPublished] = useState(initial?.published ?? true);
  const [selectedCats, setSelectedCats] = useState<string[]>(initial?.category_ids ?? []);
  const [uploading, setUploading] = useState(false);
  const toggleCat = (id: string) => setSelectedCats((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);

  const toggleLang = (lng: string) => {
    setTourLangs((cur) => cur.includes(lng) ? cur.filter((x) => x !== lng) : [...cur, lng]);
  };

  const upload = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `tours/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("guide-photos").upload(path, file, { upsert: true });
    setUploading(false);
    if (error) { toast.error(error.message); return; }
    const { data } = supabase.storage.from("guide-photos").getPublicUrl(path);
    setCoverUrl(data.publicUrl);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 overflow-y-auto" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl rounded-3xl bg-background p-6 ring-1 ring-border shadow-xl my-8">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">{initial ? "Edit tour" : "New tour"}</h3>
          <button onClick={onClose} className="h-9 w-9 grid place-items-center rounded-full hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-4 space-y-4">
          <label className="block text-sm">
            <span className="text-xs text-muted-foreground">Title</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Old Tashkent walking tour" className="mt-1 w-full h-11 rounded-xl border border-input bg-background px-3 text-sm" />
          </label>
          <label className="block text-sm">
            <span className="text-xs text-muted-foreground">Short description (shown on the card)</span>
            <input value={shortDesc} onChange={(e) => setShortDesc(e.target.value)} placeholder="2-3 hour stroll through the old town" className="mt-1 w-full h-11 rounded-xl border border-input bg-background px-3 text-sm" />
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <label className="block text-sm">
              <span className="text-xs text-muted-foreground">City</span>
              <select value={cityId} onChange={(e) => setCityId(e.target.value)} className="mt-1 w-full h-11 rounded-xl border border-input bg-background px-3 text-sm">
                {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-xs text-muted-foreground">Duration (h)</span>
              <input type="number" min={0.5} step={0.5} value={durationHours} onChange={(e) => setDurationHours(Number(e.target.value) || 0)} className="mt-1 w-full h-11 rounded-xl border border-input bg-background px-3 text-sm" />
            </label>
            <label className="block text-sm">
              <span className="text-xs text-muted-foreground">Children free under (age)</span>
              <input type="number" min={0} max={21} value={childrenFreeUnder} onChange={(e) => setChildrenFreeUnder(Number(e.target.value) || 0)} className="mt-1 w-full h-11 rounded-xl border border-input bg-background px-3 text-sm" />
            </label>
            <label className="block text-sm">
              <span className="text-xs text-muted-foreground">&nbsp;</span>
              <label className="mt-1 h-11 w-full inline-flex items-center gap-2 rounded-xl border border-input bg-background px-3 text-sm cursor-pointer">
                <input type="checkbox" checked={transportIncluded} onChange={(e) => setTransportIncluded(e.target.checked)} className="h-4 w-4" />
                Transport included
              </label>
            </label>
          </div>

          {/* Pricing */}
          <div className="rounded-2xl border border-border bg-card/40 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">Pricing</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <label className={`inline-flex items-center gap-2 rounded-full px-3 h-9 text-sm cursor-pointer ${pricingMode === "fixed" ? "bg-foreground text-background" : "bg-secondary"}`}>
                <input type="radio" name="pmode" className="hidden" checked={pricingMode === "fixed"} onChange={() => setPricingMode("fixed")} />
                Fixed price
              </label>
              <label className={`inline-flex items-center gap-2 rounded-full px-3 h-9 text-sm cursor-pointer ${pricingMode === "by_group" ? "bg-foreground text-background" : "bg-secondary"}`}>
                <input type="radio" name="pmode" className="hidden" checked={pricingMode === "by_group"} onChange={() => setPricingMode("by_group")} />
                Price by group size
              </label>
            </div>
            {pricingMode === "fixed" ? (
              <label className="block text-sm max-w-xs">
                <span className="text-xs text-muted-foreground">Price ($, in base language)</span>
                <input type="number" min={0} value={fixedPrice || ""} onChange={(e) => setFixedPrice(Number(e.target.value) || 0)} className="mt-1 w-full h-11 rounded-xl border border-input bg-background px-3 text-sm" />
              </label>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {GROUP_KEYS.map((k) => (
                  <div key={k} className="flex items-center gap-2 rounded-xl border border-input bg-background px-3 h-11 text-sm">
                    <span className="flex-1 font-medium">{GROUP_LABELS[k]}</span>
                    <span className="text-muted-foreground">$</span>
                    <input
                      type="number"
                      min={0}
                      value={groupPricesText[k] ?? ""}
                      onChange={(e) => setGroupPricesText({ ...groupPricesText, [k]: e.target.value })}
                      placeholder="—"
                      className="w-24 h-9 bg-transparent outline-none text-sm tabular-nums"
                    />
                  </div>
                ))}
                <p className="col-span-full text-xs text-muted-foreground">Leave empty to skip a group size. Larger groups can still contact you directly.</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Cover image</p>
            <div className="flex items-center gap-3">
              {coverUrl ? (
                <img src={coverUrl} alt="" className="h-20 w-28 rounded-lg object-cover ring-1 ring-border" />
              ) : (
                <div className="h-20 w-28 rounded-lg bg-secondary" />
              )}
              <label className="inline-flex items-center gap-2 h-9 px-3 rounded-full bg-secondary text-sm cursor-pointer hover:bg-secondary/80">
                {uploading ? "Uploading…" : "Upload"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
              </label>
              {coverUrl && <button onClick={() => setCoverUrl("")} className="text-xs text-destructive">Remove</button>}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium">Tour languages & surcharge %</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pick a base language (= 100% price). For other languages set a % surcharge — system computes the final price automatically. Leave at 0 if the price is the same.
            </p>
            {languages.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">No languages on your profile yet.</p>
            ) : (
              <>
                <div className="mt-3 flex items-center gap-2 text-sm">
                  <span className="text-xs text-muted-foreground">Base language:</span>
                  <select
                    value={baseLanguage}
                    onChange={(e) => setBaseLanguage(e.target.value)}
                    className="h-9 rounded-lg border border-input bg-background px-2 text-sm"
                  >
                    {languages.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {languages.map((lng) => {
                    const enabled = tourLangs.includes(lng);
                    const isBase = lng === baseLanguage;
                    return (
                      <div key={lng} className="flex items-center gap-2 rounded-xl border border-input bg-background px-3 h-11 text-sm">
                        <label className="inline-flex items-center gap-2 flex-1 cursor-pointer">
                          <input type="checkbox" checked={enabled} onChange={() => toggleLang(lng)} className="h-4 w-4" />
                          <span className="font-medium">{lng}</span>
                          {isBase && <span className="text-[10px] uppercase text-muted-foreground">base</span>}
                        </label>
                        {!isBase && (
                          <>
                            <span className="text-muted-foreground">+</span>
                            <input
                              type="number"
                              value={langMultsText[lng] ?? ""}
                              onChange={(e) => setLangMultsText({ ...langMultsText, [lng]: e.target.value })}
                              placeholder="0"
                              disabled={!enabled}
                              className="w-16 h-9 bg-transparent outline-none text-sm tabular-nums disabled:opacity-50 text-right"
                            />
                            <span className="text-muted-foreground">%</span>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>


          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="block text-sm">
              <span className="text-xs text-muted-foreground">Highlights (one per line)</span>
              <textarea value={highlights} onChange={(e) => setHighlights(e.target.value)} rows={4} className="mt-1 w-full rounded-xl border border-input bg-background p-2 text-sm" />
            </label>
            <label className="block text-sm">
              <span className="text-xs text-muted-foreground">Included</span>
              <textarea value={included} onChange={(e) => setIncluded(e.target.value)} rows={4} className="mt-1 w-full rounded-xl border border-input bg-background p-2 text-sm" />
            </label>
            <label className="block text-sm">
              <span className="text-xs text-muted-foreground">Not included</span>
              <textarea value={notIncluded} onChange={(e) => setNotIncluded(e.target.value)} rows={4} className="mt-1 w-full rounded-xl border border-input bg-background p-2 text-sm" />
            </label>
          </div>

          <div>
            <p className="text-sm font-medium">Categories</p>
            <p className="text-xs text-muted-foreground mt-0.5">Pick the categories that best describe this tour. Travellers filter by these.</p>
            {categories.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">No categories available yet.</p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {categories.map((c) => {
                  const on = selectedCats.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleCat(c.id)}
                      className={`px-3 h-8 rounded-full text-sm transition ${on ? "bg-foreground text-background" : "bg-secondary text-foreground hover:bg-secondary/80"}`}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} className="h-4 w-4" />
            <span>Published (visible to travellers)</span>
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="h-10 px-4 rounded-full bg-muted text-sm font-medium">Cancel</button>
          <button
            disabled={!title.trim() || !cityId}
            onClick={() => {
              const gp: Partial<Record<(typeof GROUP_KEYS)[number], number>> = {};
              for (const k of GROUP_KEYS) {
                const n = Number(groupPricesText[k] ?? "");
                if (Number.isFinite(n) && n > 0) gp[k] = n;
              }
              const mults: Record<string, number> = {};
              for (const [k, v] of Object.entries(langMultsText)) {
                if (k === baseLanguage) continue;
                const n = Number(v);
                if (Number.isFinite(n) && v !== "") mults[k] = n;
              }
              onSave({
                id: initial?.id,
                title: title.trim(),
                short_description: shortDesc.trim(),
                cover_url: coverUrl.trim() || null,
                city_id: cityId,
                duration_hours: durationHours,
                pricing_mode: pricingMode,
                fixed_price: fixedPrice,
                group_prices: gp,
                base_language: baseLanguage,
                language_multipliers: mults,
                children_free_under: childrenFreeUnder,
                languages: tourLangs,
                transport_included: transportIncluded,
                highlights: textToArr(highlights),
                included: textToArr(included),
                not_included: textToArr(notIncluded),
                published,
                sort_order: initial?.sort_order ?? 0,
                category_ids: selectedCats,
              });
            }}
            className="h-10 px-5 rounded-full bg-foreground text-background text-sm font-medium disabled:opacity-50"
          >Save</button>
        </div>
      </div>
    </div>
  );
}

function CitiesPanel({
  guideCityId, currentExtra, onSaved,
}: {
  guideCityId: string;
  currentExtra: string[];
  onSaved: () => void;
}) {
  const { data: cities = [] } = useCities();
  const updateFn = useServerFn(updateMyCities);
  const [selected, setSelected] = useState<string[]>(currentExtra);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setSelected(currentExtra); }, [currentExtra]);

  const toggle = (id: string) => {
    if (id === guideCityId) return;
    setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  };

  const save = async () => {
    setSaving(true);
    try {
      await updateFn({ data: { extra_city_ids: selected } });
      toast.success("Saved");
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const homeCity = cities.find((c) => c.id === guideCityId);

  return (
    <div className="rounded-3xl bg-card p-6 ring-1 ring-border space-y-4">
      <div>
        <h2 className="font-display text-lg font-semibold">Cities you work in</h2>
        <p className="text-sm text-muted-foreground mt-1">Your home city is set by an administrator. Tick any additional cities where you also offer tours.</p>
      </div>
      {homeCity && (
        <div className="text-sm">
          <span className="text-muted-foreground">Home city:</span>{" "}
          <span className="font-medium">{homeCity.name}</span>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {cities.filter((c) => c.id !== guideCityId).map((c) => {
          const on = selected.includes(c.id);
          return (
            <button
              key={c.id}
              onClick={() => toggle(c.id)}
              className={`px-3 h-9 rounded-full text-sm transition ${on ? "bg-foreground text-background" : "bg-secondary text-foreground hover:bg-secondary/80"}`}
            >
              {c.name}
            </button>
          );
        })}
      </div>
      <button
        onClick={save}
        disabled={saving}
        className="h-10 px-5 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save cities"}
      </button>
    </div>
  );
}

function LanguagesPanel({
  current,
  onSaved,
}: {
  current: string[];
  onSaved: () => void;
}) {
  const updateFn = useServerFn(updateMyLanguages);
  const [options, setOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [selected, setSelected] = useState<string[]>(current);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setSelected(current); }, [current]);

  useEffect(() => {
    supabase
      .from("languages")
      .select("id, name")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => {
        if (data) setOptions(data);
      });
  }, []);

  const toggle = (name: string) => {
    setSelected((s) => s.includes(name) ? s.filter((x) => x !== name) : [...s, name]);
  };

  const save = async () => {
    setSaving(true);
    try {
      await updateFn({ data: { languages: selected } });
      toast.success("Saved");
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-3xl bg-card p-6 ring-1 ring-border space-y-4">
      <div>
        <h2 className="font-display text-lg font-semibold">Languages you speak</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Pick the languages in which you can run tours. The list is curated by the team.
        </p>
      </div>
      {options.length === 0 ? (
        <p className="text-sm text-muted-foreground">No languages available yet.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {options.map((l) => {
            const on = selected.includes(l.name);
            return (
              <button
                key={l.id}
                onClick={() => toggle(l.name)}
                className={`px-3 h-9 rounded-full text-sm transition ${on ? "bg-foreground text-background" : "bg-secondary text-foreground hover:bg-secondary/80"}`}
              >
                {l.name}
              </button>
            );
          })}
        </div>
      )}
      <button
        onClick={save}
        disabled={saving}
        className="h-10 px-5 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save languages"}
      </button>
    </div>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef, lazy, Suspense } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calendar, CalendarClock, CalendarDays, Plus, Trash2, Check, X, LogOut, Loader2, Copy, Link2, Image as ImageIcon, Compass, Pencil, MapPin, Sparkles, ShieldCheck, Home, UserCircle2, Wallet } from "lucide-react";
import { CalendarPanel } from "@/components/guide/CalendarPanel";
import { GuideAIPanel } from "@/components/guide/GuideAIPanel";
import { VerificationPanel } from "@/components/guide/VerificationPanel";
import { ProfilePanel } from "@/components/guide/ProfilePanel";
import { EarningsPanel } from "@/components/guide/EarningsPanel";

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
import { useGuideI18n } from "@/lib/guide-i18n";

const TourMapPicker = lazy(() => import("@/components/TourMapPicker"));

export const Route = createFileRoute("/guide")({
  head: () => ({ meta: [{ title: "Hamroh" }] }),
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
  verified_languages: Record<string, string> | null;
  cities?: { name: string } | null;
};

function GuidePortal() {
  const { tg } = useGuideI18n();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [guide, setGuide] = useState<MyGuide | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [tab, setTab] = useState<"calendar" | "ai" | "availability" | "bookings" | "tours" | "cities" | "languages" | "posts" | "referral" | "verification" | "profile" | "earnings">("calendar");

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
    const waitForUser = async (): Promise<{ id: string } | null> => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session?.user) return sessionData.session.user;
      const { data } = await supabase.auth.getUser();
      if (data.user) return data.user;
      return await new Promise<{ id: string } | null>((resolve) => {
        let unsubscribe = () => {};
        const timeout = window.setTimeout(() => {
          unsubscribe();
          resolve(null);
        }, 3000);
        const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
          if (!session?.user) return;
          window.clearTimeout(timeout);
          unsubscribe();
          resolve(session.user);
        });
        unsubscribe = () => sub.subscription.unsubscribe();
      });
    };
    (async () => {
      const user = await waitForUser();
      if (!mounted) return;
      if (!user) {
        navigate({ to: "/login", search: { redirect: "/guide" }, replace: true });
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
        <h1 className="font-display text-2xl font-semibold">{tg("portal.noProfileTitle")}</h1>
        <p className="mt-3 text-muted-foreground">
          {tg("portal.noProfileText")}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/" className="h-10 px-4 inline-flex items-center rounded-full bg-secondary text-sm font-medium">{tg("common.home")}</Link>
          <button
            onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/login" }); }}
            className="h-10 px-4 inline-flex items-center rounded-full bg-foreground text-background text-sm font-medium"
          >{tg("common.signOut")}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border bg-background">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{tg("portal.eyebrow")}</p>
            <p className="font-display text-lg font-semibold truncate">{guide.name}</p>
          </div>
          <div className="flex items-center gap-1">
            <Link
              to="/"
              className="inline-flex items-center gap-2 h-9 px-3 rounded-full text-sm hover:bg-muted"
            >
              <Home className="h-4 w-4" /> <span className="hidden sm:inline">{tg("common.home")}</span>
            </Link>
            <button
              onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/login" }); }}
              className="inline-flex items-center gap-2 h-9 px-3 rounded-full text-sm hover:bg-muted"
            >
              <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">{tg("common.signOut")}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex gap-2 mb-6 flex-wrap">
          <TabBtn active={tab === "calendar"} onClick={() => setTab("calendar")}>
            <CalendarDays className="h-4 w-4" /> {tg("tab.calendar")}
          </TabBtn>
          <TabBtn active={tab === "ai"} onClick={() => setTab("ai")}>
            <Sparkles className="h-4 w-4" /> {tg("tab.ai")}
          </TabBtn>
          <TabBtn active={tab === "availability"} onClick={() => setTab("availability")}>
            <Calendar className="h-4 w-4" /> {tg("tab.availability")}
          </TabBtn>
          <TabBtn active={tab === "tours"} onClick={() => setTab("tours")}>
            <Compass className="h-4 w-4" /> {tg("tab.tours")}
          </TabBtn>
          <TabBtn active={tab === "bookings"} onClick={() => setTab("bookings")}>
            {tg("tab.bookings", { n: bookings.length })}
          </TabBtn>
          <TabBtn active={tab === "cities"} onClick={() => setTab("cities")}>
            <MapPin className="h-4 w-4" /> {tg("tab.cities")}
          </TabBtn>
          <TabBtn active={tab === "languages"} onClick={() => setTab("languages")}>
            {tg("tab.languages")}
          </TabBtn>
          <TabBtn active={tab === "posts"} onClick={() => setTab("posts")}>
            <ImageIcon className="h-4 w-4" /> {tg("tab.posts")}
          </TabBtn>
          <TabBtn active={tab === "referral"} onClick={() => setTab("referral")}>
            <Link2 className="h-4 w-4" /> {tg("tab.referral")}
          </TabBtn>
          <TabBtn active={tab === "verification"} onClick={() => setTab("verification")}>
            <ShieldCheck className="h-4 w-4" /> {tg("tab.verification")}
          </TabBtn>
          <TabBtn active={tab === "profile"} onClick={() => setTab("profile")}>
            <UserCircle2 className="h-4 w-4" /> Profile
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
                toast.success(tg("availability.added"));
                await load();
              } catch (e) { toast.error((e as Error).message); }
            }}
            onDelete={async (id) => {
              try {
                await deleteSlotFn({ data: { id } });
                toast.success(tg("availability.removed"));
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
                toast.success(tg("bookings.updated", { status: tg(`status.${status}` as Parameters<typeof tg>[0]) }));
                await load();
              } catch (e) { toast.error((e as Error).message); }
            }}
            onPropose={async (bookingId, date, time, note) => {
              try {
                await proposeTimeFn({ data: { id: bookingId, date, time, note: note || undefined } });
                toast.success(tg("bookings.proposalSent"));
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
            verified={guide.verified_languages ?? {}}
            onSaved={() => load()}
          />
        )}

        {tab === "posts" && <GuidePostsPanel />}

        {tab === "referral" && (
          <ReferralPanel code={guide.referral_code} clicks={guide.referral_clicks} />
        )}

        {tab === "verification" && <VerificationPanel />}

        {tab === "profile" && <ProfilePanel guideId={guide.id} />}
      </div>
    </div>
  );
}

function ReferralPanel({ code, clicks }: { code: string | null; clicks: number }) {
  const { tg } = useGuideI18n();
  if (!code) {
    return (
      <div className="rounded-3xl bg-card p-6 ring-1 ring-border text-sm text-muted-foreground">
        {tg("referral.noCode")}
      </div>
    );
  }
  const link = `https://hamroh-local-guide.lovable.app/?ref=${code}`;
  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-card p-6 ring-1 ring-border">
        <h2 className="font-display text-lg font-semibold">{tg("referral.title")}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {tg("referral.text")}
        </p>
        <div className="mt-4 flex items-center gap-2">
          <input readOnly value={link} className="flex-1 h-11 rounded-xl border border-input bg-background px-3 text-sm font-mono" />
          <button
            onClick={async () => { await navigator.clipboard.writeText(link); toast.success(tg("common.copied")); }}
            className="h-11 px-4 rounded-xl bg-foreground text-background text-sm font-medium inline-flex items-center gap-2"
          >
            <Copy className="h-4 w-4" /> {tg("referral.copy")}
          </button>
        </div>
      </div>
      <div className="rounded-3xl bg-card p-6 ring-1 ring-border">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{tg("referral.clicks")}</p>
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
  const { tg } = useGuideI18n();
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [duration, setDuration] = useState(120);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-card p-6 ring-1 ring-border">
        <h2 className="font-display text-lg font-semibold">{tg("availability.addTitle")}</h2>
        <p className="text-sm text-muted-foreground mt-1">{tg("availability.addText")}</p>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
          <label className="text-sm">
            <span className="text-xs text-muted-foreground">{tg("availability.date")}</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full h-11 rounded-xl border border-input bg-background px-3 text-sm" />
          </label>
          <label className="text-sm">
            <span className="text-xs text-muted-foreground">{tg("availability.startTime")}</span>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-1 w-full h-11 rounded-xl border border-input bg-background px-3 text-sm" />
          </label>
          <label className="text-sm">
            <span className="text-xs text-muted-foreground">{tg("availability.duration")}</span>
            <input type="number" min={30} max={720} step={30} value={duration} onChange={(e) => setDuration(Number(e.target.value) || 120)} className="mt-1 w-full h-11 rounded-xl border border-input bg-background px-3 text-sm" />
          </label>
          <button
            disabled={!date || !time}
            onClick={() => onAdd({ date, start_time: time, duration_minutes: duration })}
            className="h-11 mt-[18px] rounded-xl bg-foreground text-background text-sm font-medium inline-flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> {tg("availability.addSlot")}
          </button>
        </div>
      </div>

      <div className="rounded-3xl bg-card p-6 ring-1 ring-border">
        <h2 className="font-display text-lg font-semibold">{tg("availability.upcoming")}</h2>
        {slots.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{tg("availability.empty")}</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {slots.map((s) => (
              <li key={s.id} className="py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{s.date} · {s.start_time.slice(0, 5)} · {s.duration_minutes} {tg("common.minutes")}</p>
                  <p className="text-xs text-muted-foreground">{s.is_booked ? tg("availability.booked") : tg("availability.available")}</p>
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
  const { tg } = useGuideI18n();
  const [proposeFor, setProposeFor] = useState<string | null>(null);
  const [pDate, setPDate] = useState("");
  const [pTime, setPTime] = useState("");
  const [pNote, setPNote] = useState("");
  const [sending, setSending] = useState(false);

  if (bookings.length === 0) {
    return <div className="rounded-3xl bg-card p-6 ring-1 ring-border text-sm text-muted-foreground">{tg("bookings.empty")}</div>;
  }
  return (
    <div className="space-y-3">
      {bookings.map((b) => (
        <div key={b.id} className="rounded-2xl bg-card p-5 ring-1 ring-border">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <p className="font-medium">{b.customer_name} · {b.guests} {b.guests === 1 ? tg("bookings.guestOne") : tg("bookings.guestMany")}</p>
              <p className="text-xs text-muted-foreground truncate">
                {b.customer_email || (b.customer_telegram_username ? `@${b.customer_telegram_username}` : tg("bookings.telegram"))}
              </p>
              <p className="text-sm mt-2">
                <span className="font-medium">{b.experience}</span> — {b.date}
                {b.start_time && <> · {b.start_time.slice(0, 5)}</>}
                {b.duration_minutes && <> · {b.duration_minutes} {tg("common.minutes")}</>}
              </p>
              {b.notes && <p className="text-sm text-muted-foreground mt-1">"{b.notes}"</p>}
              {b.proposed_date && b.proposed_time && (
                <p className="mt-2 text-xs inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-500/15 text-amber-700">
                  <CalendarClock className="h-3.5 w-3.5" />
                  {tg("bookings.awaiting", { date: b.proposed_date, time: b.proposed_time.slice(0, 5) })}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                {tg("bookings.status")}: <StatusPill status={b.status} /> · ${Number(b.total).toFixed(0)} · {b.slot_id ? tg("bookings.instant") : tg("bookings.request")}
              </p>
              {b.status === "pending" && b.expires_at && (() => {
                const msLeft = new Date(b.expires_at).getTime() - Date.now();
                if (msLeft <= 0) return <p className="mt-1 text-xs text-destructive">{tg("bookings.deadlinePassed")}</p>;
                const hours = Math.floor(msLeft / 3600000);
                const mins = Math.floor((msLeft % 3600000) / 60000);
                const label = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
                const urgent = msLeft < 2 * 3600000;
                return (
                  <p className={`mt-1 text-xs ${urgent ? "text-destructive font-medium" : "text-amber-700"}`}>
                    {tg("bookings.respondWithin", { time: label })}
                  </p>
                );
              })()}
            </div>
            {b.status === "pending" && (
              <div className="flex gap-2 shrink-0 flex-wrap">
                <button onClick={() => onAction(b.id, "confirmed")} className="h-9 px-3 rounded-full bg-foreground text-background text-xs font-medium inline-flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" /> {tg("bookings.confirm")}
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
                  <CalendarClock className="h-3.5 w-3.5" /> {tg("bookings.proposeTime")}
                </button>
                <button onClick={() => onAction(b.id, "declined")} className="h-9 px-3 rounded-full bg-muted text-foreground text-xs font-medium inline-flex items-center gap-1">
                  <X className="h-3.5 w-3.5" /> {tg("bookings.decline")}
                </button>
              </div>
            )}
          </div>

          {proposeFor === b.id && (
            <div className="mt-4 pt-4 border-t border-border space-y-3">
              <p className="text-xs text-muted-foreground">{tg("bookings.suggestText")}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-xs font-medium">
                  {tg("availability.date")}
                  <input type="date" value={pDate} onChange={(e) => setPDate(e.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" />
                </label>
                <label className="text-xs font-medium">
                  {tg("bookings.time")}
                  <input type="time" value={pTime} onChange={(e) => setPTime(e.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" />
                </label>
              </div>
              <label className="text-xs font-medium block">
                {tg("bookings.note")}
                <textarea value={pNote} onChange={(e) => setPNote(e.target.value)} rows={2}
                  placeholder={tg("bookings.notePh")}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
              </label>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setProposeFor(null)} className="h-9 px-3 rounded-full bg-muted text-foreground text-xs font-medium">
                  {tg("common.cancel")}
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
                  {tg("bookings.sendProposal")}
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
  const { tg } = useGuideI18n();
  const map: Record<string, string> = {
    pending: "bg-amber-500/15 text-amber-700",
    confirmed: "bg-emerald-500/15 text-emerald-700",
    declined: "bg-destructive/15 text-destructive",
    cancelled: "bg-muted text-muted-foreground",
  };
  const labelKey = `status.${status}` as Parameters<typeof tg>[0];
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${map[status] ?? "bg-muted"}`}>{tg(labelKey)}</span>;
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
  meeting_point?: string;
  end_point?: string;
  meeting_lat?: number | null;
  meeting_lng?: number | null;
  end_lat?: number | null;
  end_lng?: number | null;
  end_same_as_meeting?: boolean;
  published: boolean;
  sort_order: number;
  category_ids: string[];
};

const GROUP_KEYS = ["private", "small", "group", "large"] as const;

function ToursPanel() {
  const { tg } = useGuideI18n();
  const [languages, setLanguages] = useState<string[]>([]);
  const [cities, setCities] = useState<Array<{ id: string; name: string; lat: number; lng: number }>>([]);
  const [defaultCityId, setDefaultCityId] = useState<string>("");
  const [guideId, setGuideId] = useState<string>("");
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
      const res = await fetchList() as { guide: { id: string; languages: string[]; city_id: string } | null; cities: Array<{ id: string; name: string; lat: number; lng: number }>; tours: Tour[] };
      setLanguages(res.guide?.languages ?? []);
      setCities(res.cities ?? []);
      setDefaultCityId(res.guide?.city_id ?? "");
      setGuideId(res.guide?.id ?? "");
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
        end_same_as_meeting: !!t.end_same_as_meeting,
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
    return <div className="rounded-3xl bg-card p-6 ring-1 ring-border text-sm text-muted-foreground inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> {tg("common.loading")}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-card p-6 ring-1 ring-border">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold">{tg("tours.title")}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {tg("tours.text")}
            </p>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="h-10 px-4 rounded-full bg-foreground text-background text-sm font-medium inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> {tg("tours.add")}
          </button>
        </div>
        {languages.length === 0 && (
          <p className="mt-4 text-sm text-amber-700 bg-amber-500/10 rounded-xl p-3">
            {tg("tours.needLanguages")}
          </p>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-3xl bg-card p-6 ring-1 ring-border text-sm text-muted-foreground">{tg("tours.empty")}</div>
      ) : (
        <div className="space-y-3">
          {items.map((it) => (
            <div key={it.id} className="rounded-2xl bg-card p-5 ring-1 ring-border">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{it.title} {!it.published && <span className="text-[10px] uppercase text-muted-foreground ml-1">{tg("tours.draft")}</span>}</p>
                  <p className="text-xs text-muted-foreground">{Number(it.duration_hours)}{tg("common.hoursShort")} · {it.pricing_mode === "by_group" ? tg("tours.byGroup") : `$${it.price_from}`} {it.transport_included && `· ${tg("tours.transport")}`}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {it.pricing_mode === "by_group"
                      ? GROUP_KEYS.filter((k) => (it.group_prices[k] ?? 0) > 0).map((k) => (
                          <span key={k} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs bg-primary/10 text-primary ring-1 ring-primary/20">
                            <span className="font-medium">{tg(`group.${k}` as Parameters<typeof tg>[0])}</span>
                            <span className="tabular-nums">${it.group_prices[k]}</span>
                          </span>
                        ))
                      : it.languages.map((lng) => {
                          const mult = it.language_multipliers[lng];
                          const isBase = lng === it.base_language;
                          return (
                            <span key={lng} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs bg-primary/10 text-primary ring-1 ring-primary/20">
                              <span className="font-medium">{lng}</span>
                              <span className="tabular-nums">{isBase ? tg("tours.base") : (mult ? `+${mult}%` : "+0%")}</span>
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
                      if (!confirm(tg("tours.deleteConfirm", { title: it.title }))) return;
                      try { await deleteFn({ data: { id: it.id } }); toast.success(tg("common.deleted")); load(); }
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
          guideId={guideId}
          initial={editing}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSave={async (payload) => {
            try {
              await upsertFn({ data: payload });
              toast.success(tg("common.saved"));
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
  languages, cities, defaultCityId, guideId, initial, onClose, onSave,
}: {
  languages: string[];
  cities: Array<{ id: string; name: string; lat: number; lng: number }>;
  defaultCityId: string;
  guideId: string;
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
    meeting_point: string;
    end_point: string;
    meeting_lat: number | null;
    meeting_lng: number | null;
    end_lat: number | null;
    end_lng: number | null;
    end_same_as_meeting: boolean;
    published: boolean;
    sort_order: number;
    category_ids: string[];
  }) => void;
}) {
  const { tg } = useGuideI18n();
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
  const [meetingPoint, setMeetingPoint] = useState(initial?.meeting_point ?? "");
  const [endPoint, setEndPoint] = useState(initial?.end_point ?? "");
  const [meetingCoords, setMeetingCoords] = useState<{ lat: number; lng: number } | null>(
    initial?.meeting_lat != null && initial?.meeting_lng != null
      ? { lat: Number(initial.meeting_lat), lng: Number(initial.meeting_lng) }
      : null,
  );
  const [endCoords, setEndCoords] = useState<{ lat: number; lng: number } | null>(
    initial?.end_lat != null && initial?.end_lng != null
      ? { lat: Number(initial.end_lat), lng: Number(initial.end_lng) }
      : null,
  );
  const [endSameAsMeeting, setEndSameAsMeeting] = useState(initial?.end_same_as_meeting ?? false);
  const [published, setPublished] = useState(initial?.published ?? true);
  const [selectedCats, setSelectedCats] = useState<string[]>(initial?.category_ids ?? []);
  const [uploading, setUploading] = useState(false);
  const toggleCat = (id: string) => setSelectedCats((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);

  const toggleLang = (lng: string) => {
    setTourLangs((cur) => cur.includes(lng) ? cur.filter((x) => x !== lng) : [...cur, lng]);
  };

  const upload = async (file: File) => {
    if (!guideId) { toast.error("Guide profile not loaded"); return; }
    setUploading(true);
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `tours/${guideId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("guide-photos").upload(path, file, { upsert: true, contentType: file.type || undefined });
    setUploading(false);
    if (error) { toast.error(error.message); return; }
    const { data } = supabase.storage.from("guide-photos").getPublicUrl(path);
    setCoverUrl(data.publicUrl);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 overflow-y-auto" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl rounded-3xl bg-background p-6 ring-1 ring-border shadow-xl my-8">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">{initial ? tg("editor.editTitle") : tg("editor.newTitle")}</h3>
          <button onClick={onClose} className="h-9 w-9 grid place-items-center rounded-full hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-4 space-y-4">
          <label className="block text-sm">
            <span className="text-xs text-muted-foreground">{tg("editor.title")}</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={tg("editor.titlePh")} className="mt-1 w-full h-11 rounded-xl border border-input bg-background px-3 text-sm" />
          </label>
          <label className="block text-sm">
            <span className="text-xs text-muted-foreground">{tg("editor.shortDesc")}</span>
            <input value={shortDesc} onChange={(e) => setShortDesc(e.target.value)} placeholder={tg("editor.shortDescPh")} className="mt-1 w-full h-11 rounded-xl border border-input bg-background px-3 text-sm" />
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <label className="block text-sm">
              <span className="text-xs text-muted-foreground">{tg("editor.city")}</span>
              <select value={cityId} onChange={(e) => setCityId(e.target.value)} className="mt-1 w-full h-11 rounded-xl border border-input bg-background px-3 text-sm">
                {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-xs text-muted-foreground">{tg("editor.duration")}</span>
              <input type="number" min={0.5} step={0.5} value={durationHours} onChange={(e) => setDurationHours(Number(e.target.value) || 0)} className="mt-1 w-full h-11 rounded-xl border border-input bg-background px-3 text-sm" />
            </label>
            <label className="block text-sm">
              <span className="text-xs text-muted-foreground">{tg("editor.childrenFree")}</span>
              <input type="number" min={0} max={21} value={childrenFreeUnder} onChange={(e) => setChildrenFreeUnder(Number(e.target.value) || 0)} className="mt-1 w-full h-11 rounded-xl border border-input bg-background px-3 text-sm" />
            </label>
            <label className="block text-sm">
              <span className="text-xs text-muted-foreground">&nbsp;</span>
              <label className="mt-1 h-11 w-full inline-flex items-center gap-2 rounded-xl border border-input bg-background px-3 text-sm cursor-pointer">
                <input type="checkbox" checked={transportIncluded} onChange={(e) => setTransportIncluded(e.target.checked)} className="h-4 w-4" />
                {tg("editor.transportIncluded")}
              </label>
            </label>
          </div>

          {/* Pricing */}
          <div className="rounded-2xl border border-border bg-card/40 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">{tg("editor.pricing")}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <label className={`inline-flex items-center gap-2 rounded-full px-3 h-9 text-sm cursor-pointer ${pricingMode === "fixed" ? "bg-foreground text-background" : "bg-secondary"}`}>
                <input type="radio" name="pmode" className="hidden" checked={pricingMode === "fixed"} onChange={() => setPricingMode("fixed")} />
                {tg("editor.fixedPrice")}
              </label>
              <label className={`inline-flex items-center gap-2 rounded-full px-3 h-9 text-sm cursor-pointer ${pricingMode === "by_group" ? "bg-foreground text-background" : "bg-secondary"}`}>
                <input type="radio" name="pmode" className="hidden" checked={pricingMode === "by_group"} onChange={() => setPricingMode("by_group")} />
                {tg("editor.priceByGroup")}
              </label>
            </div>
            {pricingMode === "fixed" ? (
              <label className="block text-sm max-w-xs">
                <span className="text-xs text-muted-foreground">{tg("editor.priceBase")}</span>
                <input type="number" min={0} value={fixedPrice || ""} onChange={(e) => setFixedPrice(Number(e.target.value) || 0)} className="mt-1 w-full h-11 rounded-xl border border-input bg-background px-3 text-sm" />
              </label>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {GROUP_KEYS.map((k) => (
                  <div key={k} className="flex items-center gap-2 rounded-xl border border-input bg-background px-3 h-11 text-sm">
                    <span className="flex-1 font-medium">{tg(`group.${k}` as Parameters<typeof tg>[0])}</span>
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
                <p className="col-span-full text-xs text-muted-foreground">{tg("editor.skipGroup")}</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">{tg("editor.cover")}</p>
            <div className="flex items-center gap-3">
              {coverUrl ? (
                <img src={coverUrl} alt="" className="h-20 w-28 rounded-lg object-cover ring-1 ring-border" />
              ) : (
                <div className="h-20 w-28 rounded-lg bg-secondary" />
              )}
              <label className="inline-flex items-center gap-2 h-9 px-3 rounded-full bg-secondary text-sm cursor-pointer hover:bg-secondary/80">
                {uploading ? tg("common.uploading") : tg("common.upload")}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
              </label>
              {coverUrl && <button onClick={() => setCoverUrl("")} className="text-xs text-destructive">{tg("common.remove")}</button>}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium">{tg("editor.tourLanguages")}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {tg("editor.tourLanguagesText")}
            </p>
            {languages.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">{tg("editor.noProfileLanguages")}</p>
            ) : (
              <>
                <div className="mt-3 flex items-center gap-2 text-sm">
                  <span className="text-xs text-muted-foreground">{tg("editor.baseLanguage")}</span>
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
                          {isBase && <span className="text-[10px] uppercase text-muted-foreground">{tg("tours.base")}</span>}
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
              <span className="text-xs text-muted-foreground">{tg("editor.highlights")}</span>
              <textarea value={highlights} onChange={(e) => setHighlights(e.target.value)} rows={4} className="mt-1 w-full rounded-xl border border-input bg-background p-2 text-sm" />
            </label>
            <label className="block text-sm">
              <span className="text-xs text-muted-foreground">{tg("editor.included")}</span>
              <textarea value={included} onChange={(e) => setIncluded(e.target.value)} rows={4} className="mt-1 w-full rounded-xl border border-input bg-background p-2 text-sm" />
            </label>
            <label className="block text-sm">
              <span className="text-xs text-muted-foreground">{tg("editor.notIncluded")}</span>
              <textarea value={notIncluded} onChange={(e) => setNotIncluded(e.target.value)} rows={4} className="mt-1 w-full rounded-xl border border-input bg-background p-2 text-sm" />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="text-xs text-muted-foreground">{tg("editor.meetingPoint")}</span>
              <input
                value={meetingPoint}
                onChange={(e) => setMeetingPoint(e.target.value)}
                placeholder={tg("editor.meetingPointPh")}
                className="mt-1 w-full h-11 rounded-xl border border-input bg-background px-3 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="text-xs text-muted-foreground">{tg("editor.endPoint")}</span>
              <input
                value={endPoint}
                onChange={(e) => setEndPoint(e.target.value)}
                placeholder={tg("editor.endPointPh")}
                className="mt-1 w-full h-11 rounded-xl border border-input bg-background px-3 text-sm"
              />
            </label>
          </div>

          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={endSameAsMeeting}
              onChange={(e) => {
                const checked = e.target.checked;
                setEndSameAsMeeting(checked);
                if (checked) {
                  setEndPoint(meetingPoint);
                  setEndCoords(meetingCoords);
                }
              }}
              className="h-4 w-4"
            />
            <span>{tg("editor.endSameAsMeeting")}</span>
          </label>

          <div>
            <p className="text-sm font-medium">{tg("editor.mapTitle")}</p>
            <p className="text-xs text-muted-foreground mt-0.5 mb-2">{tg("editor.mapText")}</p>
            <Suspense fallback={<div className="h-64 w-full rounded-xl bg-muted animate-pulse" />}>
              <TourMapPicker
                center={(() => {
                  const c = cities.find((x) => x.id === cityId);
                  return c && Number.isFinite(c.lat) && Number.isFinite(c.lng)
                    ? { lat: c.lat, lng: c.lng }
                    : { lat: 41.3111, lng: 69.2797 };
                })()}
                meeting={meetingCoords}
                end={endSameAsMeeting ? meetingCoords : endCoords}
                endSameAsMeeting={endSameAsMeeting}
                onChange={({ meeting, end }) => {
                  setMeetingCoords(meeting);
                  if (endSameAsMeeting) {
                    setEndCoords(meeting);
                  } else {
                    setEndCoords(end);
                  }
                }}
                labels={{
                  pickMeeting: tg("editor.mapPickMeeting"),
                  pickEnd: tg("editor.mapPickEnd"),
                  meetingSet: tg("editor.mapMeetingEmpty"),
                  endSet: tg("editor.mapEndEmpty"),
                  clear: tg("editor.mapClear"),
                  hint: tg("editor.mapHint"),
                }}
              />
            </Suspense>
          </div>


          <div>
            <p className="text-sm font-medium">{tg("editor.categories")}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{tg("editor.categoriesText")}</p>
            {categories.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">{tg("editor.noCategories")}</p>
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
            <span>{tg("editor.published")}</span>
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="h-10 px-4 rounded-full bg-muted text-sm font-medium">{tg("common.cancel")}</button>
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
                meeting_point: meetingPoint.trim(),
                end_point: endSameAsMeeting ? meetingPoint.trim() : endPoint.trim(),
                meeting_lat: meetingCoords?.lat ?? null,
                meeting_lng: meetingCoords?.lng ?? null,
                end_lat: endSameAsMeeting ? (meetingCoords?.lat ?? null) : (endCoords?.lat ?? null),
                end_lng: endSameAsMeeting ? (meetingCoords?.lng ?? null) : (endCoords?.lng ?? null),
                end_same_as_meeting: endSameAsMeeting,
                published,
                sort_order: initial?.sort_order ?? 0,
                category_ids: selectedCats,
              });
            }}
            className="h-10 px-5 rounded-full bg-foreground text-background text-sm font-medium disabled:opacity-50"
          >{tg("common.save")}</button>
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
  const { tg } = useGuideI18n();
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
      toast.success(tg("common.saved"));
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
        <h2 className="font-display text-lg font-semibold">{tg("cities.title")}</h2>
        <p className="text-sm text-muted-foreground mt-1">{tg("cities.text")}</p>
      </div>
      {homeCity && (
        <div className="text-sm">
          <span className="text-muted-foreground">{tg("cities.homeCity")}</span>{" "}
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
        {saving ? tg("common.loading") : tg("cities.save")}
      </button>
    </div>
  );
}

type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | "N/A";

function LanguagesPanel({
  current,
  verified,
  onSaved,
}: {
  current: string[];
  verified: Record<string, string>;
  onSaved: () => void;
}) {
  const { tg } = useGuideI18n();
  const updateFn = useServerFn(updateMyLanguages);
  const [options, setOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [selected, setSelected] = useState<string[]>(current);
  const [saving, setSaving] = useState(false);
  const [testingLang, setTestingLang] = useState<string | null>(null);

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
      toast.success(tg("common.saved"));
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const levelBadge = (lv: string) => {
    if (lv === "C1" || lv === "C2") return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
    if (lv === "B1" || lv === "B2") return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
    return "bg-orange-500/15 text-orange-700 dark:text-orange-300";
  };

  return (
    <div className="rounded-3xl bg-card p-6 ring-1 ring-border space-y-4">
      <div>
        <h2 className="font-display text-lg font-semibold">{tg("languages.title")}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {tg("languages.text")}
        </p>
      </div>
      {options.length === 0 ? (
        <p className="text-sm text-muted-foreground">{tg("languages.empty")}</p>
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
        {saving ? tg("common.loading") : tg("languages.save")}
      </button>

      {selected.length > 0 && (
        <div className="pt-4 border-t border-border space-y-3">
          <div>
            <h3 className="font-display text-base font-semibold">{tg("languages.verification")}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {tg("languages.verificationText")}
            </p>
          </div>
          <div className="space-y-2">
            {selected.map((lang) => {
              const lv = verified[lang];
              const isTesting = testingLang === lang;
              return (
                <div key={lang} className="rounded-2xl border border-border/60 bg-background p-3 space-y-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{lang}</span>
                      {lv ? (
                        <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${levelBadge(lv)}`}>
                          ✓ {lv}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">{tg("languages.notVerified")}</span>
                      )}
                    </div>
                    <button
                      onClick={() => setTestingLang(isTesting ? null : lang)}
                      className="h-8 px-3 rounded-full bg-secondary text-xs font-medium hover:bg-secondary/80"
                    >
                      {isTesting ? tg("common.cancel") : lv ? tg("languages.retakeTest") : tg("languages.takeTest")}
                    </button>
                  </div>
                  {isTesting && (
                    <InlineLanguageTest
                      language={lang}
                      onDone={() => { setTestingLang(null); onSaved(); }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function InlineLanguageTest({
  language,
  onDone,
}: {
  language: string;
  onDone: () => void;
}) {
  const { tg } = useGuideI18n();
  const assess = useServerFn(assessLanguageTest);
  const record = useServerFn(recordMyLanguageTest);
  const [recording, setRecording] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ level: CefrLevel; feedback: string } | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number>(0);

  const prompt = tg("languageTest.prompt", { language });

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      recorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const b = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        setBlob(b);
        setRecording(false);
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      };
      mr.start();
      startedAtRef.current = Date.now();
      setElapsed(0);
      setBlob(null);
      setResult(null);
      timerRef.current = setInterval(() => {
        const s = Math.floor((Date.now() - startedAtRef.current) / 1000);
        setElapsed(s);
        if (s >= 60 && mr.state === "recording") mr.stop();
      }, 250);
      setRecording(true);
    } catch {
      toast.error(tg("languageTest.micDenied"));
    }
  };

  const stop = () => recorderRef.current?.state === "recording" && recorderRef.current.stop();

  const submit = async () => {
    if (!blob) return;
    if (elapsed < 5) { toast.error(tg("languageTest.tooShort")); return; }
    setBusy(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => {
          const s = (r.result as string) || "";
          resolve(s.split(",")[1] || "");
        };
        r.onerror = () => reject(new Error(tg("languageTest.readFail")));
        r.readAsDataURL(blob);
      });
      const r = await assess({
        data: {
          language,
          audio_base64: base64,
          mime_type: blob.type || "audio/webm",
          prompt_text: prompt,
        },
      });
      setResult({ level: r.level as CefrLevel, feedback: r.feedback });
      await record({ data: { language, level: r.level as CefrLevel } });
      if (["B1", "B2", "C1", "C2"].includes(r.level)) {
        toast.success(tg("languageTest.verified", { level: r.level }));
      } else {
        toast.info(tg("languageTest.tryAgain", { level: r.level }));
      }
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tg("languageTest.assessFail"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{prompt}</p>
      {!recording && !blob && (
        <button onClick={start} className="h-9 px-4 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
          {tg("languageTest.start")}
        </button>
      )}
      {recording && (
        <div className="flex items-center gap-3">
          <span className="inline-flex h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm">{tg("languageTest.recording", { seconds: elapsed })}</span>
          <button onClick={stop} className="ml-auto h-8 px-3 rounded-full bg-secondary text-xs font-medium">
            {tg("languageTest.stop")}
          </button>
        </div>
      )}
      {blob && !recording && !result && (
        <div className="flex flex-wrap gap-2">
          <button onClick={submit} disabled={busy} className="h-9 px-4 rounded-full bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50 inline-flex items-center gap-1.5">
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {busy ? tg("languageTest.checking") : tg("languageTest.submit")}
          </button>
          <button onClick={() => { setBlob(null); setElapsed(0); }} className="h-9 px-4 rounded-full bg-secondary text-xs font-medium">
            {tg("languageTest.rerecord")}
          </button>
        </div>
      )}
      {result && (
        <p className="text-xs text-muted-foreground">{result.feedback}</p>
      )}
    </div>
  );
}

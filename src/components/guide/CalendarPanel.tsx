import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Drawer } from "vaul";
import { toast } from "sonner";
import { Plus, Loader2, MapPin, Trash2, ChevronLeft, ChevronRight, Briefcase, Coffee, Ban, Bell, Link2, Unlink } from "lucide-react";
import {
  listMyCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from "@/lib/guide-calendar.functions";
import {
  getGoogleCalendarStatus,
  startGoogleOAuth,
  disconnectGoogleCalendar,
} from "@/lib/google-calendar.functions";
import { guideDateLocale, useGuideI18n } from "@/lib/guide-i18n";

type CalendarEvent = {
  id: string;
  guide_id: string;
  type: "booking" | "personal" | "block" | "reminder";
  title: string;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  location: string;
  notes: string;
  color: string;
  booking_id: string | null;
  source: string;
};

type View = "today" | "week";

const TYPE_META: Record<CalendarEvent["type"], { labelKey: Parameters<ReturnType<typeof useGuideI18n>["tg"]>[0]; icon: typeof Briefcase; bg: string; ring: string; chip: string }> = {
  booking:  { labelKey: "event.tour",      icon: Briefcase, bg: "bg-emerald-500/10", ring: "ring-emerald-500/30", chip: "bg-emerald-500" },
  personal: { labelKey: "event.personal",  icon: Coffee,    bg: "bg-sky-500/10",     ring: "ring-sky-500/30",     chip: "bg-sky-500" },
  block:    { labelKey: "event.busy",      icon: Ban,       bg: "bg-zinc-500/10",    ring: "ring-zinc-500/30",    chip: "bg-zinc-500" },
  reminder: { labelKey: "event.reminder",  icon: Bell,      bg: "bg-amber-500/10",   ring: "ring-amber-500/30",   chip: "bg-amber-500" },
};

function startOfDay(d: Date): Date { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function endOfDay(d: Date): Date   { const x = new Date(d); x.setHours(23,59,59,999); return x; }
function addDays(d: Date, n: number): Date { const x = new Date(d); x.setDate(x.getDate()+n); return x; }
function startOfWeek(d: Date): Date { const x = startOfDay(d); const day = (x.getDay()+6)%7; x.setDate(x.getDate()-day); return x; }
function isSameDay(a: Date, b: Date): boolean { return a.toDateString() === b.toDateString(); }
function fmtTime(iso: string, locale?: string): string { return new Date(iso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }); }
function fmtDayShort(d: Date, locale?: string): string { return d.toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" }); }

export function CalendarPanel() {
  const { lang, tg } = useGuideI18n();
  const locale = guideDateLocale(lang);
  const [view, setView] = useState<View>("today");
  const [anchorDate, setAnchorDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const list = useServerFn(listMyCalendarEvents);
  const create = useServerFn(createCalendarEvent);
  const update = useServerFn(updateCalendarEvent);
  const remove = useServerFn(deleteCalendarEvent);

  const { from, to } = useMemo(() => {
    if (view === "today") {
      return { from: startOfDay(anchorDate), to: endOfDay(anchorDate) };
    }
    const ws = startOfWeek(anchorDate);
    return { from: ws, to: endOfDay(addDays(ws, 6)) };
  }, [view, anchorDate]);

  const load = async () => {
    try {
      setLoading(true);
      const data = await list({ data: { from: from.toISOString(), to: to.toISOString() } });
      setEvents(data as CalendarEvent[]);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [from.getTime(), to.getTime()]);

  const move = (dir: -1 | 1) => {
    setAnchorDate((d) => addDays(d, view === "today" ? dir : 7 * dir));
  };

  const today = new Date();
  const headerLabel = view === "today"
    ? isSameDay(anchorDate, today) ? tg("calendar.today") : fmtDayShort(anchorDate, locale)
    : `${fmtDayShort(from, locale)} — ${fmtDayShort(to, locale)}`;

  return (
    <section className="space-y-4">
      <GoogleCalendarCard />


      {/* Controls */}
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex rounded-full bg-muted p-1 text-sm">
          <button
            className={`h-8 px-4 rounded-full font-medium transition ${view === "today" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
            onClick={() => setView("today")}
          >{tg("calendar.today")}</button>
          <button
            className={`h-8 px-4 rounded-full font-medium transition ${view === "week" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
            onClick={() => setView("week")}
          >{tg("calendar.week")}</button>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => move(-1)} className="h-9 w-9 grid place-items-center rounded-full hover:bg-muted">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setAnchorDate(new Date())}
            className="h-9 px-3 rounded-full text-sm font-medium hover:bg-muted"
          >{tg("calendar.today")}</button>
          <button onClick={() => move(1)} className="h-9 w-9 grid place-items-center rounded-full hover:bg-muted">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold">{headerLabel}</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-foreground text-background text-sm font-medium"
        >
          <Plus className="h-4 w-4" /> {tg("common.add")}
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-16 grid place-items-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : view === "today" ? (
        <TodayTimeline events={events} onEventClick={setEditing} />
      ) : (
        <WeekView from={from} events={events} onEventClick={setEditing} onDayClick={(d) => { setAnchorDate(d); setView("today"); }} />
      )}

      {/* Create sheet */}
      <EventSheet
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSave={async (payload) => {
          try {
            await create({ data: payload });
            toast.success(tg("calendar.added"));
            setShowCreate(false);
            await load();
          } catch (e) { toast.error((e as Error).message); }
        }}
        defaultDate={anchorDate}
      />

      {/* Edit sheet */}
      <EventSheet
        open={!!editing}
        event={editing ?? undefined}
        onClose={() => setEditing(null)}
        onSave={async (payload) => {
          if (!editing) return;
          try {
            await update({ data: {
              id: editing.id,
              title: payload.title,
              starts_at: payload.starts_at,
              ends_at: payload.ends_at,
              location: payload.location,
              notes: payload.notes,
              color: payload.color,
            } });
            toast.success(tg("calendar.updated"));
            setEditing(null);
            await load();
          } catch (e) { toast.error((e as Error).message); }
        }}
        onDelete={editing && editing.source !== "booking" ? async () => {
          if (!editing) return;
          try {
            await remove({ data: { id: editing.id } });
            toast.success(tg("calendar.removed"));
            setEditing(null);
            await load();
          } catch (e) { toast.error((e as Error).message); }
        } : undefined}
      />
    </section>
  );
}

function TodayTimeline({ events, onEventClick }: { events: CalendarEvent[]; onEventClick: (e: CalendarEvent) => void }) {
  const { lang, tg } = useGuideI18n();
  const locale = guideDateLocale(lang);
  if (events.length === 0) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        <p className="text-sm">{tg("calendar.freeDay")}</p>
        <p className="text-xs mt-2 opacity-70">{tg("calendar.tapAdd")}</p>
      </div>
    );
  }
  return (
    <ol className="space-y-2">
      {events.map((ev) => {
        const meta = TYPE_META[ev.type];
        const Icon = meta.icon;
        return (
          <li key={ev.id}>
            <button
              onClick={() => onEventClick(ev)}
              className={`w-full text-left rounded-2xl p-4 ring-1 ${meta.bg} ${meta.ring} transition active:scale-[0.99]`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 h-9 w-9 grid place-items-center rounded-full ${meta.chip} text-white shrink-0`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-semibold truncate">{ev.title}</p>
                    <p className="text-xs tabular-nums text-muted-foreground shrink-0">
                      {ev.all_day ? tg("calendar.allDay") : `${fmtTime(ev.starts_at, locale)} — ${fmtTime(ev.ends_at, locale)}`}
                    </p>
                  </div>
                  {ev.location ? (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {ev.location}
                    </p>
                  ) : null}
                  {ev.notes ? <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ev.notes}</p> : null}
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function WeekView({ from, events, onEventClick, onDayClick }: {
  from: Date; events: CalendarEvent[]; onEventClick: (e: CalendarEvent) => void; onDayClick: (d: Date) => void;
}) {
  const { lang, tg } = useGuideI18n();
  const locale = guideDateLocale(lang);
  const days = Array.from({ length: 7 }, (_, i) => addDays(from, i));
  const today = new Date();
  return (
    <div className="space-y-3">
      {days.map((d) => {
        const dayEvents = events.filter((e) => isSameDay(new Date(e.starts_at), d));
        const isToday = isSameDay(d, today);
        return (
          <div key={d.toISOString()} className="rounded-2xl bg-background ring-1 ring-border overflow-hidden">
            <button
              onClick={() => onDayClick(d)}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-left ${isToday ? "bg-primary/5" : ""}`}
            >
              <div>
                <p className={`text-sm font-semibold ${isToday ? "text-primary" : ""}`}>
                  {d.toLocaleDateString(locale, { weekday: "long" })}
                </p>
                <p className="text-xs text-muted-foreground">{d.toLocaleDateString(locale, { day: "numeric", month: "long" })}</p>
              </div>
              <span className="text-xs text-muted-foreground">
                {dayEvents.length === 0 ? tg("calendar.free") : tg("calendar.events", { n: dayEvents.length, plural: dayEvents.length > 1 ? "s" : "" })}
              </span>
            </button>
            {dayEvents.length > 0 ? (
              <ol className="border-t border-border divide-y divide-border">
                {dayEvents.map((ev) => {
                  const meta = TYPE_META[ev.type];
                  return (
                    <li key={ev.id}>
                      <button
                        onClick={() => onEventClick(ev)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/50"
                      >
                        <span className={`h-2 w-2 rounded-full ${meta.chip}`} />
                        <span className="text-xs tabular-nums text-muted-foreground w-10 shrink-0">
                          {ev.all_day ? tg("calendar.all") : fmtTime(ev.starts_at, locale)}
                        </span>
                        <span className="text-sm truncate flex-1">{ev.title}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fromLocalInput(v: string): string {
  return new Date(v).toISOString();
}

function EventSheet({ open, onClose, onSave, onDelete, defaultDate, event }: {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    title: string;
    type: "personal" | "block" | "reminder";
    starts_at: string;
    ends_at: string;
    all_day: boolean;
    location: string;
    notes: string;
    color: string;
  }) => Promise<void>;
  onDelete?: () => Promise<void>;
  defaultDate?: Date;
  event?: CalendarEvent;
}) {
  const isEdit = !!event;
  const isBooking = event?.source === "booking";

  const initialStart = event?.starts_at ?? (defaultDate ? (() => {
    const d = new Date(defaultDate); d.setHours(10, 0, 0, 0); return d.toISOString();
  })() : new Date().toISOString());
  const initialEnd = event?.ends_at ?? (defaultDate ? (() => {
    const d = new Date(defaultDate); d.setHours(12, 0, 0, 0); return d.toISOString();
  })() : new Date(Date.now() + 2*3600*1000).toISOString());

  const [title, setTitle] = useState(event?.title ?? "");
  const [type, setType] = useState<"personal" | "block" | "reminder">(
    event && event.type !== "booking" ? event.type : "personal"
  );
  const [startsAt, setStartsAt] = useState(toLocalInput(initialStart));
  const [endsAt, setEndsAt] = useState(toLocalInput(initialEnd));
  const [location, setLocation] = useState(event?.location ?? "");
  const [notes, setNotes] = useState(event?.notes ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(event?.title ?? "");
      setType(event && event.type !== "booking" ? event.type : "personal");
      setStartsAt(toLocalInput(event?.starts_at ?? initialStart));
      setEndsAt(toLocalInput(event?.ends_at ?? initialEnd));
      setLocation(event?.location ?? "");
      setNotes(event?.notes ?? "");
    }
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [open, event?.id]);

  const handleSave = async () => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        type,
        starts_at: fromLocalInput(startsAt),
        ends_at: fromLocalInput(endsAt),
        all_day: false,
        location: location.trim(),
        notes: notes.trim(),
        color: "primary",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-3xl max-h-[92vh] flex flex-col">
          <Drawer.Title className="sr-only">{isEdit ? "Edit event" : "New event"}</Drawer.Title>
          <Drawer.Description className="sr-only">
            {isBooking ? "Read-only tour booking" : "Create or edit a calendar event"}
          </Drawer.Description>
          <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-muted-foreground/30" />
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-display text-lg font-semibold">
              {isBooking ? "Tour booking" : isEdit ? "Edit event" : "New event"}
            </h3>
          </div>
          <div className="px-5 py-5 space-y-4 overflow-y-auto">
            {isBooking ? (
              <div className="text-sm text-muted-foreground rounded-xl bg-muted p-3">
                This event is linked to a confirmed booking. Manage it from the Bookings tab.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {(["personal", "block", "reminder"] as const).map((t) => {
                  const meta = TYPE_META[t];
                  const Icon = meta.icon;
                  return (
                    <button
                      key={t}
                      onClick={() => setType(t)}
                      className={`flex flex-col items-center gap-1 py-3 rounded-xl ring-1 transition ${type === t ? `${meta.bg} ${meta.ring} ring-2` : "bg-muted/40 ring-border"}`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-xs font-medium">{meta.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-muted-foreground">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isBooking}
                placeholder={type === "block" ? "Busy — vacation" : type === "reminder" ? "Confirm restaurant" : "Coffee with friend"}
                className="mt-1 w-full h-11 px-3 rounded-xl bg-muted border-0 text-sm focus:ring-2 focus:ring-primary/30 outline-none disabled:opacity-60"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Starts</label>
                <input
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  disabled={isBooking}
                  className="mt-1 w-full h-11 px-3 rounded-xl bg-muted border-0 text-sm outline-none disabled:opacity-60"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Ends</label>
                <input
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  disabled={isBooking}
                  className="mt-1 w-full h-11 px-3 rounded-xl bg-muted border-0 text-sm outline-none disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Location (optional)</label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                disabled={isBooking}
                placeholder="Address or place name"
                className="mt-1 w-full h-11 px-3 rounded-xl bg-muted border-0 text-sm outline-none disabled:opacity-60"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isBooking}
                rows={3}
                className="mt-1 w-full px-3 py-2 rounded-xl bg-muted border-0 text-sm outline-none disabled:opacity-60 resize-none"
              />
            </div>
          </div>

          <div className="px-5 py-4 border-t border-border flex items-center gap-2 sticky bottom-0 bg-background">
            {onDelete && !isBooking ? (
              <button
                onClick={async () => { await onDelete(); }}
                className="h-11 w-11 grid place-items-center rounded-full text-destructive hover:bg-destructive/10"
                aria-label="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            ) : null}
            <button
              onClick={onClose}
              className="flex-1 h-11 rounded-full bg-muted text-sm font-medium"
            >Cancel</button>
            {!isBooking ? (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 h-11 rounded-full bg-foreground text-background text-sm font-semibold disabled:opacity-60 inline-flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isEdit ? "Save" : "Create"}
              </button>
            ) : null}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function GoogleCalendarCard() {
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const getStatus = useServerFn(getGoogleCalendarStatus);
  const startOAuth = useServerFn(startGoogleOAuth);
  const disconnect = useServerFn(disconnectGoogleCalendar);

  const refresh = async () => {
    try {
      const s = await getStatus();
      setConnected(s.connected);
      setEmail(s.email);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // Show toast if returning from OAuth callback
    const params = new URLSearchParams(window.location.search);
    const gcal = params.get("gcal");
    if (gcal === "connected") toast.success("Google Calendar connected");
    if (gcal === "error") toast.error("Google Calendar connection failed");
    if (gcal) {
      params.delete("gcal");
      const newUrl = window.location.pathname + (params.toString() ? `?${params}` : "");
      window.history.replaceState({}, "", newUrl);
    }
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  const handleConnect = async () => {
    setBusy(true);
    try {
      const { url } = await startOAuth({ data: { origin: window.location.origin } });
      window.location.href = url;
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Disconnect Google Calendar? Existing events stay, but new changes won't sync.")) return;
    setBusy(true);
    try {
      await disconnect();
      toast.success("Disconnected");
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return null;

  return (
    <div className={`rounded-2xl p-4 ring-1 flex items-center gap-3 ${connected ? "bg-emerald-500/10 ring-emerald-500/30" : "bg-muted ring-border"}`}>
      <div className={`h-10 w-10 grid place-items-center rounded-full ${connected ? "bg-emerald-500 text-white" : "bg-foreground text-background"}`}>
        {connected ? <Link2 className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">Google Calendar</p>
        <p className="text-xs text-muted-foreground truncate">
          {connected ? `Synced${email ? ` · ${email}` : ""}` : "Connect to mirror events to your Google Calendar"}
        </p>
      </div>
      {connected ? (
        <button
          onClick={handleDisconnect}
          disabled={busy}
          className="h-9 px-3 rounded-full text-xs font-medium bg-background ring-1 ring-border inline-flex items-center gap-1.5 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unlink className="h-3.5 w-3.5" />}
          Disconnect
        </button>
      ) : (
        <button
          onClick={handleConnect}
          disabled={busy}
          className="h-9 px-3 rounded-full text-xs font-semibold bg-foreground text-background inline-flex items-center gap-1.5 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Connect
        </button>
      )}
    </div>
  );
}

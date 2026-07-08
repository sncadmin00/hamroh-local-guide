import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { MapPin, Calendar, Sparkles, ArrowRight, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { CityPicker } from "@/components/CityPicker";

type Prefs = { city?: string; startDate?: string; endDate?: string };

type UpcomingBooking = {
  id: string;
  experience: string;
  date: string;
  start_time: string | null;
  status: string;
};

function formatWhen(date: string, time: string | null) {
  try {
    const d = new Date(`${date}T${(time ?? "12:00").slice(0, 8)}`);
    const dateStr = d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
    const timeStr = time ? d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "";
    return timeStr ? `${dateStr} · ${timeStr}` : dateStr;
  } catch {
    return date;
  }
}

function daysUntil(date: string) {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const target = new Date(`${date}T00:00:00`);
  return Math.round((target.getTime() - now.getTime()) / 86400000);
}

export function PersonalCard() {
  const { t } = useI18n();
  const [name, setName] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [editing, setEditing] = useState<"city" | "trip" | null>(null);
  const [prefs, setPrefs] = useState<Prefs>(() => {
    try { return JSON.parse(localStorage.getItem("tripPrefs") || "{}"); } catch { return {}; }
  });
  const [aiTip, setAiTip] = useState<string | null>(null);
  const [upcoming, setUpcoming] = useState<UpcomingBooking[]>([]);
  const [upIdx, setUpIdx] = useState(0);

  useEffect(() => {
    const loadUpcoming = async (userId: string | undefined) => {
      if (!userId) { setUpcoming([]); return; }
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from("bookings")
        .select("id, experience, date, start_time, status")
        .eq("user_id", userId)
        .gte("date", today)
        .in("status", ["pending", "confirmed"])
        .order("date", { ascending: true })
        .limit(5);
      setUpcoming((data ?? []) as UpcomingBooking[]);
    };
    const applyUser = (user: { id?: string; user_metadata?: Record<string, unknown>; email?: string | null } | null | undefined) => {
      if (!user) { setSignedIn(false); setName(null); setUpcoming([]); return; }
      setSignedIn(true);
      const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
      const full = (meta.full_name as string) || (meta.name as string) || user.email || "";
      setName(full.split(" ")[0] || null);
      loadUpcoming(user.id);
    };
    supabase.auth.getSession().then(({ data }) => applyUser(data.session?.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => applyUser(s?.user));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Rotate upcoming bookings vertically every 4s
  useEffect(() => {
    if (upcoming.length < 2) return;
    const id = setInterval(() => setUpIdx((i) => (i + 1) % upcoming.length), 4000);
    return () => clearInterval(id);
  }, [upcoming.length]);

  const currentUp = useMemo(() => upcoming[upIdx % Math.max(upcoming.length, 1)], [upcoming, upIdx]);


  useEffect(() => {
    (async () => {
      if (!prefs.city) { setAiTip(null); return; }
      const { data } = await supabase
        .from("tours")
        .select("title_en")
        .eq("published", true)
        .limit(1);
      const tour = data?.[0];
      if (tour?.title_en) setAiTip(`For you today: ${tour.title_en} — spots filling fast.`);
    })();
  }, [prefs.city]);

  const updatePrefs = (next: Prefs) => {
    setPrefs(next);
    try { localStorage.setItem("tripPrefs", JSON.stringify(next)); } catch {}
  };

  const [greeting, setGreeting] = useState("Good day");

  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening");
  }, []);

  const tripLabel = prefs.startDate && prefs.endDate
    ? `${prefs.startDate} — ${prefs.endDate}`
    : "Add dates";

  return (
    <section className="max-w-[1280px] mx-auto px-4 md:px-8 pt-5">
      <div
        className="relative overflow-hidden rounded-3xl p-5 md:p-8"
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          boxShadow: "0 8px 32px color-mix(in srgb, var(--foreground) 6%, transparent)",
        }}
      >
        {/* Header row: greeting */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <p className="text-sm mb-1" style={{ color: "var(--muted-foreground)" }}>
              {greeting},
            </p>
            <h1
              className="text-[1.8rem] md:text-[2.4rem] leading-[1.05] tracking-tight flex items-center gap-2"
              style={{ color: "var(--foreground)", fontFamily: "'DM Serif Display', serif" }}
            >
              <span className="truncate">{signedIn && name ? name : t("home.hello") || "Traveler"}</span>
            </h1>
          </div>
        </div>

        {/* City row */}
        <div
          className="flex items-center gap-3 rounded-2xl p-3 mb-2"
          style={{ background: "var(--background)", border: "1px solid var(--border)" }}
        >
          <span className="text-lg shrink-0">📍</span>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
              You are in
            </p>
            {editing === "city" ? (
              <CityPicker
                value={prefs.city ?? "All"}
                onChange={(v) => { updatePrefs({ ...prefs, city: v === "All" ? undefined : v }); setEditing(null); }}
              />
            ) : (
              <p className="font-semibold text-sm truncate" style={{ color: "var(--foreground)" }}>
                {prefs.city || "Pick a city"}
              </p>
            )}
          </div>
          <button
            onClick={() => setEditing(editing === "city" ? null : "city")}
            className="text-xs font-semibold shrink-0"
            style={{ color: "#1F9BB4" }}
          >
            Change
          </button>
        </div>

        {/* Trip row */}
        <div
          className="flex items-center gap-3 rounded-2xl p-3 mb-3"
          style={{ background: "var(--background)", border: "1px solid var(--border)" }}
        >
          <Calendar className="h-5 w-5 shrink-0" style={{ color: "#C9A84C" }} />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
              Trip
            </p>
            {editing === "trip" ? (
              <div className="flex items-center gap-1 text-sm">
                <input
                  type="date"
                  value={prefs.startDate ?? ""}
                  onChange={(e) => updatePrefs({ ...prefs, startDate: e.target.value })}
                  className="bg-transparent outline-none"
                  style={{ color: "var(--foreground)" }}
                />
                <span style={{ color: "var(--muted-foreground)" }}>–</span>
                <input
                  type="date"
                  value={prefs.endDate ?? ""}
                  onChange={(e) => updatePrefs({ ...prefs, endDate: e.target.value })}
                  className="bg-transparent outline-none"
                  style={{ color: "var(--foreground)" }}
                />
              </div>
            ) : (
              <p className="font-semibold text-sm truncate" style={{ color: "var(--foreground)" }}>
                {tripLabel}
              </p>
            )}
          </div>
          <button
            onClick={() => setEditing(editing === "trip" ? null : "trip")}
            className="text-xs font-semibold shrink-0"
            style={{ color: "#1F9BB4" }}
          >
            Change
          </button>
        </div>

        {/* Proximity tip (static AI) */}
        {prefs.city && (
          <div
            className="flex items-center gap-3 rounded-2xl p-3 mb-2"
            style={{ background: "color-mix(in srgb, #C9A84C 10%, transparent)", border: "1px solid color-mix(in srgb, #C9A84C 22%, transparent)" }}
          >
            <span className="h-2 w-2 rounded-full shrink-0" style={{ background: "#C9A84C" }} />
            <p className="text-sm flex-1 min-w-0" style={{ color: "var(--foreground)" }}>
              <span className="font-semibold">Registan is 320m away</span>
              <span style={{ color: "var(--muted-foreground)" }}> — sunset in 28 min. Best photo moment!</span>
            </p>
            <ArrowRight className="h-4 w-4 shrink-0" style={{ color: "#C9A84C" }} />
          </div>
        )}

        {/* AI recommendation */}
        {aiTip && (
          <div className="flex items-start gap-3 rounded-2xl p-3">
            <div
              className="h-8 w-8 rounded-full flex items-center justify-center shrink-0"
              style={{ background: "#C9A84C" }}
            >
              <Sparkles className="h-4 w-4" style={{ color: "#fff" }} />
            </div>
            <p className="text-sm flex-1 min-w-0" style={{ color: "var(--muted-foreground)" }}>
              {aiTip}
            </p>
          </div>
        )}

        {!signedIn && (
          <Link
            to="/login"
            className="mt-3 inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all hover:-translate-y-0.5"
            style={{ background: "#1F9BB4", color: "#fff" }}
          >
            {t("nav.signIn") || "Sign in"} →
          </Link>
        )}
      </div>
    </section>
  );
}

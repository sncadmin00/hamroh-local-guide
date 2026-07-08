import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Clock, ArrowRight, CheckCircle2, Hourglass } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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

export function UpcomingBookingsCard() {
  const [upcoming, setUpcoming] = useState<UpcomingBooking[]>([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const load = async (userId?: string) => {
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
    supabase.auth.getSession().then(({ data }) => load(data.session?.user.id));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => load(s?.user.id));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (upcoming.length < 2) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % upcoming.length), 4000);
    return () => clearInterval(id);
  }, [upcoming.length]);

  if (upcoming.length === 0) return null;

  const ROW = 52;
  return (
    <Link
      to="/my-bookings"
      className="block rounded-3xl p-4 transition-transform hover:-translate-y-0.5"
      style={{
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.10)",
        backdropFilter: "blur(20px)",
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
          style={{ background: "color-mix(in srgb, #1F9BB4 25%, transparent)", color: "#1F9BB4" }}
        >
          <Clock className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0 overflow-hidden" style={{ height: ROW }}>
          <div
            className="transition-transform duration-500 ease-out"
            style={{ transform: `translateY(-${idx * ROW}px)` }}
          >
            {upcoming.map((b) => {
              const d = daysUntil(b.date);
              const when = d === 0 ? "Today" : d === 1 ? "Tomorrow" : `in ${d} days`;
              const isConfirmed = b.status === "confirmed";
              return (
                <div key={b.id} className="flex flex-col justify-center" style={{ height: ROW }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1" style={{ color: isConfirmed ? "#1F9BB4" : "var(--muted-foreground)" }}>
                    {isConfirmed ? (
                      <><CheckCircle2 className="h-3 w-3" /> Confirmed · {when}</>
                    ) : (
                      <><Hourglass className="h-3 w-3" /> Pending · {when}</>
                    )}
                  </p>
                  <p className="text-sm font-semibold truncate" style={{ color: "var(--foreground)" }}>
                    <span className="truncate">{b.experience}</span>
                  </p>
                  <p className="text-[11px] truncate" style={{ color: "var(--muted-foreground)" }}>
                    {formatWhen(b.date, b.start_time)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0" style={{ color: "#1F9BB4" }} />
      </div>
      {upcoming.length > 1 && (
        <div className="flex justify-center gap-1 mt-2">
          {upcoming.map((_, i) => (
            <span
              key={i}
              className="h-1 rounded-full transition-all"
              style={{
                width: i === idx ? 14 : 4,
                background: i === idx ? "#1F9BB4" : "rgba(255,255,255,0.2)",
              }}
            />
          ))}
        </div>
      )}
    </Link>
  );
}

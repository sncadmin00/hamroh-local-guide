import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { sendTelegramMessage } from "@/lib/telegram-notifications.server";

const TZ_OFFSET_HOURS = 5; // Asia/Tashkent (UTC+5, no DST)

function tashkentDayRange(now = new Date()) {
  // Convert now to Tashkent time, take Y-M-D, build start/end ISO in UTC
  const utc = now.getTime();
  const tashkent = new Date(utc + TZ_OFFSET_HOURS * 3600_000);
  const y = tashkent.getUTCFullYear();
  const m = tashkent.getUTCMonth();
  const d = tashkent.getUTCDate();
  const startUtcMs = Date.UTC(y, m, d, 0, 0, 0) - TZ_OFFSET_HOURS * 3600_000;
  const endUtcMs = startUtcMs + 24 * 3600_000;
  return {
    startIso: new Date(startUtcMs).toISOString(),
    endIso: new Date(endUtcMs).toISOString(),
    date: `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
  };
}

function formatEventLine(ev: {
  starts_at: string;
  title: string;
  type: string;
  location?: string | null;
}) {
  const t = new Date(ev.starts_at);
  const tashkent = new Date(t.getTime() + TZ_OFFSET_HOURS * 3600_000);
  const hh = String(tashkent.getUTCHours()).padStart(2, "0");
  const mm = String(tashkent.getUTCMinutes()).padStart(2, "0");
  const icon =
    ev.type === "booking" ? "🟢" : ev.type === "block" ? "⛔" : ev.type === "reminder" ? "🔔" : "📌";
  const loc = ev.location ? ` · ${ev.location}` : "";
  return `${icon} <b>${hh}:${mm}</b> — ${escapeHtml(ev.title)}${escapeHtml(loc)}`;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
}

export const Route = createFileRoute("/api/public/hooks/daily-brief")({
  server: {
    handlers: {
      POST: async () => {
        const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL!;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        if (!url || !serviceKey) {
          return new Response(JSON.stringify({ error: "Backend not configured" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        const admin = createClient(url, serviceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        const { startIso, endIso, date } = tashkentDayRange();

        // Get all guides with linked telegram accounts
        const { data: guides, error: guidesError } = await admin
          .from("guides")
          .select("id, name, user_id")
          .not("user_id", "is", null);

        if (guidesError) {
          return new Response(JSON.stringify({ error: guidesError.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        let sent = 0;
        let skipped = 0;

        for (const guide of guides ?? []) {
          // Get telegram chat
          const { data: tg } = await admin
            .from("telegram_accounts")
            .select("telegram_chat_id")
            .eq("user_id", guide.user_id!)
            .maybeSingle();

          if (!tg?.telegram_chat_id) {
            skipped++;
            continue;
          }

          // Today's events
          const { data: events } = await admin
            .from("calendar_events")
            .select("starts_at, title, type, location")
            .eq("guide_id", guide.id)
            .gte("starts_at", startIso)
            .lt("starts_at", endIso)
            .order("starts_at", { ascending: true });

          const lines: string[] = [];
          lines.push(`☀️ <b>Доброе утро, ${escapeHtml(guide.name)}!</b>`);
          lines.push(`<i>Твой день — ${date}</i>`);
          lines.push("");

          if (!events || events.length === 0) {
            lines.push("На сегодня в календаре пусто. Свободный день 🌿");
          } else {
            const bookings = events.filter((e) => e.type === "booking").length;
            if (bookings > 0) {
              lines.push(`<b>Туров сегодня: ${bookings}</b>`);
              lines.push("");
            }
            for (const ev of events) lines.push(formatEventLine(ev));
          }

          lines.push("");
          lines.push("Открой портал гида, чтобы спросить ассистента или изменить план.");

          const ok = await sendTelegramMessage(tg.telegram_chat_id, lines.join("\n"));
          if (ok) sent++;
        }

        return new Response(
          JSON.stringify({ success: true, sent, skipped, total: guides?.length ?? 0, date }),
          { headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});

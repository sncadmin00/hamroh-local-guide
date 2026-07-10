/**
 * Public hook: Guide AI assistant (non-streaming, mobile-friendly).
 *
 * Auth: Authorization: Bearer <supabase user JWT> — must belong to a guide.
 * Method: POST
 *
 * Request body:
 * {
 *   "message": "string (user text, required)",
 *   "history": [{ "role": "user"|"assistant", "content": "string" }] // optional, prior turns
 * }
 *
 * Response:
 * {
 *   "reply": "string (assistant final text)",
 *   "actions": [                       // tool calls executed (may be empty)
 *     { "tool": "createEvent"|"blockTime"|"deleteEvent"|"getSchedule"|"getIncome",
 *       "input": {...}, "output": {...}, "ok": boolean }
 *   ],
 *   "history": [ ...updated conversation, ready to send back next turn ]
 * }
 *
 * Notes for mobile:
 * - No streaming. One request → one JSON reply. Simple to render.
 * - History is NOT persisted on the server. Send back the returned `history`
 *   array on the next turn to keep context. Trim client-side (~20 last turns).
 * - AI executes actions immediately (no confirmation step). Show the `actions`
 *   list under the reply as chips/cards ("Created event: Meeting 15:00" etc.).
 * - Tools available: getSchedule, createEvent, blockTime, deleteEvent, getIncome.
 *   Guide-side booking edits still go through dedicated hooks — AI only manages
 *   the personal calendar (events/blocks/reminders) and reads stats.
 */
import { createFileRoute } from "@tanstack/react-router";
import { generateText, stepCountIs, tool } from "ai";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    "Access-Control-Max-Age": "86400",
  };
}

type ChatTurn = { role: "user" | "assistant"; content: string };
type Action = { tool: string; input: unknown; output: unknown; ok: boolean };

const NUMERIC_TIMEZONE_RE = /[+-]\d{2}:?\d{2}$/;

function normalizeTashkentDateTime(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;

  // Model tool calls often use "Z" while still meaning the guide's local
  // wall-clock time (e.g. 10:00 in Tashkent). Treat naive timestamps and "Z"
  // timestamps as Asia/Tashkent clock time; preserve explicit numeric offsets
  // such as +05:00 or +03:00.
  if (NUMERIC_TIMEZONE_RE.test(trimmed)) return trimmed;

  const withoutUtcSuffix = trimmed.replace(/Z$/i, "");
  const dateTime = withoutUtcSuffix.includes("T") ? withoutUtcSuffix : withoutUtcSuffix.replace(" ", "T");
  return `${dateTime}+05:00`;
}

export const Route = createFileRoute("/api/public/hooks/guide-ai")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders() }),

      POST: async ({ request }) => {
        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.toLowerCase().startsWith("bearer ")
          ? authHeader.slice(7).trim()
          : "";
        if (!token) {
          return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders() });
        }

        const supabaseUrl = process.env.SUPABASE_URL!;
        const supabasePk = process.env.SUPABASE_PUBLISHABLE_KEY!;
        const userClient = createClient(supabaseUrl, supabasePk, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: userRes, error: userErr } = await userClient.auth.getUser();
        if (userErr || !userRes.user) {
          return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders() });
        }
        const userId = userRes.user.id;

        const { data: guide } = await userClient
          .from("guides").select("id, name").eq("user_id", userId).maybeSingle();
        if (!guide) {
          return Response.json({ error: "Guide profile required" }, { status: 403, headers: corsHeaders() });
        }
        const guideId = guide.id;

        let body: { message?: string; history?: ChatTurn[] };
        try {
          body = (await request.json()) as { message?: string; history?: ChatTurn[] };
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400, headers: corsHeaders() });
        }
        const message = (body.message ?? "").trim();
        if (!message) {
          return Response.json({ error: "Missing message" }, { status: 400, headers: corsHeaders() });
        }
        const history = Array.isArray(body.history) ? body.history.slice(-40) : [];

        const key = process.env.LOVABLE_API_KEY;
        if (!key) {
          return Response.json({ error: "AI not configured" }, { status: 500, headers: corsHeaders() });
        }

        const actions: Action[] = [];
        const record = (name: string, input: unknown, output: unknown) => {
          const ok = !(output && typeof output === "object" && "error" in (output as Record<string, unknown>));
          actions.push({ tool: name, input, output, ok });
        };

        // Shared conflict scan across bookings, time blocks and calendar events.
        async function findConflicts(startsAt: string, endsAt: string) {
          const startISO = new Date(startsAt).toISOString();
          const endISO = new Date(endsAt).toISOString();
          const dayFrom = startISO.slice(0, 10);
          const dayTo = endISO.slice(0, 10);

          const [bookingsRes, blocksRes, eventsRes] = await Promise.all([
            userClient
              .from("bookings")
              .select("id, date, start_time, duration_minutes, status, customer_name, experience")
              .eq("guide_id", guideId)
              .in("status", ["pending", "confirmed"])
              .gte("date", dayFrom)
              .lte("date", dayTo),
            userClient
              .from("guide_time_blocks")
              .select("id, starts_at, ends_at, reason")
              .eq("guide_id", guideId)
              .lt("starts_at", endISO)
              .gt("ends_at", startISO),
            userClient
              .from("calendar_events")
              .select("id, type, title, starts_at, ends_at, source")
              .eq("guide_id", guideId)
              .lt("starts_at", endISO)
              .gt("ends_at", startISO),
          ]);

          const s = new Date(startISO).getTime();
          const e = new Date(endISO).getTime();
          const bookings = (bookingsRes.data ?? [])
            .map((b) => {
              if (!b.start_time) return null;
              const bs = new Date(`${b.date}T${b.start_time}+05:00`).getTime();
              const be = bs + (b.duration_minutes ?? 120) * 60_000;
              if (bs < e && be > s) {
                return {
                  id: b.id,
                  customer_name: b.customer_name,
                  experience: b.experience,
                  status: b.status,
                  starts_at: new Date(bs).toISOString(),
                  ends_at: new Date(be).toISOString(),
                };
              }
              return null;
            })
            .filter(Boolean);

          return {
            bookings,
            time_blocks: blocksRes.data ?? [],
            calendar_events: eventsRes.data ?? [],
            has_conflict:
              bookings.length > 0 ||
              (blocksRes.data ?? []).length > 0 ||
              (eventsRes.data ?? []).length > 0,
          };
        }

        const tools = {
          getSchedule: tool({
            description: "Get the guide's schedule (calendar events + bookings) for a date range.",
            inputSchema: z.object({ from: z.string(), to: z.string() }),
            execute: async ({ from, to }) => {
              const fromAt = normalizeTashkentDateTime(from);
              const toAt = normalizeTashkentDateTime(to);
              const { data, error } = await userClient
                .from("calendar_events")
                .select("id, type, title, starts_at, ends_at, location, notes, source")
                .eq("guide_id", guideId)
                .gte("starts_at", fromAt).lte("starts_at", toAt)
                .order("starts_at", { ascending: true });
              const out = error ? { error: error.message } : { events: data ?? [] };
              record("getSchedule", { from, to }, out);
              return out;
            },
          }),
          checkConflicts: tool({
            description:
              "Check whether a time interval overlaps any booking, existing time block, or calendar event. ALWAYS call this before createEvent or blockTime.",
            inputSchema: z.object({ starts_at: z.string(), ends_at: z.string() }),
            execute: async ({ starts_at, ends_at }) => {
              const startsAt = normalizeTashkentDateTime(starts_at);
              const endsAt = normalizeTashkentDateTime(ends_at);
              const out = await findConflicts(startsAt, endsAt);
              record("checkConflicts", { starts_at, ends_at }, out);
              return out;
            },
          }),
          createEvent: tool({
            description:
              "Create a personal event/reminder/block in the guide's calendar. Requires confirm:true when the interval has conflicts — otherwise returns { conflict } without inserting.",
            inputSchema: z.object({
              title: z.string().min(1).max(200),
              type: z.enum(["personal", "block", "reminder"]),
              starts_at: z.string(),
              ends_at: z.string(),
              location: z.string().max(200).optional(),
              notes: z.string().max(2000).optional(),
              confirm: z.boolean().optional(),
            }),
            execute: async (input) => {
              const startsAt = normalizeTashkentDateTime(input.starts_at);
              const endsAt = normalizeTashkentDateTime(input.ends_at);
              if (!input.confirm) {
                const conflicts = await findConflicts(startsAt, endsAt);
                if (conflicts.has_conflict) {
                  const out = { conflict: conflicts, hint: "Ask the guide to confirm; call again with confirm:true to override." };
                  record("createEvent", input, out);
                  return out;
                }
              }
              const { data, error } = await userClient.from("calendar_events").insert({
                guide_id: guideId,
                type: input.type,
                title: input.title,
                starts_at: startsAt,
                ends_at: endsAt,
                location: input.location ?? "",
                notes: input.notes ?? "",
                color: input.type === "block" ? "destructive" : "primary",
                source: "ai",
              }).select("id, title, starts_at, ends_at, type").single();
              const out = error ? { error: error.message } : { ok: true, event: data };
              record("createEvent", input, out);
              return out;
            },
          }),
          blockTime: tool({
            description:
              "Block a time slot so clients cannot book it. Writes to guide_time_blocks and mirrors to calendar_events. Requires confirm:true when the interval has conflicts — otherwise returns { conflict } without inserting.",
            inputSchema: z.object({
              starts_at: z.string(), ends_at: z.string(),
              reason: z.string().max(200).optional(),
              confirm: z.boolean().optional(),
            }),
            execute: async ({ starts_at, ends_at, reason, confirm }) => {
              const startsAt = normalizeTashkentDateTime(starts_at);
              const endsAt = normalizeTashkentDateTime(ends_at);
              if (!confirm) {
                const conflicts = await findConflicts(startsAt, endsAt);
                if (conflicts.has_conflict) {
                  const out = { conflict: conflicts, hint: "Ask the guide to confirm; call again with confirm:true to override." };
                  record("blockTime", { starts_at, ends_at, reason }, out);
                  return out;
                }
              }
              // 1) Real block — this is what the booking-conflict trigger reads.
              const { data: block, error: blockErr } = await userClient
                .from("guide_time_blocks")
                .insert({
                  guide_id: guideId,
                  starts_at: startsAt,
                  ends_at: endsAt,
                  reason: reason ?? null,
                  source: "ai",
                  created_by: userId,
                })
                .select("id")
                .single();
              if (blockErr) {
                const out = { error: blockErr.message };
                record("blockTime", { starts_at, ends_at, reason }, out);
                return out;
              }
              // 2) Mirror to calendar_events for the guide's calendar UI (best-effort).
              let eventId: string | null = null;
              const { data: ev } = await userClient
                .from("calendar_events")
                .insert({
                  guide_id: guideId,
                  type: "block",
                  title: reason ?? "Blocked",
                  starts_at: startsAt,
                  ends_at: endsAt,
                  color: "destructive",
                  source: "ai",
                })
                .select("id")
                .single();
              if (ev) eventId = ev.id;
              const out = { ok: true, block_id: block.id, event_id: eventId };
              record("blockTime", { starts_at, ends_at, reason }, out);
              return out;
            },
          }),

          deleteEvent: tool({
            description: "Delete a manual calendar event by id (never a booking).",
            inputSchema: z.object({ id: z.string().uuid() }),
            execute: async ({ id }) => {
              const { data: existing } = await userClient
                .from("calendar_events").select("source")
                .eq("id", id).eq("guide_id", guideId).maybeSingle();
              if (!existing) {
                const out = { error: "Event not found" };
                record("deleteEvent", { id }, out); return out;
              }
              if (existing.source === "booking") {
                const out = { error: "Cannot delete booking event" };
                record("deleteEvent", { id }, out); return out;
              }
              const { error } = await userClient
                .from("calendar_events").delete()
                .eq("id", id).eq("guide_id", guideId);
              const out = error ? { error: error.message } : { ok: true };
              record("deleteEvent", { id }, out);
              return out;
            },
          }),
          getIncome: tool({
            description: "Sum of confirmed/completed bookings over a period, in USD.",
            inputSchema: z.object({ from: z.string(), to: z.string() }),
            execute: async ({ from, to }) => {
              const { data, error } = await userClient
                .from("bookings").select("total, status, date")
                .eq("guide_id", guideId)
                .gte("date", from.slice(0, 10)).lte("date", to.slice(0, 10))
                .in("status", ["confirmed", "completed"]);
              if (error) { const out = { error: error.message }; record("getIncome", { from, to }, out); return out; }
              const total = (data ?? []).reduce((s, b) => s + Number(b.total ?? 0), 0);
              const out = { count: data?.length ?? 0, total_usd: total };
              record("getIncome", { from, to }, out);
              return out;
            },
          }),
        };

        const now = new Date();
        const system = `You are Hamroh AI Assistant for tour guide ${guide.name} in Uzbekistan.
You help manage the personal calendar: schedule, reminders, blocking time, checking income.

Current date/time: ${now.toISOString()} (timezone hint: Asia/Tashkent, UTC+5).

Rules:
- Always use tools to read/modify the calendar — never invent events.
- Reply in the SAME language as the guide (Russian, Uzbek, or English).
- Be concise and practical. Light markdown OK.
- Times sent to tools must be ISO 8601 with +05:00 for Tashkent local time. Never use Z for Tashkent wall-clock time.
- Booking edits (dates, prices, tours) are NOT in your toolset — tell the guide to use the app.
- BEFORE calling createEvent or blockTime, ALWAYS call checkConflicts (or getSchedule) for the target interval.
- If checkConflicts / a create call returns { conflict }: DO NOT insert. Summarize the conflicts to the guide (booking with client name, existing block, other event) and ask for explicit confirmation. Only after the guide confirms, call the same tool again with confirm:true.
- If the guide's request is clearly free of conflicts, you may proceed directly.`;


        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway("google/gemini-3-flash-preview");

        try {
          const result = await generateText({
            model,
            system,
            messages: [
              ...history.map((h) => ({ role: h.role, content: h.content })),
              { role: "user" as const, content: message },
            ],
            tools,
            stopWhen: stepCountIs(20),
          });

          const reply = result.text?.trim() ?? "";
          const nextHistory: ChatTurn[] = [
            ...history,
            { role: "user" as const, content: message },
            { role: "assistant" as const, content: reply },
          ].slice(-40);

          return Response.json(
            { reply, actions, history: nextHistory },
            { headers: corsHeaders() },
          );
        } catch (e) {
          const msg = e instanceof Error ? e.message : "AI error";
          return Response.json({ error: msg }, { status: 500, headers: corsHeaders() });
        }
      },
    },
  },
});

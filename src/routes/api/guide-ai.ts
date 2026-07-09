import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, stepCountIs, tool, type UIMessage } from "ai";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

type ChatBody = { messages?: UIMessage[] };

const NUMERIC_TIMEZONE_RE = /[+-]\d{2}:?\d{2}$/;

function normalizeTashkentDateTime(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;

  // AI tool calls may emit "Z" while meaning the guide's local wall-clock
  // time. Treat naive timestamps and Z timestamps as Asia/Tashkent time;
  // preserve explicit numeric offsets.
  if (NUMERIC_TIMEZONE_RE.test(trimmed)) return trimmed;

  const withoutUtcSuffix = trimmed.replace(/Z$/i, "");
  const dateTime = withoutUtcSuffix.includes("T") ? withoutUtcSuffix : withoutUtcSuffix.replace(" ", "T");
  return `${dateTime}+05:00`;
}

export const Route = createFileRoute("/api/guide-ai")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization");
        const token = auth?.replace(/^Bearer\s+/i, "");
        if (!token) return new Response("Unauthorized", { status: 401 });

        const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL!;
        const supabasePublishable = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
        const userClient = createClient(supabaseUrl, supabasePublishable, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: userRes, error: userErr } = await userClient.auth.getUser();
        if (userErr || !userRes.user) return new Response("Unauthorized", { status: 401 });
        const userId = userRes.user.id;

        // Find the guide profile
        const { data: guide } = await userClient
          .from("guides")
          .select("id, name")
          .eq("user_id", userId)
          .maybeSingle();
        if (!guide) return new Response("Guide profile required", { status: 403 });
        const guideId = guide.id;

        const body = (await request.json()) as ChatBody;
        if (!Array.isArray(body.messages)) {
          return new Response("Bad request", { status: 400 });
        }

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("AI not configured", { status: 500 });

        // Tools
        const getSchedule = tool({
          description: "Get the guide's schedule (calendar events + bookings) for a date range.",
          inputSchema: z.object({
            from: z.string().describe("ISO datetime, start of range"),
            to: z.string().describe("ISO datetime, end of range"),
          }),
          execute: async ({ from, to }) => {
            const fromAt = normalizeTashkentDateTime(from);
            const toAt = normalizeTashkentDateTime(to);
            const { data, error } = await userClient
              .from("calendar_events")
              .select("id, type, title, starts_at, ends_at, location, notes, color, source")
              .eq("guide_id", guideId)
              .gte("starts_at", fromAt)
              .lte("starts_at", toAt)
              .order("starts_at", { ascending: true });
            if (error) return { error: error.message };
            return { events: data ?? [] };
          },
        });

        const createEvent = tool({
          description: "Create a personal event or reminder in the guide's calendar. Use type='reminder' for short tasks, 'personal' for meetings, 'block' to block off time.",
          inputSchema: z.object({
            title: z.string().min(1).max(200),
            type: z.enum(["personal", "block", "reminder"]),
            starts_at: z.string().describe("ISO datetime"),
            ends_at: z.string().describe("ISO datetime"),
            location: z.string().max(200).optional(),
            notes: z.string().max(2000).optional(),
          }),
          execute: async (input) => {
            const startsAt = normalizeTashkentDateTime(input.starts_at);
            const endsAt = normalizeTashkentDateTime(input.ends_at);
            const { data, error } = await userClient
              .from("calendar_events")
              .insert({
                guide_id: guideId,
                type: input.type,
                title: input.title,
                starts_at: startsAt,
                ends_at: endsAt,
                location: input.location ?? "",
                notes: input.notes ?? "",
                color: input.type === "block" ? "destructive" : "primary",
                source: "ai",
              })
              .select("id, title, starts_at, ends_at, type")
              .single();
            if (error) return { error: error.message };
            return { ok: true, event: data };
          },
        });

        const blockTime = tool({
          description: "Block a time slot so no booking can be made (e.g. day off, family time).",
          inputSchema: z.object({
            starts_at: z.string(),
            ends_at: z.string(),
            reason: z.string().max(200).optional(),
          }),
          execute: async ({ starts_at, ends_at, reason }) => {
            const startsAt = normalizeTashkentDateTime(starts_at);
            const endsAt = normalizeTashkentDateTime(ends_at);
            const { data, error } = await userClient
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
            if (error) return { error: error.message };
            return { ok: true, id: data.id };
          },
        });

        const deleteEvent = tool({
          description: "Delete a manual calendar event by id (only personal/block/reminder, not bookings).",
          inputSchema: z.object({ id: z.string().uuid() }),
          execute: async ({ id }) => {
            const { data: existing } = await userClient
              .from("calendar_events")
              .select("source")
              .eq("id", id)
              .eq("guide_id", guideId)
              .maybeSingle();
            if (!existing) return { error: "Event not found" };
            if (existing.source === "booking") return { error: "Cannot delete booking event" };
            const { error } = await userClient
              .from("calendar_events")
              .delete()
              .eq("id", id)
              .eq("guide_id", guideId);
            if (error) return { error: error.message };
            return { ok: true };
          },
        });

        const getIncome = tool({
          description: "Get income statistics for the guide over a period (sum of confirmed/completed bookings).",
          inputSchema: z.object({
            from: z.string().describe("ISO date"),
            to: z.string().describe("ISO date"),
          }),
          execute: async ({ from, to }) => {
            const { data, error } = await userClient
              .from("bookings")
              .select("total, status, date")
              .eq("guide_id", guideId)
              .gte("date", from.slice(0, 10))
              .lte("date", to.slice(0, 10))
              .in("status", ["confirmed", "completed"]);
            if (error) return { error: error.message };
            const total = (data ?? []).reduce((s, b) => s + Number(b.total ?? 0), 0);
            return { count: data?.length ?? 0, total_usd: total };
          },
        });

        const now = new Date();
        const tz = "Asia/Tashkent";
        const system = `You are Hamroh AI Assistant, a personal helper for tour guide ${guide.name} in Uzbekistan.

You help the guide manage their daily life: schedule, reminders, blocking time, checking income, and planning their day.

Current date/time: ${now.toISOString()} (timezone hint: ${tz}).

When the guide asks to add something to the calendar, use the createEvent tool. When they ask "what's on today/this week", use getSchedule first, then summarise warmly. When they ask "how much did I earn", use getIncome.

Rules:
- Always use tools to read or modify the calendar — never invent events.
- Confirm destructive actions (delete, block) in your reply.
- Reply in the SAME language as the guide (Russian, Uzbek, or English).
- Be concise, warm, and practical. Use light markdown.
- Times you send to tools must be ISO 8601 with +05:00 for Tashkent local time. Never use Z for Tashkent wall-clock time.`;

        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway("google/gemini-3-flash-preview");

        const result = streamText({
          model,
          system,
          messages: await convertToModelMessages(body.messages),
          tools: { getSchedule, createEvent, blockTime, deleteEvent, getIncome },
          stopWhen: stepCountIs(50),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: body.messages,
        });
      },
    },
  },
});

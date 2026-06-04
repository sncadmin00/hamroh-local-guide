import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  pushEventToGoogle,
  updateEventOnGoogle,
  deleteEventOnGoogle,
} from "@/lib/google-calendar.server";

const EventTypeSchema = z.enum(["personal", "block", "reminder"]);

const CreateEventSchema = z.object({
  title: z.string().min(1).max(200),
  type: EventTypeSchema,
  starts_at: z.string(),
  ends_at: z.string(),
  all_day: z.boolean().default(false),
  location: z.string().max(200).default(""),
  notes: z.string().max(2000).default(""),
  color: z.string().max(40).default("primary"),
});

const UpdateEventSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200).optional(),
  starts_at: z.string().optional(),
  ends_at: z.string().optional(),
  location: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
  color: z.string().max(40).optional(),
});

const RangeSchema = z.object({
  from: z.string(),
  to: z.string(),
});




export const listMyCalendarEvents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RangeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: guide } = await supabase
      .from("guides")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!guide) return [];

    const { data: events, error } = await supabase
      .from("calendar_events")
      .select("*")
      .eq("guide_id", guide.id)
      .gte("starts_at", data.from)
      .lte("starts_at", data.to)
      .order("starts_at", { ascending: true });

    if (error) throw new Error(error.message);
    return events ?? [];
  });

export const createCalendarEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CreateEventSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: guide } = await supabase
      .from("guides")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!guide) throw new Error("Guide profile not found");

    const { data: event, error } = await supabase
      .from("calendar_events")
      .insert({
        guide_id: guide.id,
        type: data.type,
        title: data.title,
        starts_at: data.starts_at,
        ends_at: data.ends_at,
        all_day: data.all_day,
        location: data.location,
        notes: data.notes,
        color: data.color,
        source: "manual",
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Mirror to Google Calendar (best-effort)
    try {
      const googleEventId = await pushEventToGoogle(guide.id, {
        title: data.title,
        starts_at: data.starts_at,
        ends_at: data.ends_at,
        location: data.location,
        notes: data.notes,
      });
      if (googleEventId && event) {
        await supabaseAdmin
          .from("calendar_events")
          .update({ google_event_id: googleEventId } as never)
          .eq("id", (event as { id: string }).id);
      }
    } catch (e) {
      console.error("[calendar] google push failed:", e);
    }

    return event;
  });

export const updateCalendarEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UpdateEventSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: guide } = await supabase
      .from("guides")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!guide) throw new Error("Guide profile not found");

    const { id, ...patch } = data;
    const cleaned: Record<string, string> = {};
    for (const [k, v] of Object.entries(patch)) {
      if (v !== undefined) cleaned[k] = v as string;
    }

    const { data: event, error } = await supabase
      .from("calendar_events")
      .update(cleaned as never)
      .eq("id", id)
      .eq("guide_id", guide.id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Mirror update to Google Calendar
    try {
      const ev = event as {
        google_event_id: string | null;
        title: string;
        starts_at: string;
        ends_at: string;
        location: string;
        notes: string;
      } | null;
      if (ev?.google_event_id) {
        await updateEventOnGoogle(guide.id, ev.google_event_id, {
          title: ev.title,
          starts_at: ev.starts_at,
          ends_at: ev.ends_at,
          location: ev.location,
          notes: ev.notes,
        });
      }
    } catch (e) {
      console.error("[calendar] google update failed:", e);
    }

    return event;
  });

export const deleteCalendarEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: guide } = await supabase
      .from("guides")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!guide) throw new Error("Guide profile not found");

    // Only allow deleting manual/personal/block events, not bookings
    const { data: existing } = await supabase
      .from("calendar_events")
      .select("source, type, google_event_id")
      .eq("id", data.id)
      .eq("guide_id", guide.id)
      .maybeSingle();

    if (!existing) throw new Error("Event not found");
    const ex = existing as unknown as { source: string; google_event_id: string | null };
    if (ex.source === "booking") {
      throw new Error("Cancel the booking instead to remove this event");
    }

    const { error } = await supabase
      .from("calendar_events")
      .delete()
      .eq("id", data.id)
      .eq("guide_id", guide.id);

    if (error) throw new Error(error.message);

    // Mirror delete to Google Calendar
    if (ex.google_event_id) {
      try {
        await deleteEventOnGoogle(guide.id, ex.google_event_id);
      } catch (e) {
        console.error("[calendar] google delete failed:", e);
      }
    }

    return { ok: true };
  });

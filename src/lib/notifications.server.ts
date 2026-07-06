import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * In-app notifications helper.
 *
 * Inserts a row into `public.notifications`. Called from server-side code
 * alongside email + Telegram sends so the mobile app + web bell can surface
 * the same event.
 *
 * Contract for mobile deep-links:
 *  - `entity_type` + `entity_id` are the source of truth for routing.
 *  - For every `booking_*` type AND `chat_message`, `entity_id` MUST be the
 *    `bookings.id` (never slot_id, never message_id). Mobile opens
 *    MyBookings by that id. `chat_message` also uses `booking` as entity;
 *    when a dedicated chat screen ships the same deep-link opens the chat
 *    without any schema change.
 *  - `link` is a web URL for the web bell/banner; mobile can ignore it.
 */

export type NotificationType =
  | "booking_new"                    // client booked → notify guide
  | "booking_status"                 // guide confirmed / declined / completed
  | "booking_proposal"               // guide proposed a new time
  | "booking_cancelled_by_client"    // client cancelled → notify guide
  | "booking_proposal_response"      // client accepted / declined proposal
  | "booking_reminder"               // 24h before start
  | "chat_message"                   // unread booking chat message
  | "guide_application_admin"        // new application to review
  | "guide_application_status";      // approved / rejected

export type EntityType = "booking" | "guide_application" | "booking_message";

export interface NotificationInput {
  userId: string;                    // recipient
  type: NotificationType;
  entityId?: string | null;
  entityType?: EntityType | null;
  title: string;
  body?: string | null;
  icon?: string | null;
  link?: string | null;
  category?: string | null;
}

/**
 * Best-effort insert. Never throws — notifications must not break the primary
 * flow (booking creation, status update, etc.). Errors are logged only.
 */
export async function createNotification(
  supabase: SupabaseClient,
  input: NotificationInput,
): Promise<void> {
  if (!input.userId) return;
  try {
    const { error } = await supabase.from("notifications").insert({
      user_id: input.userId,
      type: input.type,
      entity_id: input.entityId ?? null,
      entity_type: input.entityType ?? null,
      title: input.title,
      body: input.body ?? null,
      icon: input.icon ?? null,
      link: input.link ?? null,
      category: input.category ?? categoryFor(input.type),
    });
    if (error) console.error("createNotification failed", input.type, error);
  } catch (e) {
    console.error("createNotification threw", input.type, e);
  }
}

function categoryFor(type: NotificationType): string {
  if (type.startsWith("booking_") || type === "chat_message") return "bookings";
  if (type.startsWith("guide_application")) return "system";
  return "system";
}

/** Convenience: fan out one notification to many recipients. */
export async function createNotifications(
  supabase: SupabaseClient,
  userIds: string[],
  input: Omit<NotificationInput, "userId">,
): Promise<void> {
  const uniq = Array.from(new Set(userIds.filter(Boolean)));
  if (uniq.length === 0) return;
  try {
    const { error } = await supabase.from("notifications").insert(
      uniq.map((uid) => ({
        user_id: uid,
        type: input.type,
        entity_id: input.entityId ?? null,
        entity_type: input.entityType ?? null,
        title: input.title,
        body: input.body ?? null,
        icon: input.icon ?? null,
        link: input.link ?? null,
        category: input.category ?? categoryFor(input.type),
      })),
    );
    if (error) console.error("createNotifications failed", input.type, error);
  } catch (e) {
    console.error("createNotifications threw", input.type, e);
  }
}

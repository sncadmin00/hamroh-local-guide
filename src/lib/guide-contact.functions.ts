/**
 * Guide notification contact settings.
 *
 * `guides.notification_email` is a private column (revoked from anon &
 * authenticated), so it can only be read/written through these server
 * functions using the service role, scoped to the authenticated user's own
 * guide row.
 *
 * Fallback: when `notification_email` is null/empty, the effective email is
 * the guide's auth account email (auth.users.email).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getMyNotificationEmail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data: guide } = await supabaseAdmin
      .from("guides")
      .select("id, notification_email")
      .eq("user_id", userId)
      .maybeSingle();
    if (!guide) return null;
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
    const authEmail = authUser?.user?.email ?? null;
    const custom = (guide as any).notification_email as string | null;
    return {
      guide_id: guide.id as string,
      notification_email: custom,
      auth_email: authEmail,
      effective_email: (custom && custom.trim()) || authEmail,
    };
  });

export const updateMyNotificationEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        // Pass an empty string / null to clear and fall back to auth email.
        email: z.string().trim().max(320).email().nullable().or(z.literal("")),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { userId } = context;
    const value = data.email && data.email.trim() ? data.email.trim().toLowerCase() : null;
    const { data: updated, error } = await supabaseAdmin
      .from("guides")
      .update({ notification_email: value })
      .eq("user_id", userId)
      .select("id, notification_email")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!updated) throw new Error("Guide profile not found");
    return { ok: true, notification_email: (updated as any).notification_email as string | null };
  });

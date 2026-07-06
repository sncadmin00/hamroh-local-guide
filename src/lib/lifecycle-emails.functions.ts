import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { enqueueTransactionalEmail } from "@/lib/email/enqueue.server";
import { createNotification } from "@/lib/notifications.server";

const APP_BASE_URL = "https://hamrohim.com";

const welcomeSchema = z.object({
  email: z.string().email().max(255),
  name: z.string().max(120).optional(),
  locale: z.enum(["ru", "uz", "en"]).optional(),
});

/** Welcome email after signup. Public (signup is anon-callable). */
export const sendWelcomeEmail = createServerFn({ method: "POST" })
  .inputValidator((input) => welcomeSchema.parse(input))
  .handler(async ({ data }) => {
    const email = data.email.trim().toLowerCase();
    try {
      await enqueueTransactionalEmail({
        supabase: supabaseAdmin,
        templateName: "welcome",
        recipientEmail: email,
        templateData: {
          name: data.name,
          exploreUrl: `${APP_BASE_URL}/`,
          locale: data.locale ?? "ru",
        },
        idempotencyKey: `welcome-${email}`,
      });
    } catch (e) {
      console.error("welcome email failed", e);
    }
    return { ok: true };
  });

const statusSchema = z.object({
  application_id: z.string().uuid(),
  status: z.enum(["approved", "rejected"]),
});

/**
 * Notifies a guide applicant about their application status change.
 * Admin-only — verifies caller has admin role.
 */
export const notifyGuideApplicationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => statusSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const isAdmin = (roles ?? []).some((r) => r.role === "admin");
    if (!isAdmin) throw new Error("Forbidden");

    const { data: app } = await supabaseAdmin
      .from("guide_applications")
      .select("id, full_name, email, user_id")
      .eq("id", data.application_id)
      .maybeSingle();
    if (!app?.email) return { ok: false };

    const portalUrl =
      data.status === "approved"
        ? `${APP_BASE_URL}/guide`
        : `${APP_BASE_URL}/become-a-guide`;

    try {
      await enqueueTransactionalEmail({
        supabase: supabaseAdmin,
        templateName: "guide-application-status",
        recipientEmail: app.email as string,
        templateData: {
          fullName: app.full_name,
          status: data.status,
          portalUrl,
          locale: "ru",
        },
        idempotencyKey: `guide-app-status-${app.id}-${data.status}`,
      });
    } catch (e) {
      console.error("guide-application-status email failed", e);
    }

    // In-app notification for the applicant (if their account is known)
    if (app.user_id) {
      await createNotification(supabaseAdmin, {
        userId: app.user_id as string,
        type: "guide_application_status",
        entityId: app.id,
        entityType: "guide_application",
        title: data.status === "approved" ? "Your guide application was approved" : "Your guide application was not approved",
        body: data.status === "approved"
          ? "Welcome aboard — open the guide portal to finish your profile."
          : "Thanks for applying. See details in your account.",
        icon: data.status === "approved" ? "🎉" : "ℹ️",
        link: data.status === "approved" ? "/guide" : "/become-a-guide",
      });
    }

    return { ok: true };
  });

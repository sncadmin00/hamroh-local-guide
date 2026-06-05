import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { enqueueTransactionalEmail } from "@/lib/email/enqueue.server";
import { getOptionalUserId } from "@/lib/optional-auth.server";

const APP_BASE_URL = "https://hamrohim.com";

/**
 * Notifies all admins that a new guide application was submitted.
 * Called from the public become-a-guide form right after the insert.
 * Public on purpose (form is anon-accessible); validated by application_id.
 */
export const notifyAdminsOfGuideApplication = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ application_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { data: app, error } = await supabaseAdmin
      .from("guide_applications")
      .select("id, full_name, email, phone, telegram, city, languages, specialization, experience_years, about, created_at")
      .eq("id", data.application_id)
      .maybeSingle();
    if (error || !app) return { ok: false };

    // Find admin emails
    const { data: roleRows } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    const adminUserIds = (roleRows ?? []).map((r) => r.user_id as string);
    if (adminUserIds.length === 0) return { ok: true, sent: 0 };

    let sent = 0;
    for (const uid of adminUserIds) {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(uid);
      const email = u?.user?.email;
      if (!email) continue;
      try {
        const ok = await enqueueTransactionalEmail({
          supabase: supabaseAdmin,
          templateName: "guide-application-admin",
          recipientEmail: email,
          templateData: {
            fullName: app.full_name,
            email: app.email,
            phone: app.phone,
            telegram: app.telegram,
            city: app.city,
            languages: app.languages,
            specialization: app.specialization,
            experienceYears: app.experience_years,
            about: app.about,
            reviewUrl: `${APP_BASE_URL}/admin`,
          },
          idempotencyKey: `guide-app-${app.id}-${uid}`,
        });
        if (ok) sent++;
      } catch (e) {
        console.error("Admin notify failed", e);
      }
    }
    return { ok: true, sent };
  });

const subscribeSchema = z.object({
  email: z.string().email().max(255),
  locale: z.enum(["ru", "uz", "en"]).optional(),
  source: z.string().max(64).optional(),
});

/** Add an email to newsletter list (idempotent — re-opts in if previously unsubscribed). */
export const subscribeToNewsletter = createServerFn({ method: "POST" })
  .inputValidator((input) => subscribeSchema.parse(input))
  .handler(async ({ data }) => {
    const email = data.email.trim().toLowerCase();
    const userId = await getOptionalUserId();
    const { error } = await supabaseAdmin
      .from("newsletter_subscribers")
      .upsert(
        {
          email,
          locale: data.locale ?? "ru",
          source: data.source ?? "signup",
          user_id: userId,
          unsubscribed_at: null,
          confirmed_at: new Date().toISOString(),
        },
        { onConflict: "email" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

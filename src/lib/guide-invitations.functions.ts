import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SITE_URL = "https://hamrohim.com";

function genToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function assertAdmin(supabase: any, userId: string) {
  const { data: isAdmin } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Forbidden");
}

/* ---------------- Tavily search ---------------- */

export const searchExistingGuides = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      query: z.string().trim().min(2).max(200),
    }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);

    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) throw new Error("TAVILY_API_KEY is not configured");

    const fullQuery = `${data.query} tour guide Uzbekistan contact email`;
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query: fullQuery,
        search_depth: "advanced",
        max_results: 10,
        include_answer: false,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Tavily search failed: ${res.status} ${text.slice(0, 200)}`);
    }

    const payload = await res.json();
    const results: Array<{ title: string; url: string; content: string; emails: string[] }> = [];
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

    for (const r of (payload.results ?? [])) {
      const blob = `${r.title ?? ""} ${r.content ?? ""} ${r.raw_content ?? ""}`;
      const emails = Array.from(new Set((blob.match(emailRegex) ?? []).map((e: string) => e.toLowerCase())))
        .filter((e: string) => !e.endsWith(".png") && !e.endsWith(".jpg"));
      results.push({
        title: r.title ?? "",
        url: r.url ?? "",
        content: (r.content ?? "").slice(0, 280),
        emails,
      });
    }

    return { results };
  });

/* ---------------- Create invitations ---------------- */

const LocaleSchema = z.enum(["ru", "uz", "en"]).default("ru");

const InviteItemSchema = z.object({
  email: z.string().trim().email().max(255),
  name: z.string().trim().max(200).optional().default(""),
  city: z.string().trim().max(120).optional().default(""),
  source: z.enum(["manual", "web"]).default("manual"),
  source_url: z.string().trim().max(500).optional().default(""),
  notes: z.string().trim().max(1000).optional().default(""),
  locale: LocaleSchema.optional(),
});

export const createGuideInvitations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      items: z.array(InviteItemSchema).min(1).max(50),
      locale: LocaleSchema.optional(),
    }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { enqueueTransactionalEmail } = await import("@/lib/email/enqueue.server");

    let sent = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const item of data.items) {
      const email = item.email.toLowerCase();

      // Skip if already an active invite to this email (pending/opened)
      const { data: existing } = await supabaseAdmin
        .from("guide_invitations")
        .select("id, status")
        .eq("email", email)
        .in("status", ["pending", "opened"])
        .maybeSingle();

      if (existing) {
        skipped++;
        continue;
      }

      const token = genToken();
      const { data: inserted, error: insErr } = await supabaseAdmin
        .from("guide_invitations")
        .insert({
          token,
          email,
          name: item.name || null,
          city: item.city || null,
          source: item.source,
          source_url: item.source_url || null,
          notes: item.notes || null,
          status: "pending",
          sent_by: userId,
          sent_at: new Date().toISOString(),
        })
        .select("id, token")
        .single();

      if (insErr || !inserted) {
        errors.push(`${email}: ${insErr?.message ?? "insert failed"}`);
        continue;
      }

      const inviteUrl = `${SITE_URL}/invite/${inserted.token}`;
      const itemLocale = item.locale ?? data.locale ?? "ru";
      const ok = await enqueueTransactionalEmail({
        supabase: supabaseAdmin,
        templateName: "guide-invitation",
        recipientEmail: item.email,
        templateData: {
          recipientName: item.name || undefined,
          inviteUrl,
          siteUrl: SITE_URL,
          locale: itemLocale,
        },
        idempotencyKey: `guide-invite-${inserted.id}`,
      });

      if (ok) sent++;
      else errors.push(`${email}: email send skipped (suppressed?)`);
    }

    return { sent, skipped, errors };
  });

/* ---------------- List invitations ---------------- */

export const listGuideInvitations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("guide_invitations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return { invitations: data ?? [] };
  });

/* ---------------- Resend invitation ---------------- */

export const resendGuideInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), locale: LocaleSchema.optional() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { data: inv } = await supabaseAdmin
      .from("guide_invitations")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (!inv) throw new Error("Invitation not found");

    const { enqueueTransactionalEmail } = await import("@/lib/email/enqueue.server");
    const inviteUrl = `${SITE_URL}/invite/${inv.token}`;
    const ok = await enqueueTransactionalEmail({
      supabase: supabaseAdmin,
      templateName: "guide-invitation",
      recipientEmail: inv.email,
      templateData: {
        recipientName: inv.name || undefined,
        inviteUrl,
        siteUrl: SITE_URL,
        locale: data.locale ?? "ru",
      },
      idempotencyKey: `guide-invite-resend-${inv.id}-${Date.now()}`,
    });

    await supabaseAdmin
      .from("guide_invitations")
      .update({ sent_at: new Date().toISOString() })
      .eq("id", inv.id);

    return { ok };
  });

export const markInvitationRegistered = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      token: z.string().min(8).max(128),
      application_id: z.string().uuid(),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("guide_invitations")
      .update({
        status: "registered",
        registered_at: new Date().toISOString(),
        application_id: data.application_id,
      })
      .eq("token", data.token);
    return { ok: true };
  });


/* ---------------- Public: track open by token ---------------- */

export const markInvitationOpened = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ token: z.string().min(8).max(128) }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: inv } = await supabaseAdmin
      .from("guide_invitations")
      .select("id, email, name, city, status, opened_at")
      .eq("token", data.token)
      .maybeSingle();
    if (!inv) return { ok: false, invitation: null };

    if (!inv.opened_at) {
      await supabaseAdmin
        .from("guide_invitations")
        .update({
          opened_at: new Date().toISOString(),
          status: inv.status === "pending" ? "opened" : inv.status,
        })
        .eq("id", inv.id);
    }
    return {
      ok: true,
      invitation: { email: inv.email, name: inv.name, city: inv.city },
    };
  });

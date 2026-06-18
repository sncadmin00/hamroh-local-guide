import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { signReportToken } from "@/lib/earnings-report.server";

/** Default commission rate when app_settings has no value. */
const DEFAULT_COMMISSION = 0.15;
/** Default service-fee rate when app_settings has no value. */
const DEFAULT_SERVICE_FEE = 0.05;

async function getCommissionRate(supabase: any): Promise<number> {
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "hamroh_commission_rate")
    .maybeSingle();
  const raw = (data as any)?.value;
  const num = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(num) || num < 0 || num >= 1) return DEFAULT_COMMISSION;
  return num;
}

async function getServiceFeeRate(supabase: any): Promise<number> {
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "hamroh_service_fee_rate")
    .maybeSingle();
  const raw = (data as any)?.value;
  const num = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(num) || num < 0 || num >= 1) return DEFAULT_SERVICE_FEE;
  return num;
}

async function requireMyGuideId(supabase: any, userId: string): Promise<string> {
  const { data, error } = await supabase
    .from("guides")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("No guide profile");
  return (data as any).id as string;
}

async function isAdmin(supabase: any, userId: string): Promise<boolean> {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  return Boolean(data);
}

function periodBounds(period: string, refIso?: string): { from: string; to: string } {
  const now = refIso ? new Date(refIso) : new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate();
  const fmt = (dt: Date) => dt.toISOString().slice(0, 10);
  if (period === "today") {
    const a = new Date(Date.UTC(y, m, d));
    return { from: fmt(a), to: fmt(a) };
  }
  if (period === "week") {
    const day = (now.getUTCDay() + 6) % 7; // monday=0
    const start = new Date(Date.UTC(y, m, d - day));
    const end = new Date(Date.UTC(y, m, d - day + 6));
    return { from: fmt(start), to: fmt(end) };
  }
  if (period === "year") {
    return { from: `${y}-01-01`, to: `${y}-12-31` };
  }
  // default month
  const first = new Date(Date.UTC(y, m, 1));
  const last = new Date(Date.UTC(y, m + 1, 0));
  return { from: fmt(first), to: fmt(last) };
}

// ===== Public (auth'd guide) =====

export const getMyEarningsSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        period: z.enum(["today", "week", "month", "year", "custom"]).default("month"),
        from: z.string().optional(),
        to: z.string().optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const guideId = await requireMyGuideId(supabase, userId);
    const rate = await getCommissionRate(supabase);

    const bounds = data.period === "custom" && data.from && data.to
      ? { from: data.from, to: data.to }
      : periodBounds(data.period);

    // Period bookings
    const { data: rows, error } = await supabase
      .from("bookings")
      .select("id, date, total, status")
      .eq("guide_id", guideId)
      .gte("date", bounds.from)
      .lte("date", bounds.to);
    if (error) throw new Error(error.message);

    const list = (rows ?? []) as Array<{ total: number; status: string }>;
    const completed = list.filter((b) => b.status === "completed");
    const gross = completed.reduce((s, b) => s + Number(b.total ?? 0), 0);
    const commission = gross * rate;
    const net = gross - commission;
    const avg = completed.length ? gross / completed.length : 0;

    // KPI: this month always
    const month = periodBounds("month");
    const { data: monthRows } = await supabase
      .from("bookings")
      .select("total, status")
      .eq("guide_id", guideId)
      .gte("date", month.from)
      .lte("date", month.to);
    const monthCompleted = ((monthRows ?? []) as any[]).filter((b) => b.status === "completed");
    const monthGross = monthCompleted.reduce((s, b) => s + Number(b.total ?? 0), 0);
    const monthNet = monthGross * (1 - rate);
    const completedExperiences = monthCompleted.length;

    // Pending / paid payouts totals (all time)
    const { data: payouts } = await supabase
      .from("payouts")
      .select("amount, status")
      .eq("guide_id", guideId);
    const payList = (payouts ?? []) as Array<{ amount: number; status: string }>;
    const paidOut = payList.filter((p) => p.status === "paid").reduce((s, p) => s + Number(p.amount ?? 0), 0);
    const pendingPayout = Math.max(0, /* lifetime net */ await lifetimeNet(supabase, guideId, rate) - paidOut);

    return {
      commissionRate: rate,
      period: bounds,
      kpi: {
        monthTotalEarnings: monthNet,
        pendingPayout,
        paidOut,
        completedExperiences,
      },
      stats: {
        gross,
        commission,
        net,
        avgBookingValue: avg,
        bookingsCount: completed.length,
      },
    };
  });

async function lifetimeNet(supabase: any, guideId: string, rate: number): Promise<number> {
  const { data } = await supabase
    .from("bookings")
    .select("total")
    .eq("guide_id", guideId)
    .eq("status", "completed");
  const gross = ((data ?? []) as any[]).reduce((s, b) => s + Number(b.total ?? 0), 0);
  return gross * (1 - rate);
}

export const listMyTransactions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        from: z.string().optional(),
        to: z.string().optional(),
        status: z.string().optional(),
        tour_id: z.string().uuid().optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const guideId = await requireMyGuideId(supabase, userId);
    const rate = await getCommissionRate(supabase);

    let q = supabase
      .from("bookings")
      .select("id, date, start_time, experience, customer_name, guests, total, status, tour_id")
      .eq("guide_id", guideId)
      .order("date", { ascending: false })
      .limit(500);
    if (data.from) q = q.gte("date", data.from);
    if (data.to) q = q.lte("date", data.to);
    if (data.status) q = q.eq("status", data.status);
    if (data.tour_id) q = q.eq("tour_id", data.tour_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    return {
      commissionRate: rate,
      rows: ((rows ?? []) as any[]).map((b) => {
        const gross = Number(b.total ?? 0);
        const fee = gross * rate;
        return {
          id: b.id,
          date: b.date,
          start_time: b.start_time,
          experience: b.experience,
          customer_name: b.customer_name,
          guests: b.guests,
          gross,
          fee,
          net: gross - fee,
          status: b.status,
        };
      }),
    };
  });

export const listMyPayouts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const guideId = await requireMyGuideId(supabase, userId);
    const { data, error } = await supabase
      .from("payouts")
      .select("id, payout_number, amount, currency, method, status, scheduled_at, paid_at, reference, notes, created_at")
      .eq("guide_id", guideId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as any[];
  });

/** List monthly Net Settlement statements for the current guide */
export const listMyStatements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const guideId = await requireMyGuideId(supabase, userId);
    const { data, error } = await supabase
      .from("monthly_statements")
      .select("id, statement_number, period_year, period_month, online_revenue, online_payout_to_guide, online_bookings_count, cash_revenue, cash_commission_to_us, cash_bookings_count, net_amount, direction, status, due_date, settled_at, payment_method, payment_reference, pdf_url, notes, created_at")
      .eq("guide_id", guideId)
      .order("period_year", { ascending: false })
      .order("period_month", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as any[];
  });

/** Generate signed PDF/CSV report URLs (PDF served by /api/earnings/report). */
export const getMyReportUrls = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        kind: z.enum(["monthly", "annual", "tax"]),
        period: z.string().min(4).max(10), // YYYY or YYYY-MM
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const guideId = await requireMyGuideId(supabase, userId);
    const token = signReportToken({ guideId, kind: data.kind, period: data.period });
    const base = `/api/earnings/report?guide_id=${guideId}&kind=${data.kind}&period=${encodeURIComponent(data.period)}&token=${token}`;
    return { pdfUrl: `${base}&format=pdf`, csvUrl: `${base}&format=csv` };
  });

// ===== Admin =====

export const adminListGuideEarnings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    if (!(await isAdmin(supabase, userId))) throw new Error("Forbidden");
    const rate = await getCommissionRate(supabase);

    const { data: guides, error } = await supabase
      .from("guides")
      .select("id, name, slug, tax_status, tax_id, photo_url")
      .order("name");
    if (error) throw new Error(error.message);

    // Aggregate per guide
    const { data: bookings } = await supabase
      .from("bookings")
      .select("guide_id, total, status");
    const { data: payouts } = await supabase
      .from("payouts")
      .select("guide_id, amount, status");

    const byGuide: Record<string, { gross: number; net: number; paid: number }> = {};
    for (const b of (bookings ?? []) as any[]) {
      if (b.status !== "completed") continue;
      const g = byGuide[b.guide_id] ?? (byGuide[b.guide_id] = { gross: 0, net: 0, paid: 0 });
      const gross = Number(b.total ?? 0);
      g.gross += gross;
      g.net += gross * (1 - rate);
    }
    for (const p of (payouts ?? []) as any[]) {
      if (p.status !== "paid") continue;
      const g = byGuide[p.guide_id] ?? (byGuide[p.guide_id] = { gross: 0, net: 0, paid: 0 });
      g.paid += Number(p.amount ?? 0);
    }

    return {
      commissionRate: rate,
      guides: ((guides ?? []) as any[]).map((g) => {
        const a = byGuide[g.id] ?? { gross: 0, net: 0, paid: 0 };
        return {
          id: g.id,
          name: g.name,
          slug: g.slug,
          tax_status: g.tax_status,
          tax_id: g.tax_id,
          photo_url: g.photo_url,
          gross: a.gross,
          net: a.net,
          paid: a.paid,
          pending: Math.max(0, a.net - a.paid),
        };
      }),
    };
  });

export const adminGetGuideReportUrls = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        guideId: z.string().uuid(),
        kind: z.enum(["monthly", "annual", "tax"]),
        period: z.string().min(4).max(10),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    if (!(await isAdmin(supabase, userId))) throw new Error("Forbidden");
    const token = signReportToken({ guideId: data.guideId, kind: data.kind, period: data.period });
    const base = `/api/earnings/report?guide_id=${data.guideId}&kind=${data.kind}&period=${encodeURIComponent(data.period)}&token=${token}`;
    return { pdfUrl: `${base}&format=pdf`, csvUrl: `${base}&format=csv` };
  });

export const adminListGuidePayouts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ guideId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    if (!(await isAdmin(supabase, userId))) throw new Error("Forbidden");
    const { data: rows, error } = await supabase
      .from("payouts")
      .select("id, payout_number, amount, currency, method, status, scheduled_at, paid_at, reference, notes, created_at")
      .eq("guide_id", data.guideId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows ?? []) as any[];
  });

export const adminCreatePayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        guideId: z.string().uuid(),
        amount: z.number().positive(),
        method: z.enum(["bank", "click", "payme", "cash", "other"]).default("bank"),
        status: z.enum(["scheduled", "processing", "paid", "failed"]).default("paid"),
        reference: z.string().max(200).optional(),
        notes: z.string().max(1000).optional(),
        paid_at: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    if (!(await isAdmin(supabase, userId))) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const insertRow: any = {
      guide_id: data.guideId,
      amount: data.amount,
      method: data.method,
      status: data.status,
      reference: data.reference ?? null,
      notes: data.notes ?? null,
      paid_at: data.status === "paid" ? (data.paid_at ?? new Date().toISOString()) : null,
      created_by: userId,
    };
    const { data: row, error } = await (supabaseAdmin.from("payouts") as any)
      .insert(insertRow)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const adminUpdatePayoutStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        payoutId: z.string().uuid(),
        status: z.enum(["scheduled", "processing", "paid", "failed"]),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    if (!(await isAdmin(supabase, userId))) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: Record<string, any> = { status: data.status };
    if (data.status === "paid") patch.paid_at = new Date().toISOString();
    const { error } = await (supabaseAdmin.from("payouts") as any).update(patch).eq("id", data.payoutId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeletePayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ payoutId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    if (!(await isAdmin(supabase, userId))) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("payouts").delete().eq("id", data.payoutId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminGetCommissionRate = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    if (!(await isAdmin(supabase, userId))) throw new Error("Forbidden");
    return { rate: await getCommissionRate(supabase) };
  });

export const adminSetCommissionRate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ rate: z.number().min(0).max(0.9) }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    if (!(await isAdmin(supabase, userId))) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("app_settings")
      .upsert({ key: "hamroh_commission_rate", value: data.rate as any, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminGetServiceFeeRate = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    if (!(await isAdmin(supabase, userId))) throw new Error("Forbidden");
    return { rate: await getServiceFeeRate(supabase) };
  });

export const adminSetServiceFeeRate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ rate: z.number().min(0).max(0.9) }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    if (!(await isAdmin(supabase, userId))) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("app_settings")
      .upsert({ key: "hamroh_service_fee_rate", value: data.rate as any, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Public: current service fee rate (used by booking page). */
export const getPublicServiceFeeRate = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return { rate: await getServiceFeeRate(supabaseAdmin) };
});

export const getMyTaxInfo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("guides")
      .select("tax_status, tax_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      tax_status: (data?.tax_status ?? "none") as "none" | "self_employed" | "ip",
      tax_id: (data?.tax_id ?? "") as string,
    };
  });

export const updateMyTaxInfo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        tax_status: z.enum(["none", "self_employed", "ip"]),
        tax_id: z.string().trim().max(40).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("guides")
      .update({ tax_status: data.tax_status, tax_id: data.tax_id ?? null })
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===== Net Settlement Statements (admin) =====

import { generateStatementsForPeriod, notifyGuideStatement } from "@/lib/statements.server";

export const adminGenerateStatements = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        year: z.number().int().min(2024).max(2100),
        month: z.number().int().min(1).max(12),
        notify: z.boolean().optional().default(false),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    if (!(await isAdmin(supabase, userId))) throw new Error("Forbidden");
    const from = new Date(Date.UTC(data.year, data.month - 1, 1)).toISOString().slice(0, 10);
    const to = new Date(Date.UTC(data.year, data.month, 0)).toISOString().slice(0, 10);
    const { count: completedCount } = await supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed")
      .gte("date", from)
      .lte("date", to);
    const results = await generateStatementsForPeriod(supabase, data.year, data.month);
    let notified = 0;
    if (data.notify) {
      for (const r of results) {
        if (await notifyGuideStatement(supabase, r, data.year, data.month)) notified++;
      }
    }
    return { count: results.length, notified, results, completedBookings: completedCount ?? 0 };
  });

export const adminListStatements = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        year: z.number().int().min(2024).max(2100),
        month: z.number().int().min(1).max(12),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    if (!(await isAdmin(supabase, userId))) throw new Error("Forbidden");
    const { data: rows, error } = await supabase
      .from("monthly_statements")
      .select(
        "id, statement_number, guide_id, period_year, period_month, online_revenue, online_payout_to_guide, online_bookings_count, cash_revenue, cash_commission_to_us, cash_bookings_count, net_amount, direction, status, due_date, settled_at, payment_method, payment_reference, notes, created_at, guides(name)",
      )
      .eq("period_year", data.year)
      .eq("period_month", data.month)
      .order("net_amount", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows ?? []) as any[];
  });

export const adminSettleStatement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        statementId: z.string().uuid(),
        status: z.enum(["pending", "settled", "rolled_over", "cancelled"]),
        payment_method: z.string().trim().max(40).optional(),
        payment_reference: z.string().trim().max(200).optional(),
        notes: z.string().trim().max(2000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    if (!(await isAdmin(supabase, userId))) throw new Error("Forbidden");
    const patch: any = { status: data.status };
    if (data.status === "settled") patch.settled_at = new Date().toISOString();
    else patch.settled_at = null;
    if (data.payment_method !== undefined) patch.payment_method = data.payment_method || null;
    if (data.payment_reference !== undefined) patch.payment_reference = data.payment_reference || null;
    if (data.notes !== undefined) patch.notes = data.notes || null;
    const { error } = await supabase
      .from("monthly_statements")
      .update(patch)
      .eq("id", data.statementId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===== Hamroh platform revenue (admin) =====

export const adminGetHamrohRevenue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        year: z.number().int().min(2024).max(2100),
        month: z.number().int().min(1).max(12),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    if (!(await isAdmin(supabase, userId))) throw new Error("Forbidden");

    const from = new Date(Date.UTC(data.year, data.month - 1, 1)).toISOString().slice(0, 10);
    const to = new Date(Date.UTC(data.year, data.month, 0)).toISOString().slice(0, 10);

    // Month bookings
    const { data: bks, error } = await supabase
      .from("bookings")
      .select("payment_method, tour_price, total, commission_amount, guide_payout_amount, status, date")
      .eq("status", "completed")
      .gte("date", from)
      .lte("date", to);
    if (error) throw new Error(error.message);

    let onlineRevenue = 0;
    let onlinePayoutToGuide = 0;
    let onlineCommission = 0;
    let onlineCount = 0;
    let cashRevenue = 0;
    let cashCommission = 0;
    let cashCount = 0;
    for (const b of (bks ?? []) as any[]) {
      const price = Number(b.tour_price ?? b.total ?? 0);
      if (b.payment_method === "online") {
        onlineRevenue += price;
        const payout = Number(b.guide_payout_amount ?? 0);
        onlinePayoutToGuide += payout;
        onlineCommission += price - payout;
        onlineCount += 1;
      } else {
        cashRevenue += price;
        cashCommission += Number(b.commission_amount ?? 0);
        cashCount += 1;
      }
    }
    const totalRevenue = onlineRevenue + cashRevenue;
    const totalCount = onlineCount + cashCount;
    const netProfit = onlineCommission + cashCommission;
    const avgCheck = totalCount ? totalRevenue / totalCount : 0;

    // Settled vs pending from monthly_statements
    const { data: stmts } = await supabase
      .from("monthly_statements")
      .select("status, direction, net_amount, online_payout_to_guide, cash_commission_to_us")
      .eq("period_year", data.year)
      .eq("period_month", data.month);
    let settledStatements = 0;
    let pendingStatements = 0;
    for (const s of (stmts ?? []) as any[]) {
      if (s.status === "settled") settledStatements += 1;
      else if (s.status === "pending") pendingStatements += 1;
    }

    // 12-month series
    const seriesFromDate = new Date(Date.UTC(data.year, data.month - 11, 1));
    const seriesFrom = seriesFromDate.toISOString().slice(0, 10);
    const { data: yearBks } = await supabase
      .from("bookings")
      .select("payment_method, tour_price, total, commission_amount, guide_payout_amount, date")
      .eq("status", "completed")
      .gte("date", seriesFrom)
      .lte("date", to);

    const buckets = new Map<string, { revenue: number; payouts: number; profit: number; count: number }>();
    for (let i = 0; i < 12; i++) {
      const d = new Date(Date.UTC(data.year, data.month - 11 + i, 1));
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      buckets.set(key, { revenue: 0, payouts: 0, profit: 0, count: 0 });
    }
    for (const b of (yearBks ?? []) as any[]) {
      const dt = new Date(b.date);
      const key = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}`;
      const bucket = buckets.get(key);
      if (!bucket) continue;
      const price = Number(b.tour_price ?? b.total ?? 0);
      bucket.revenue += price;
      bucket.count += 1;
      if (b.payment_method === "online") {
        const payout = Number(b.guide_payout_amount ?? 0);
        bucket.payouts += payout;
        bucket.profit += price - payout;
      } else {
        bucket.profit += Number(b.commission_amount ?? 0);
      }
    }
    const series = Array.from(buckets.entries()).map(([key, v]) => ({
      period: key,
      revenue: +v.revenue.toFixed(2),
      payouts: +v.payouts.toFixed(2),
      profit: +v.profit.toFixed(2),
      count: v.count,
    }));

    return {
      month: { year: data.year, month: data.month },
      online: {
        revenue: +onlineRevenue.toFixed(2),
        payoutToGuide: +onlinePayoutToGuide.toFixed(2),
        commission: +onlineCommission.toFixed(2),
        count: onlineCount,
      },
      cash: {
        revenue: +cashRevenue.toFixed(2),
        commission: +cashCommission.toFixed(2),
        count: cashCount,
      },
      totals: {
        revenue: +totalRevenue.toFixed(2),
        payoutToGuide: +onlinePayoutToGuide.toFixed(2),
        netProfit: +netProfit.toFixed(2),
        bookings: totalCount,
        avgCheck: +avgCheck.toFixed(2),
      },
      statements: {
        settled: settledStatements,
        pending: pendingStatements,
        total: settledStatements + pendingStatements,
      },
      series,
    };
  });

/**
 * Net Settlement statements generator (server-only).
 *
 * For a given (year, month) we aggregate all `completed` bookings whose `date`
 * falls in that month, grouped by guide, splitting cash vs online flows:
 *
 *   - online_revenue          = sum(tour_price) where payment_method = 'online'
 *   - online_payout_to_guide  = sum(guide_payout_amount) where payment_method = 'online'  (we owe guide)
 *   - cash_revenue            = sum(tour_price) where payment_method = 'cash'
 *   - cash_commission_to_us   = sum(commission_amount) where payment_method = 'cash'      (guide owes us)
 *   - net_amount              = online_payout_to_guide - cash_commission_to_us
 *
 * direction:
 *   - 'payout'  net > 0   (we pay guide)
 *   - 'invoice' net < 0   (guide pays us)
 *   - 'zero'    net = 0
 *
 * Re-running for the same period is idempotent: existing statements are
 * updated in place via the UNIQUE (guide_id, period_year, period_month) key,
 * and bookings get their `statement_id` linked.
 */

import { sendTelegramMessage } from "@/lib/telegram-notifications.server";

type AnySupabase = any;

export type GeneratedStatement = {
  id: string;
  statement_number: string;
  guide_id: string;
  guide_name: string;
  net_amount: number;
  direction: "payout" | "invoice" | "zero";
};

function monthBounds(year: number, month: number): { from: string; to: string } {
  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month, 0));
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmt(from), to: fmt(to) };
}

export async function generateStatementsForPeriod(
  supabase: AnySupabase,
  year: number,
  month: number,
): Promise<GeneratedStatement[]> {
  const { from, to } = monthBounds(year, month);

  // Fetch all completed bookings in the period
  const { data: bookings, error } = await supabase
    .from("bookings")
    .select(
      "id, guide_id, payment_method, tour_price, total, commission_amount, guide_payout_amount, status",
    )
    .eq("status", "completed")
    .gte("date", from)
    .lte("date", to);
  if (error) throw new Error(error.message);

  // Aggregate by guide
  const agg = new Map<
    string,
    {
      online_revenue: number;
      online_payout_to_guide: number;
      online_bookings_count: number;
      cash_revenue: number;
      cash_commission_to_us: number;
      cash_bookings_count: number;
      bookingIds: string[];
    }
  >();

  for (const b of (bookings ?? []) as any[]) {
    if (!b.guide_id) continue;
    const cur = agg.get(b.guide_id) ?? {
      online_revenue: 0,
      online_payout_to_guide: 0,
      online_bookings_count: 0,
      cash_revenue: 0,
      cash_commission_to_us: 0,
      cash_bookings_count: 0,
      bookingIds: [],
    };
    const price = Number(b.tour_price ?? b.total ?? 0);
    if (b.payment_method === "online") {
      cur.online_revenue += price;
      cur.online_payout_to_guide += Number(b.guide_payout_amount ?? 0);
      cur.online_bookings_count += 1;
    } else {
      cur.cash_revenue += price;
      cur.cash_commission_to_us += Number(b.commission_amount ?? 0);
      cur.cash_bookings_count += 1;
    }
    cur.bookingIds.push(b.id);
    agg.set(b.guide_id, cur);
  }

  if (agg.size === 0) return [];

  // Compute due_date = 10th of next month
  const dueDate = new Date(Date.UTC(year, month, 10)).toISOString().slice(0, 10);

  // Fetch guide names for the result payload
  const guideIds = Array.from(agg.keys());
  const { data: guideRows } = await supabase
    .from("guides")
    .select("id, name, user_id")
    .in("id", guideIds);
  const guideMap = new Map<string, { name: string; user_id: string | null }>();
  for (const g of (guideRows ?? []) as any[]) {
    guideMap.set(g.id, { name: g.name, user_id: g.user_id });
  }

  const results: GeneratedStatement[] = [];

  for (const [guideId, a] of agg.entries()) {
    const net = +(a.online_payout_to_guide - a.cash_commission_to_us).toFixed(2);
    const direction: "payout" | "invoice" | "zero" =
      net > 0 ? "payout" : net < 0 ? "invoice" : "zero";

    // Upsert statement
    const { data: existing } = await supabase
      .from("monthly_statements")
      .select("id, statement_number")
      .eq("guide_id", guideId)
      .eq("period_year", year)
      .eq("period_month", month)
      .maybeSingle();

    const payload = {
      guide_id: guideId,
      period_year: year,
      period_month: month,
      online_revenue: +a.online_revenue.toFixed(2),
      online_payout_to_guide: +a.online_payout_to_guide.toFixed(2),
      online_bookings_count: a.online_bookings_count,
      cash_revenue: +a.cash_revenue.toFixed(2),
      cash_commission_to_us: +a.cash_commission_to_us.toFixed(2),
      cash_bookings_count: a.cash_bookings_count,
      net_amount: net,
      direction,
      due_date: dueDate,
    };

    let stmtId: string;
    let stmtNumber: string;

    if (existing) {
      const { data: upd, error: uErr } = await supabase
        .from("monthly_statements")
        .update(payload)
        .eq("id", (existing as any).id)
        .select("id, statement_number")
        .single();
      if (uErr) throw new Error(uErr.message);
      stmtId = (upd as any).id;
      stmtNumber = (upd as any).statement_number;
    } else {
      const { data: ins, error: iErr } = await supabase
        .from("monthly_statements")
        .insert(payload)
        .select("id, statement_number")
        .single();
      if (iErr) throw new Error(iErr.message);
      stmtId = (ins as any).id;
      stmtNumber = (ins as any).statement_number;
    }

    // Link bookings to statement
    if (a.bookingIds.length) {
      await supabase
        .from("bookings")
        .update({ statement_id: stmtId })
        .in("id", a.bookingIds);
    }

    const guideInfo = guideMap.get(guideId);
    results.push({
      id: stmtId,
      statement_number: stmtNumber,
      guide_id: guideId,
      guide_name: guideInfo?.name ?? "",
      net_amount: net,
      direction,
    });
  }

  return results;
}

function fmtMoney(n: number): string {
  return Math.round(n).toLocaleString("en-US") + " UZS";
}

function periodLabel(year: number, month: number): string {
  return `${String(month).padStart(2, "0")}/${year}`;
}

/**
 * Notify a guide on Telegram about a new monthly statement.
 * Returns true if the message was sent.
 */
export async function notifyGuideStatement(
  supabase: AnySupabase,
  stmt: GeneratedStatement,
  year: number,
  month: number,
): Promise<boolean> {
  // Find guide.user_id → telegram_accounts.telegram_chat_id
  const { data: guide } = await supabase
    .from("guides")
    .select("user_id, name")
    .eq("id", stmt.guide_id)
    .maybeSingle();
  const userId = (guide as any)?.user_id;
  if (!userId) return false;

  const { data: tg } = await supabase
    .from("telegram_accounts")
    .select("telegram_chat_id")
    .eq("user_id", userId)
    .maybeSingle();
  const chatId = (tg as any)?.telegram_chat_id;
  if (!chatId) return false;

  const periodStr = periodLabel(year, month);
  const abs = fmtMoney(Math.abs(stmt.net_amount));
  let text: string;
  if (stmt.direction === "payout") {
    text =
      `📄 <b>Statement ${stmt.statement_number}</b>\n` +
      `Period: ${periodStr}\n\n` +
      `✅ Hamroh owes you: <b>${abs}</b>\n` +
      `Expected payout by the 10th.`;
  } else if (stmt.direction === "invoice") {
    text =
      `📄 <b>Statement ${stmt.statement_number}</b>\n` +
      `Period: ${periodStr}\n\n` +
      `⚠️ You owe Hamroh: <b>${abs}</b>\n` +
      `Please settle by the 10th.`;
  } else {
    text =
      `📄 <b>Statement ${stmt.statement_number}</b>\n` +
      `Period: ${periodStr}\n\n` +
      `Net balance: 0. Nothing to pay either way.`;
  }
  try {
    return await sendTelegramMessage(chatId, text);
  } catch {
    return false;
  }
}

// Server-only PDF/CSV report builder for guide earnings.
// Uses pdf-lib + NotoSans fonts (already in project).

import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { createHmac, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import regularAsset from "@/assets/fonts/NotoSans-Regular.ttf.asset.json";
import boldAsset from "@/assets/fonts/NotoSans-Bold.ttf.asset.json";

export type ReportKind = "monthly" | "annual" | "tax";

// ---------- token ----------
function secret() {
  const s = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!s) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  return `earnings-report::${s}`;
}
function payload(p: { guideId: string; kind: ReportKind; period: string }) {
  return `${p.guideId}|${p.kind}|${p.period}`;
}
export function signReportToken(p: { guideId: string; kind: ReportKind; period: string }) {
  return createHmac("sha256", secret()).update(payload(p)).digest("hex");
}
export function verifyReportToken(p: { guideId: string; kind: ReportKind; period: string }, token: string | null | undefined) {
  if (!token) return false;
  try {
    const a = Buffer.from(token, "hex");
    const b = Buffer.from(signReportToken(p), "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// ---------- data ----------
export interface ReportData {
  guide: { id: string; name: string; tax_status: string; tax_id: string | null };
  commissionRate: number;
  period: { from: string; to: string; label: string };
  kind: ReportKind;
  rows: Array<{
    id: string;
    date: string;
    experience: string;
    customer_name: string;
    guests: number;
    gross: number;
    commission: number;
    net: number;
    status: string;
  }>;
  summary: {
    totalBookings: number;
    completedBookings: number;
    totalGuests: number;
    gross: number;
    commission: number;
    net: number;
  };
  payouts: Array<{
    id: string;
    payout_number: string;
    amount: number;
    currency: string;
    method: string;
    status: string;
    paid_at: string | null;
    created_at: string;
  }>;
  byMonth?: Array<{ month: string; gross: number; commission: number; net: number; count: number }>;
}

async function commissionRate(): Promise<number> {
  const { data } = await supabaseAdmin
    .from("app_settings")
    .select("value")
    .eq("key", "hamroh_commission_rate")
    .maybeSingle();
  const raw = (data as any)?.value;
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) && n >= 0 && n < 1 ? n : 0.15;
}

export function resolvePeriod(kind: ReportKind, period: string): { from: string; to: string; label: string } {
  if (kind === "annual") {
    const y = parseInt(period, 10);
    return { from: `${y}-01-01`, to: `${y}-12-31`, label: String(y) };
  }
  // monthly or tax: YYYY-MM
  const [ys, ms] = period.split("-");
  const y = parseInt(ys, 10);
  const m = parseInt(ms ?? "1", 10);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const last = new Date(Date.UTC(y, m, 0));
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const monthName = first.toLocaleString("en-US", { month: "long", timeZone: "UTC" });
  return { from: fmt(first), to: fmt(last), label: `${monthName} ${y}` };
}

export async function loadReportData(args: {
  guideId: string;
  kind: ReportKind;
  period: string;
}): Promise<ReportData | null> {
  const rate = await commissionRate();
  const range = resolvePeriod(args.kind, args.period);

  const { data: guide } = await supabaseAdmin
    .from("guides")
    .select("id, name, tax_status, tax_id")
    .eq("id", args.guideId)
    .maybeSingle();
  if (!guide) return null;

  const { data: bookings } = await supabaseAdmin
    .from("bookings")
    .select("id, date, experience, customer_name, guests, total, status")
    .eq("guide_id", args.guideId)
    .gte("date", range.from)
    .lte("date", range.to)
    .order("date", { ascending: true });

  const list = ((bookings ?? []) as any[]).map((b) => {
    const gross = Number(b.total ?? 0);
    const isCompleted = b.status === "completed";
    const commission = isCompleted ? gross * rate : 0;
    const net = isCompleted ? gross - commission : 0;
    return {
      id: b.id as string,
      date: b.date as string,
      experience: b.experience as string,
      customer_name: b.customer_name as string,
      guests: Number(b.guests ?? 0),
      gross,
      commission,
      net,
      status: b.status as string,
    };
  });
  const completed = list.filter((x) => x.status === "completed");

  const summary = {
    totalBookings: list.length,
    completedBookings: completed.length,
    totalGuests: completed.reduce((s, x) => s + x.guests, 0),
    gross: completed.reduce((s, x) => s + x.gross, 0),
    commission: completed.reduce((s, x) => s + x.commission, 0),
    net: completed.reduce((s, x) => s + x.net, 0),
  };

  const { data: allPayouts } = await supabaseAdmin
    .from("payouts")
    .select("id, payout_number, amount, currency, method, status, paid_at, created_at")
    .eq("guide_id", args.guideId)
    .order("created_at", { ascending: false });
  const payouts = ((allPayouts ?? []) as any[]).filter((p) => {
    const refDate = (p.paid_at ?? p.created_at).slice(0, 10);
    return refDate >= range.from && refDate <= range.to;
  });

  let byMonth: ReportData["byMonth"] | undefined;
  if (args.kind === "annual") {
    const map = new Map<string, { gross: number; commission: number; net: number; count: number }>();
    for (let i = 0; i < 12; i++) {
      map.set(`${range.label}-${String(i + 1).padStart(2, "0")}`, { gross: 0, commission: 0, net: 0, count: 0 });
    }
    for (const x of completed) {
      const key = x.date.slice(0, 7);
      const cur = map.get(key);
      if (cur) {
        cur.gross += x.gross;
        cur.commission += x.commission;
        cur.net += x.net;
        cur.count += 1;
      }
    }
    byMonth = Array.from(map.entries()).map(([month, v]) => ({ month, ...v }));
  }

  return {
    guide: guide as any,
    commissionRate: rate,
    period: range,
    kind: args.kind,
    rows: list,
    summary,
    payouts: (payouts ?? []) as any[],
    byMonth,
  };
}

// ---------- CSV ----------
function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
export function buildReportCsv(d: ReportData): string {
  const lines: string[] = [];
  lines.push(`Hamroh Earnings Report`);
  lines.push(`Guide,${csvCell(d.guide.name)}`);
  lines.push(`Tax status,${csvCell(d.guide.tax_status)}`);
  lines.push(`Tax ID (INN),${csvCell(d.guide.tax_id ?? "")}`);
  lines.push(`Period,${csvCell(d.period.label)} (${d.period.from} — ${d.period.to})`);
  lines.push(`Commission rate,${(d.commissionRate * 100).toFixed(1)}%`);
  lines.push("");
  lines.push(`Summary`);
  lines.push(`Total bookings,${d.summary.totalBookings}`);
  lines.push(`Completed bookings,${d.summary.completedBookings}`);
  lines.push(`Total guests,${d.summary.totalGuests}`);
  lines.push(`Gross,${d.summary.gross.toFixed(2)}`);
  lines.push(`Hamroh commission,${d.summary.commission.toFixed(2)}`);
  lines.push(`Net (guide income),${d.summary.net.toFixed(2)}`);
  lines.push("");
  lines.push(`Transactions`);
  lines.push(`Booking ID,Date,Experience,Traveler,Guests,Gross,Hamroh Fee,Net,Status`);
  for (const r of d.rows) {
    lines.push(
      [
        r.id.slice(0, 8),
        r.date,
        csvCell(r.experience),
        csvCell(r.customer_name),
        r.guests,
        r.gross.toFixed(2),
        r.commission.toFixed(2),
        r.net.toFixed(2),
        r.status,
      ].join(","),
    );
  }
  if (d.payouts.length) {
    lines.push("");
    lines.push(`Payouts`);
    lines.push(`Payout #,Amount,Currency,Method,Status,Paid at,Created at`);
    for (const p of d.payouts) {
      lines.push(
        [
          p.payout_number,
          Number(p.amount).toFixed(2),
          p.currency,
          p.method,
          p.status,
          p.paid_at ?? "",
          p.created_at,
        ]
          .map(csvCell)
          .join(","),
      );
    }
  }
  // BOM for Excel
  return "\uFEFF" + lines.join("\r\n");
}

// ---------- PDF ----------
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MX = 40;
const MTOP = 50;
const MBOT = 50;
const COL_TXT = rgb(0.13, 0.13, 0.15);
const COL_MUTED = rgb(0.45, 0.45, 0.5);
const COL_PRIMARY = rgb(0.09, 0.4, 0.85);
const COL_BORDER = rgb(0.88, 0.88, 0.9);

let _fontCache: { regular: Uint8Array; bold: Uint8Array } | null = null;
async function loadFonts(origin: string) {
  if (_fontCache) return _fontCache;
  const [r, b] = await Promise.all([
    fetch(new URL(regularAsset.url, origin).toString()).then((x) => x.arrayBuffer()),
    fetch(new URL(boldAsset.url, origin).toString()).then((x) => x.arrayBuffer()),
  ]);
  _fontCache = { regular: new Uint8Array(r), bold: new Uint8Array(b) };
  return _fontCache;
}

interface Cur { page: PDFPage; y: number; doc: PDFDocument; reg: PDFFont; bold: PDFFont }

function ensure(c: Cur, need: number) {
  if (c.y - need < MBOT) {
    c.page = c.doc.addPage([PAGE_W, PAGE_H]);
    c.y = PAGE_H - MTOP;
  }
}
function text(c: Cur, t: string, opts: { size?: number; bold?: boolean; color?: any; x?: number } = {}) {
  const size = opts.size ?? 10;
  const font = opts.bold ? c.bold : c.reg;
  ensure(c, size + 3);
  c.page.drawText(t, { x: opts.x ?? MX, y: c.y - size, size, font, color: opts.color ?? COL_TXT });
  c.y -= size + 3;
}
function divider(c: Cur) {
  ensure(c, 12);
  c.y -= 4;
  c.page.drawLine({ start: { x: MX, y: c.y }, end: { x: PAGE_W - MX, y: c.y }, thickness: 0.5, color: COL_BORDER });
  c.y -= 8;
}
function row(c: Cur, label: string, value: string) {
  ensure(c, 14);
  c.page.drawText(label, { x: MX, y: c.y - 10, size: 9, font: c.bold, color: COL_MUTED });
  c.page.drawText(value, { x: MX + 160, y: c.y - 10, size: 10, font: c.reg, color: COL_TXT });
  c.y -= 14;
}
function fmtMoney(n: number) {
  return Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export async function buildReportPdf(d: ReportData, opts: { origin: string }): Promise<Uint8Array> {
  const { regular, bold } = await loadFonts(opts.origin);
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const reg = await doc.embedFont(regular, { subset: true });
  const fbold = await doc.embedFont(bold, { subset: true });
  doc.setTitle(`Hamroh — Earnings Report (${d.period.label})`);
  doc.setAuthor("Hamroh");

  const page = doc.addPage([PAGE_W, PAGE_H]);
  const c: Cur = { page, y: PAGE_H - MTOP, doc, reg, bold: fbold };

  // Header
  c.page.drawText("Hamroh", { x: MX, y: c.y - 22, size: 22, font: fbold, color: COL_PRIMARY });
  const kindLabel = d.kind === "annual" ? "Annual Report" : d.kind === "tax" ? "Tax Summary" : "Monthly Report";
  c.page.drawText(kindLabel, { x: MX, y: c.y - 40, size: 12, font: reg, color: COL_MUTED });
  c.page.drawText(d.period.label, {
    x: PAGE_W - MX - fbold.widthOfTextAtSize(d.period.label, 12),
    y: c.y - 22,
    size: 12,
    font: fbold,
    color: COL_TXT,
  });
  c.y -= 60;
  divider(c);

  // Guide info
  text(c, "Guide", { size: 12, bold: true });
  row(c, "Name", d.guide.name);
  row(c, "Tax status", d.guide.tax_status);
  row(c, "Tax ID (INN)", d.guide.tax_id ?? "—");
  row(c, "Period", `${d.period.from} — ${d.period.to}`);
  row(c, "Commission rate", `${(d.commissionRate * 100).toFixed(1)}%`);
  divider(c);

  // Summary
  text(c, "Summary", { size: 12, bold: true });
  row(c, "Completed bookings", String(d.summary.completedBookings));
  row(c, "Total guests", String(d.summary.totalGuests));
  row(c, "Gross revenue", `$${fmtMoney(d.summary.gross)}`);
  row(c, "Hamroh commission", `$${fmtMoney(d.summary.commission)}`);
  row(c, "Net (guide income)", `$${fmtMoney(d.summary.net)}`);
  divider(c);

  // Tax summary specific
  if (d.kind === "tax") {
    text(c, "Tax Summary (Uzbekistan)", { size: 12, bold: true });
    row(c, "Income received via Hamroh", `$${fmtMoney(d.summary.net)}`);
    row(c, "Number of payouts", String(d.payouts.filter((p) => p.status === "paid").length));
    const paid = d.payouts.filter((p) => p.status === "paid").reduce((s, p) => s + Number(p.amount), 0);
    row(c, "Total paid out", `$${fmtMoney(paid)}`);
    text(c, "Note: Hamroh does not calculate or withhold taxes. This document shows income received through the platform only.", {
      size: 9,
      color: COL_MUTED,
    });
    divider(c);
  }

  // By month for annual
  if (d.kind === "annual" && d.byMonth) {
    text(c, "Monthly breakdown", { size: 12, bold: true });
    const cols = [MX, MX + 110, MX + 200, MX + 300, MX + 410];
    ensure(c, 16);
    c.page.drawText("Month", { x: cols[0], y: c.y - 10, size: 9, font: fbold, color: COL_MUTED });
    c.page.drawText("Bookings", { x: cols[1], y: c.y - 10, size: 9, font: fbold, color: COL_MUTED });
    c.page.drawText("Gross", { x: cols[2], y: c.y - 10, size: 9, font: fbold, color: COL_MUTED });
    c.page.drawText("Commission", { x: cols[3], y: c.y - 10, size: 9, font: fbold, color: COL_MUTED });
    c.page.drawText("Net", { x: cols[4], y: c.y - 10, size: 9, font: fbold, color: COL_MUTED });
    c.y -= 14;
    for (const m of d.byMonth) {
      ensure(c, 14);
      c.page.drawText(m.month, { x: cols[0], y: c.y - 10, size: 9, font: reg, color: COL_TXT });
      c.page.drawText(String(m.count), { x: cols[1], y: c.y - 10, size: 9, font: reg, color: COL_TXT });
      c.page.drawText(`$${fmtMoney(m.gross)}`, { x: cols[2], y: c.y - 10, size: 9, font: reg, color: COL_TXT });
      c.page.drawText(`$${fmtMoney(m.commission)}`, { x: cols[3], y: c.y - 10, size: 9, font: reg, color: COL_TXT });
      c.page.drawText(`$${fmtMoney(m.net)}`, { x: cols[4], y: c.y - 10, size: 9, font: reg, color: COL_TXT });
      c.y -= 12;
    }
    divider(c);
  }

  // Transactions (skip for tax summary if huge — keep concise)
  if (d.kind !== "tax") {
    text(c, "Transactions", { size: 12, bold: true });
    const cols = [MX, MX + 60, MX + 170, MX + 290, MX + 360, MX + 420, MX + 490];
    ensure(c, 14);
    const head = (s: string, x: number) =>
      c.page.drawText(s, { x, y: c.y - 10, size: 8, font: fbold, color: COL_MUTED });
    head("Date", cols[0]);
    head("Experience", cols[1]);
    head("Traveler", cols[2]);
    head("Gst", cols[3]);
    head("Gross", cols[4]);
    head("Fee", cols[5]);
    head("Net", cols[6]);
    c.y -= 12;
    for (const r of d.rows) {
      ensure(c, 12);
      const cell = (s: string, x: number, w?: number) => {
        let str = s;
        if (w) {
          while (reg.widthOfTextAtSize(str, 8) > w && str.length > 4) str = str.slice(0, -2);
          if (str !== s) str = str.slice(0, -1) + "…";
        }
        c.page.drawText(str, { x, y: c.y - 8, size: 8, font: reg, color: COL_TXT });
      };
      cell(r.date, cols[0]);
      cell(r.experience, cols[1], 110);
      cell(r.customer_name, cols[2], 110);
      cell(String(r.guests), cols[3]);
      cell(`$${fmtMoney(r.gross)}`, cols[4]);
      cell(`$${fmtMoney(r.commission)}`, cols[5]);
      cell(`$${fmtMoney(r.net)}`, cols[6]);
      c.y -= 10;
    }
  }

  if (d.payouts.length) {
    divider(c);
    text(c, "Payouts", { size: 12, bold: true });
    for (const p of d.payouts) {
      ensure(c, 14);
      const line = `${p.payout_number} · $${fmtMoney(Number(p.amount))} ${p.currency} · ${p.method} · ${p.status}${p.paid_at ? " · " + p.paid_at.slice(0, 10) : ""}`;
      c.page.drawText(line, { x: MX, y: c.y - 10, size: 9, font: reg, color: COL_TXT });
      c.y -= 12;
    }
  }

  // Footer
  const pages = doc.getPages();
  const stamp = new Date().toISOString().slice(0, 19).replace("T", " ") + " UTC";
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    p.drawText(`hamrohim.com · generated ${stamp}`, { x: MX, y: 24, size: 8, font: reg, color: COL_MUTED });
    p.drawText(`${i + 1} / ${pages.length}`, {
      x: PAGE_W - MX - 30,
      y: 24,
      size: 8,
      font: reg,
      color: COL_MUTED,
    });
  }

  return await doc.save();
}

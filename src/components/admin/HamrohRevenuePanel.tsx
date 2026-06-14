import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, TrendingUp, Download, FileText } from "lucide-react";
import { adminGetHamrohRevenue } from "@/lib/earnings.functions";

function money(n: number) {
  return Math.round(Number(n)).toLocaleString("en-US") + " UZS";
}

type Revenue = Awaited<ReturnType<typeof adminGetHamrohRevenue>>;

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function buildCsv(d: Revenue): string {
  const periodLabel = `${d.month.year}-${String(d.month.month).padStart(2, "0")}`;
  const rows: string[][] = [
    ["Hamroh revenue", periodLabel],
    [],
    ["Section", "Metric", "Value (UZS)"],
    ["Totals", "Revenue", String(Math.round(d.totals.revenue))],
    ["Totals", "Paid to guides", String(Math.round(d.totals.payoutToGuide))],
    ["Totals", "Net profit", String(Math.round(d.totals.netProfit))],
    ["Totals", "Bookings", String(d.totals.bookings)],
    ["Totals", "Avg check", String(Math.round(d.totals.avgCheck))],
    ["Online", "Revenue", String(Math.round(d.online.revenue))],
    ["Online", "Payout to guides", String(Math.round(d.online.payoutToGuide))],
    ["Online", "Commission (profit)", String(Math.round(d.online.commission))],
    ["Online", "Bookings", String(d.online.count)],
    ["Cash", "Revenue", String(Math.round(d.cash.revenue))],
    ["Cash", "Commission", String(Math.round(d.cash.commission))],
    ["Cash", "Bookings", String(d.cash.count)],
    ["Statements", "Settled", String(d.statements.settled)],
    ["Statements", "Pending", String(d.statements.pending)],
    ["Statements", "Total", String(d.statements.total)],
    [],
    ["Last 12 months"],
    ["Period", "Revenue", "Payouts", "Net profit", "Bookings"],
    ...d.series.map((s) => [
      s.period,
      String(Math.round(s.revenue)),
      String(Math.round(s.payouts)),
      String(Math.round(s.profit)),
      String(s.count),
    ]),
  ];
  return rows
    .map((r) => r.map((c) => (c.includes(",") || c.includes('"') ? `"${c.replace(/"/g, '""')}"` : c)).join(","))
    .join("\n");
}

function printRevenuePdf(d: Revenue) {
  const periodLabel = `${d.month.year}-${String(d.month.month).padStart(2, "0")}`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Hamroh revenue ${periodLabel}</title>
<style>
body{font-family:system-ui,-apple-system,sans-serif;color:#111;padding:32px;max-width:800px;margin:0 auto}
h1{font-size:22px;margin:0 0 4px} .sub{color:#666;margin-bottom:24px}
.grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:24px}
.card{border:1px solid #ddd;border-radius:10px;padding:12px}
.card .l{font-size:11px;color:#666} .card .v{font-size:18px;font-weight:600;margin-top:4px}
.profit .v{color:#047857}
h2{font-size:14px;margin:24px 0 8px}
table{width:100%;border-collapse:collapse;font-size:12px}
th,td{padding:6px 8px;border-bottom:1px solid #eee;text-align:left}
th{color:#666;font-weight:500} td.r,th.r{text-align:right}
.foot{margin-top:32px;color:#888;font-size:11px}
@media print{body{padding:0}}
</style></head><body>
<h1>Hamroh revenue</h1><div class="sub">Period: ${periodLabel}</div>
<div class="grid">
  <div class="card"><div class="l">Revenue</div><div class="v">${money(d.totals.revenue)}</div></div>
  <div class="card"><div class="l">Paid to guides</div><div class="v">${money(d.totals.payoutToGuide)}</div></div>
  <div class="card profit"><div class="l">Net profit</div><div class="v">${money(d.totals.netProfit)}</div></div>
</div>
<h2>Breakdown</h2>
<table><tbody>
<tr><th>Online — revenue</th><td class="r">${money(d.online.revenue)}</td></tr>
<tr><th>Online — payout to guides</th><td class="r">− ${money(d.online.payoutToGuide)}</td></tr>
<tr><th>Online — commission (profit)</th><td class="r"><b>${money(d.online.commission)}</b></td></tr>
<tr><th>Online bookings</th><td class="r">${d.online.count}</td></tr>
<tr><th>Cash — revenue (guide collects)</th><td class="r">${money(d.cash.revenue)}</td></tr>
<tr><th>Cash — commission (profit)</th><td class="r"><b>${money(d.cash.commission)}</b></td></tr>
<tr><th>Cash bookings</th><td class="r">${d.cash.count}</td></tr>
<tr><th>Total bookings</th><td class="r">${d.totals.bookings}</td></tr>
<tr><th>Average check</th><td class="r">${money(d.totals.avgCheck)}</td></tr>
</tbody></table>
<h2>Statement settlement</h2>
<table><tbody>
<tr><th>Settled</th><td class="r">${d.statements.settled}</td></tr>
<tr><th>Pending</th><td class="r">${d.statements.pending}</td></tr>
<tr><th>Total</th><td class="r">${d.statements.total}</td></tr>
</tbody></table>
<h2>Last 12 months</h2>
<table>
<thead><tr><th>Period</th><th class="r">Revenue</th><th class="r">Payouts</th><th class="r">Net profit</th><th class="r">Bookings</th></tr></thead>
<tbody>
${d.series.map((s) => `<tr><td>${s.period}</td><td class="r">${money(s.revenue)}</td><td class="r">${money(s.payouts)}</td><td class="r"><b>${money(s.profit)}</b></td><td class="r">${s.count}</td></tr>`).join("")}
</tbody></table>
<div class="foot">Generated ${new Date().toLocaleString()} · Hamroh admin</div>
<script>window.onload=()=>{setTimeout(()=>window.print(),200)}</script>
</body></html>`;
  const w = window.open("", "_blank");
  if (!w) {
    toast.error("Pop-ups are blocked");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}


export function HamrohRevenuePanel({ period }: { period: string }) {
  const getFn = useServerFn(adminGetHamrohRevenue);
  const [year, month] = period.split("-").map(Number);
  const [data, setData] = useState<Revenue | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getFn({ data: { year, month } });
      setData(r as Revenue);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [getFn, year, month]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) {
    return (
      <div className="bg-background border border-border rounded-xl p-10 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!data) return null;

  const maxRev = Math.max(...data.series.map((s) => s.revenue), 1);

  return (
    <div className="space-y-5">
      <div className="flex justify-end gap-2">
        <button
          onClick={() => downloadFile(`hamroh-revenue-${data.month.year}-${String(data.month.month).padStart(2, "0")}.csv`, buildCsv(data), "text/csv")}
          className="h-9 px-3 inline-flex items-center gap-1 rounded-full bg-secondary text-sm font-medium"
        >
          <Download className="h-4 w-4" /> CSV
        </button>
        <button
          onClick={() => printRevenuePdf(data)}
          className="h-9 px-3 inline-flex items-center gap-1 rounded-full bg-secondary text-sm font-medium"
        >
          <FileText className="h-4 w-4" /> PDF
        </button>
      </div>
      {/* Headline */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-background border border-border rounded-xl p-4">
          <div className="text-xs text-muted-foreground">Revenue (bookings total)</div>
          <div className="text-2xl font-semibold mt-1">{money(data.totals.revenue)}</div>
          <div className="text-xs text-muted-foreground mt-1">{data.totals.bookings} bookings · avg {money(data.totals.avgCheck)}</div>
        </div>
        <div className="bg-background border border-border rounded-xl p-4">
          <div className="text-xs text-muted-foreground">Paid to guides (online)</div>
          <div className="text-2xl font-semibold mt-1">{money(data.totals.payoutToGuide)}</div>
          <div className="text-xs text-muted-foreground mt-1">{data.online.count} online bookings</div>
        </div>
        <div className="bg-background border border-border rounded-xl p-4 bg-gradient-to-br from-emerald-50 to-background">
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> Hamroh net profit
          </div>
          <div className="text-2xl font-semibold mt-1 text-emerald-700">{money(data.totals.netProfit)}</div>
          <div className="text-xs text-muted-foreground mt-1">
            online {money(data.online.commission)} · cash {money(data.cash.commission)}
          </div>
        </div>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-background border border-border rounded-xl p-4">
          <div className="text-sm font-medium mb-3">Online bookings</div>
          <div className="space-y-1 text-sm">
            <Row label="Revenue" value={money(data.online.revenue)} />
            <Row label="Payout to guides" value={`− ${money(data.online.payoutToGuide)}`} />
            <Row label="Commission (profit)" value={money(data.online.commission)} bold />
            <Row label="Bookings" value={String(data.online.count)} muted />
          </div>
        </div>
        <div className="bg-background border border-border rounded-xl p-4">
          <div className="text-sm font-medium mb-3">Cash bookings</div>
          <div className="space-y-1 text-sm">
            <Row label="Revenue (guide collects)" value={money(data.cash.revenue)} muted />
            <Row label="Our commission" value={money(data.cash.commission)} bold />
            <Row label="Bookings" value={String(data.cash.count)} muted />
          </div>
        </div>
      </div>

      {/* Statement settlement */}
      <div className="bg-background border border-border rounded-xl p-4">
        <div className="text-sm font-medium mb-2">Statement settlement</div>
        <div className="flex gap-4 text-sm">
          <span>Settled: <b>{data.statements.settled}</b></span>
          <span className="text-muted-foreground">·</span>
          <span>Pending: <b>{data.statements.pending}</b></span>
          <span className="text-muted-foreground">·</span>
          <span>Total: <b>{data.statements.total}</b></span>
        </div>
      </div>

      {/* 12-month chart */}
      <div className="bg-background border border-border rounded-xl p-4">
        <div className="text-sm font-medium mb-3">Last 12 months</div>
        <div className="flex items-end gap-2 h-40">
          {data.series.map((s) => {
            const h = (s.revenue / maxRev) * 100;
            const profitH = s.revenue > 0 ? (s.profit / s.revenue) * h : 0;
            return (
              <div key={s.period} className="flex-1 flex flex-col items-center gap-1 group">
                <div className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100">
                  {money(s.profit)}
                </div>
                <div className="w-full h-full flex flex-col justify-end relative">
                  <div className="w-full bg-muted rounded-t-sm" style={{ height: `${h}%` }} />
                  <div
                    className="w-full bg-emerald-500 rounded-t-sm absolute bottom-0"
                    style={{ height: `${profitH}%` }}
                  />
                </div>
                <div className="text-[10px] text-muted-foreground">{s.period.slice(5)}</div>
              </div>
            );
          })}
        </div>
        <div className="flex gap-3 text-xs text-muted-foreground mt-2">
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-muted rounded-sm" /> Revenue</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500 rounded-sm" /> Net profit</span>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold, muted }: { label: string; value: string; bold?: boolean; muted?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className={muted ? "text-muted-foreground" : ""}>{label}</span>
      <span className={bold ? "font-semibold" : muted ? "text-muted-foreground" : ""}>{value}</span>
    </div>
  );
}

import { useEffect, useState, useCallback, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Download, FileText, Wallet, ReceiptText, CalendarRange, Scale } from "lucide-react";
import {
  getMyEarningsSummary,
  listMyTransactions,
  listMyPayouts,
  listMyStatements,
  getMyReportUrls,
} from "@/lib/earnings.functions";
import { useGuideI18n } from "@/lib/guide-i18n";

type Period = "today" | "week" | "month" | "year" | "custom";
type SubTab = "overview" | "transactions" | "payouts" | "statements" | "reports";

function money(n: number) {
  return "$" + Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export function EarningsPanel() {
  const { tg, lang } = useGuideI18n();
  const fetchSummary = useServerFn(getMyEarningsSummary);
  const fetchTx = useServerFn(listMyTransactions);
  const fetchPayouts = useServerFn(listMyPayouts);
  const fetchStatements = useServerFn(listMyStatements);
  const fetchReportUrls = useServerFn(getMyReportUrls);

  const [sub, setSub] = useState<SubTab>("overview");
  const [period, setPeriod] = useState<Period>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [summary, setSummary] = useState<any>(null);
  const [tx, setTx] = useState<any>(null);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [statements, setStatements] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("");

  const today = new Date();
  const ymNow = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const [reportMonth, setReportMonth] = useState(ymNow);
  const [reportYear, setReportYear] = useState(String(today.getFullYear()));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const args: any = { period };
      if (period === "custom" && customFrom && customTo) {
        args.from = customFrom;
        args.to = customTo;
      }
      const s = await fetchSummary({ data: args });
      setSummary(s);
      const t = await fetchTx({
        data: {
          from: (s as any).period.from,
          to: (s as any).period.to,
          ...(statusFilter ? { status: statusFilter } : {}),
        },
      });
      setTx(t);
      const p = await fetchPayouts();
      setPayouts(p as any[]);
      const st = await fetchStatements();
      setStatements(st as any[]);
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setLoading(false);
    }
  }, [fetchSummary, fetchTx, fetchPayouts, fetchStatements, period, customFrom, customTo, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function openReport(kind: "monthly" | "annual" | "tax", format: "pdf" | "csv") {
    try {
      const periodStr = kind === "annual" ? reportYear : reportMonth;
      const r = await fetchReportUrls({ data: { kind, period: periodStr } });
      const url = format === "pdf" ? (r as any).pdfUrl : (r as any).csvUrl;
      window.open(url, "_blank");
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    }
  }

  const rate = summary?.commissionRate ?? 0.15;

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="flex gap-2 flex-wrap">
        {([
          ["overview", tg("earn.overview"), <Wallet key="i1" className="h-4 w-4" />],
          ["transactions", tg("earn.transactions"), <ReceiptText key="i2" className="h-4 w-4" />],
          ["statements", tg("earn.statements"), <Scale key="i3" className="h-4 w-4" />],
          ["payouts", tg("earn.payouts"), <CalendarRange key="i4" className="h-4 w-4" />],
          ["reports", tg("earn.reports"), <FileText key="i5" className="h-4 w-4" />],
        ] as const).map(([k, label, icon]) => (
          <button
            key={k}
            onClick={() => setSub(k as SubTab)}
            className={`inline-flex items-center gap-2 px-4 h-9 rounded-full text-sm font-medium ${
              sub === k ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {sub === "overview" && (
        <div className="space-y-6">
          {/* KPI cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi title={tg("earn.kpi.month")} value={money(summary?.kpi?.monthTotalEarnings ?? 0)} subtitle={tg("earn.kpi.thisMonth")} />
            <Kpi title={tg("earn.kpi.pending")} value={money(summary?.kpi?.pendingPayout ?? 0)} />
            <Kpi title={tg("earn.kpi.paid")} value={money(summary?.kpi?.paidOut ?? 0)} />
            <Kpi title={tg("earn.kpi.completed")} value={String(summary?.kpi?.completedExperiences ?? 0)} subtitle={tg("earn.kpi.thisMonth")} />
          </div>

          {/* Period selector */}
          <div className="bg-background border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-semibold">{tg("earn.statsTitle")}</h3>
              <div className="flex gap-1 flex-wrap">
                {(["today", "week", "month", "year", "custom"] as Period[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-3 h-8 rounded-full text-xs font-medium ${period === p ? "bg-foreground text-background" : "bg-muted text-muted-foreground"}`}
                  >
                    {tg(`earn.period.${p}` as any)}
                  </button>
                ))}
              </div>
            </div>
            {period === "custom" && (
              <div className="flex gap-2 items-end flex-wrap">
                <label className="text-xs flex flex-col gap-1">
                  <span className="text-muted-foreground">{tg("earn.from")}</span>
                  <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="h-9 px-2 rounded-md border border-border bg-background" />
                </label>
                <label className="text-xs flex flex-col gap-1">
                  <span className="text-muted-foreground">{tg("earn.to")}</span>
                  <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="h-9 px-2 rounded-md border border-border bg-background" />
                </label>
                <button onClick={load} className="h-9 px-4 rounded-full bg-primary text-primary-foreground text-sm font-medium">{tg("earn.apply")}</button>
              </div>
            )}

            {loading && !summary ? (
              <div className="py-6 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline" /></div>
            ) : (
              <div className="grid sm:grid-cols-4 gap-3 pt-2">
                <Stat label={tg("earn.stat.gross")} value={money(summary?.stats?.gross ?? 0)} />
                <Stat label={tg("earn.stat.commission")} value={money(summary?.stats?.commission ?? 0)} hint={`${(rate * 100).toFixed(1)}%`} />
                <Stat label={tg("earn.stat.net")} value={money(summary?.stats?.net ?? 0)} highlight />
                <Stat label={tg("earn.stat.avg")} value={money(summary?.stats?.avgBookingValue ?? 0)} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Transactions */}
      {sub === "transactions" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-3 rounded-md border border-border bg-background text-sm"
            >
              <option value="">{tg("earn.tx.allStatuses")}</option>
              <option value="pending">{tg("earn.tx.s.pending")}</option>
              <option value="confirmed">{tg("earn.tx.s.confirmed")}</option>
              <option value="completed">{tg("earn.tx.s.completed")}</option>
              <option value="cancelled">{tg("earn.tx.s.cancelled")}</option>
              <option value="declined">{tg("earn.tx.s.declined")}</option>
            </select>
          </div>
          <div className="overflow-x-auto bg-background border border-border rounded-xl">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b border-border">
                <tr>
                  <th className="text-left p-3">{tg("earn.tx.id")}</th>
                  <th className="text-left p-3">{tg("earn.tx.date")}</th>
                  <th className="text-left p-3">{tg("earn.tx.experience")}</th>
                  <th className="text-left p-3">{tg("earn.tx.traveler")}</th>
                  <th className="text-right p-3">{tg("earn.tx.guests")}</th>
                  <th className="text-right p-3">{tg("earn.tx.gross")}</th>
                  <th className="text-right p-3">{tg("earn.tx.fee")}</th>
                  <th className="text-right p-3">{tg("earn.tx.net")}</th>
                  <th className="text-left p-3">{tg("earn.tx.status")}</th>
                </tr>
              </thead>
              <tbody>
                {(tx?.rows ?? []).length === 0 && (
                  <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">{tg("earn.tx.empty")}</td></tr>
                )}
                {(tx?.rows ?? []).map((r: any) => (
                  <tr key={r.id} className="border-b border-border/40">
                    <td className="p-3 font-mono text-xs">{r.id.slice(0, 8)}</td>
                    <td className="p-3 whitespace-nowrap">{r.date}</td>
                    <td className="p-3">{r.experience}</td>
                    <td className="p-3">{r.customer_name}</td>
                    <td className="p-3 text-right">{r.guests}</td>
                    <td className="p-3 text-right">{money(r.gross)}</td>
                    <td className="p-3 text-right text-muted-foreground">{money(r.fee)}</td>
                    <td className="p-3 text-right font-semibold">{money(r.net)}</td>
                    <td className="p-3"><StatusPill status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payouts */}
      {sub === "payouts" && (
        <div className="overflow-x-auto bg-background border border-border rounded-xl">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground border-b border-border">
              <tr>
                <th className="text-left p-3">{tg("earn.po.number")}</th>
                <th className="text-left p-3">{tg("earn.po.date")}</th>
                <th className="text-right p-3">{tg("earn.po.amount")}</th>
                <th className="text-left p-3">{tg("earn.po.method")}</th>
                <th className="text-left p-3">{tg("earn.po.status")}</th>
                <th className="text-left p-3">{tg("earn.po.ref")}</th>
              </tr>
            </thead>
            <tbody>
              {payouts.length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">{tg("earn.po.empty")}</td></tr>
              )}
              {payouts.map((p) => (
                <tr key={p.id} className="border-b border-border/40">
                  <td className="p-3 font-mono text-xs">{p.payout_number}</td>
                  <td className="p-3 whitespace-nowrap">{(p.paid_at ?? p.created_at).slice(0, 10)}</td>
                  <td className="p-3 text-right font-semibold">{money(Number(p.amount))} {p.currency}</td>
                  <td className="p-3">{p.method}</td>
                  <td className="p-3"><PayoutStatusPill status={p.status} /></td>
                  <td className="p-3 text-muted-foreground">{p.reference ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reports */}
      {sub === "reports" && (
        <div className="space-y-4">
          <div className="bg-background border border-border rounded-xl p-4 space-y-3">
            <h3 className="font-semibold">{tg("earn.reports.monthly")}</h3>
            <div className="flex gap-2 items-end flex-wrap">
              <label className="text-xs flex flex-col gap-1">
                <span className="text-muted-foreground">{tg("earn.reports.pickMonth")}</span>
                <input type="month" value={reportMonth} onChange={(e) => setReportMonth(e.target.value)} className="h-9 px-2 rounded-md border border-border bg-background" />
              </label>
              <button onClick={() => openReport("monthly", "pdf")} className="h-9 px-4 inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                <Download className="h-4 w-4" /> PDF
              </button>
              <button onClick={() => openReport("monthly", "csv")} className="h-9 px-4 inline-flex items-center gap-2 rounded-full bg-secondary text-sm font-medium">
                <Download className="h-4 w-4" /> CSV
              </button>
            </div>
          </div>

          <div className="bg-background border border-border rounded-xl p-4 space-y-3">
            <h3 className="font-semibold">{tg("earn.reports.annual")}</h3>
            <div className="flex gap-2 items-end flex-wrap">
              <label className="text-xs flex flex-col gap-1">
                <span className="text-muted-foreground">{tg("earn.reports.pickYear")}</span>
                <input type="number" min={2020} max={2100} value={reportYear} onChange={(e) => setReportYear(e.target.value)} className="h-9 px-2 rounded-md border border-border bg-background w-28" />
              </label>
              <button onClick={() => openReport("annual", "pdf")} className="h-9 px-4 inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                <Download className="h-4 w-4" /> PDF
              </button>
              <button onClick={() => openReport("annual", "csv")} className="h-9 px-4 inline-flex items-center gap-2 rounded-full bg-secondary text-sm font-medium">
                <Download className="h-4 w-4" /> CSV
              </button>
            </div>
          </div>

          <div className="bg-background border border-border rounded-xl p-4 space-y-3">
            <h3 className="font-semibold">{tg("earn.reports.tax")}</h3>
            <p className="text-xs text-muted-foreground">{tg("earn.reports.taxHint")}</p>
            <div className="flex gap-2 items-end flex-wrap">
              <label className="text-xs flex flex-col gap-1">
                <span className="text-muted-foreground">{tg("earn.reports.pickMonth")}</span>
                <input type="month" value={reportMonth} onChange={(e) => setReportMonth(e.target.value)} className="h-9 px-2 rounded-md border border-border bg-background" />
              </label>
              <button onClick={() => openReport("tax", "pdf")} className="h-9 px-4 inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                <Download className="h-4 w-4" /> PDF
              </button>
              <button onClick={() => openReport("tax", "csv")} className="h-9 px-4 inline-flex items-center gap-2 rounded-full bg-secondary text-sm font-medium">
                <Download className="h-4 w-4" /> CSV
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ title, value, subtitle }: { title: string; value: string; subtitle?: string }) {
  return (
    <div className="bg-background border border-border rounded-xl p-4">
      <div className="text-xs text-muted-foreground uppercase tracking-wider">{title}</div>
      <div className="font-display text-2xl font-semibold mt-1">{value}</div>
      {subtitle && <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>}
    </div>
  );
}

function Stat({ label, value, hint, highlight }: { label: string; value: string; hint?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg p-3 ${highlight ? "bg-primary/10 border border-primary/20" : "bg-muted/50"}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-lg font-semibold mt-0.5 ${highlight ? "text-primary" : ""}`}>{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const color =
    status === "completed" ? "bg-emerald-100 text-emerald-700" :
    status === "confirmed" ? "bg-blue-100 text-blue-700" :
    status === "pending" ? "bg-amber-100 text-amber-700" :
    status === "cancelled" || status === "declined" ? "bg-red-100 text-red-700" :
    "bg-muted text-muted-foreground";
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${color}`}>{status}</span>;
}

function PayoutStatusPill({ status }: { status: string }) {
  const color =
    status === "paid" ? "bg-emerald-100 text-emerald-700" :
    status === "processing" ? "bg-blue-100 text-blue-700" :
    status === "scheduled" ? "bg-amber-100 text-amber-700" :
    status === "failed" ? "bg-red-100 text-red-700" :
    "bg-muted text-muted-foreground";
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${color}`}>{status}</span>;
}

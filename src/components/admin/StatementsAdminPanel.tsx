import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Play, Send, CheckCircle2 } from "lucide-react";
import {
  adminGenerateStatements,
  adminListStatements,
  adminSettleStatement,
} from "@/lib/earnings.functions";

function money(n: number) {
  return Math.round(Number(n)).toLocaleString("en-US") + " UZS";
}

type Statement = {
  id: string;
  statement_number: string;
  guide_id: string;
  period_year: number;
  period_month: number;
  online_revenue: number;
  online_payout_to_guide: number;
  online_bookings_count: number;
  cash_revenue: number;
  cash_commission_to_us: number;
  cash_bookings_count: number;
  net_amount: number;
  direction: "payout" | "invoice" | "zero";
  status: "pending" | "settled" | "rolled_over" | "cancelled";
  due_date: string | null;
  settled_at: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  notes: string | null;
  guides: { name: string } | null;
};

export function StatementsAdminPanel() {
  const listFn = useServerFn(adminListStatements);
  const genFn = useServerFn(adminGenerateStatements);
  const settleFn = useServerFn(adminSettleStatement);

  const today = new Date();
  // default to previous month
  const defaultDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const [period, setPeriod] = useState(
    `${defaultDate.getFullYear()}-${String(defaultDate.getMonth() + 1).padStart(2, "0")}`,
  );
  const [rows, setRows] = useState<Statement[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const [year, month] = period.split("-").map(Number);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await listFn({ data: { year, month } });
      setRows(r as Statement[]);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [listFn, year, month]);

  useEffect(() => {
    load();
  }, [load]);

  async function generate(notify: boolean) {
    setBusy(true);
    try {
      const r = (await genFn({ data: { year, month, notify } })) as any;
      toast.success(
        `Generated ${r.count} statement${r.count === 1 ? "" : "s"}${notify ? ` · notified ${r.notified}` : ""}`,
      );
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function settle(s: Statement) {
    const ref = prompt("Payment reference (optional)") ?? "";
    try {
      await settleFn({
        data: {
          statementId: s.id,
          status: "settled",
          payment_method: "bank",
          payment_reference: ref || undefined,
        },
      });
      toast.success("Marked settled");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  const totals = rows.reduce(
    (acc, r) => {
      if (r.direction === "payout") acc.payouts += Number(r.net_amount);
      else if (r.direction === "invoice") acc.invoices += Math.abs(Number(r.net_amount));
      return acc;
    },
    { payouts: 0, invoices: 0 },
  );

  return (
    <div className="space-y-5">
      <div className="bg-background border border-border rounded-xl p-4 flex flex-wrap items-end gap-3">
        <div>
          <div className="text-xs text-muted-foreground mb-1">Period</div>
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="h-9 px-2 rounded-md border border-border bg-background"
          />
        </div>
        <button
          onClick={() => generate(false)}
          disabled={busy}
          className="h-9 px-4 inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          Generate
        </button>
        <button
          onClick={() => generate(true)}
          disabled={busy}
          className="h-9 px-4 inline-flex items-center gap-1 rounded-full bg-secondary text-sm font-medium disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          Generate + notify
        </button>
        <div className="ml-auto text-xs text-muted-foreground space-x-3">
          <span>Payouts: <b className="text-foreground">{money(totals.payouts)}</b></span>
          <span>Invoices: <b className="text-foreground">{money(totals.invoices)}</b></span>
        </div>
      </div>

      <div className="overflow-x-auto bg-background border border-border rounded-xl">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground border-b border-border">
            <tr>
              <th className="text-left p-3">#</th>
              <th className="text-left p-3">Guide</th>
              <th className="text-right p-3">Online → guide</th>
              <th className="text-right p-3">Cash commission</th>
              <th className="text-right p-3">Net</th>
              <th className="text-left p-3">Direction</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Due</th>
              <th className="text-left p-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={9} className="p-6 text-center text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin inline" />
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={9} className="p-6 text-center text-muted-foreground">
                  No statements for this period. Click <b>Generate</b>.
                </td>
              </tr>
            )}
            {rows.map((s) => (
              <tr key={s.id} className="border-b border-border/40">
                <td className="p-3 font-mono text-xs">{s.statement_number}</td>
                <td className="p-3 font-medium">{s.guides?.name ?? "—"}</td>
                <td className="p-3 text-right text-emerald-700">
                  {money(s.online_payout_to_guide)}
                  <div className="text-xs text-muted-foreground">{s.online_bookings_count} bk</div>
                </td>
                <td className="p-3 text-right text-amber-700">
                  {money(s.cash_commission_to_us)}
                  <div className="text-xs text-muted-foreground">{s.cash_bookings_count} bk</div>
                </td>
                <td className="p-3 text-right font-semibold">
                  {s.direction === "invoice" ? "−" : ""}
                  {money(Math.abs(Number(s.net_amount)))}
                </td>
                <td className="p-3">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      s.direction === "payout"
                        ? "bg-emerald-100 text-emerald-800"
                        : s.direction === "invoice"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {s.direction}
                  </span>
                </td>
                <td className="p-3">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      s.status === "settled"
                        ? "bg-emerald-100 text-emerald-800"
                        : s.status === "cancelled"
                          ? "bg-muted text-muted-foreground"
                          : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {s.status}
                  </span>
                </td>
                <td className="p-3 text-xs text-muted-foreground">{s.due_date ?? "—"}</td>
                <td className="p-3">
                  {s.status !== "settled" && s.direction !== "zero" && (
                    <button
                      onClick={() => settle(s)}
                      className="px-3 h-8 inline-flex items-center gap-1 rounded-full bg-secondary text-xs font-medium"
                    >
                      <CheckCircle2 className="h-3 w-3" /> Settle
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Statements auto-generate on the 1st of each month at 02:00 (UTC) for the previous month
        and guides receive a Telegram notification. You can re-run safely — it's idempotent.
      </p>
    </div>
  );
}

import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Download, Loader2, Plus, Trash2, FileText } from "lucide-react";
import {
  adminListGuideEarnings,
  adminListGuidePayouts,
  adminCreatePayout,
  adminUpdatePayoutStatus,
  adminDeletePayout,
  adminGetGuideReportUrls,
  adminGetCommissionRate,
  adminSetCommissionRate,
} from "@/lib/earnings.functions";

function money(n: number) {
  return "$" + Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export function EarningsAdminPanel() {
  const listFn = useServerFn(adminListGuideEarnings);
  const getRateFn = useServerFn(adminGetCommissionRate);
  const setRateFn = useServerFn(adminSetCommissionRate);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [openGuideId, setOpenGuideId] = useState<string | null>(null);
  const [ratePct, setRatePct] = useState("15");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, r] = await Promise.all([listFn(), getRateFn()]);
      setData(d);
      setRatePct(String(((r as any).rate * 100).toFixed(2)));
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [listFn, getRateFn]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveRate() {
    const n = Number(ratePct) / 100;
    if (!Number.isFinite(n) || n < 0 || n >= 0.9) {
      toast.error("Invalid rate");
      return;
    }
    try {
      await setRateFn({ data: { rate: n } });
      toast.success("Commission rate updated");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  if (loading) return <div className="py-10 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline" /></div>;

  return (
    <div className="space-y-6">
      <div className="bg-background border border-border rounded-xl p-4 flex items-end gap-3 flex-wrap">
        <div>
          <div className="text-xs text-muted-foreground">Hamroh commission rate</div>
          <div className="flex items-center gap-2 mt-1">
            <input
              type="number"
              min={0}
              max={90}
              step={0.1}
              value={ratePct}
              onChange={(e) => setRatePct(e.target.value)}
              className="h-9 w-24 px-2 rounded-md border border-border bg-background"
            />
            <span>%</span>
            <button onClick={saveRate} className="h-9 px-4 rounded-full bg-primary text-primary-foreground text-sm font-medium">Save</button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto bg-background border border-border rounded-xl">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground border-b border-border">
            <tr>
              <th className="text-left p-3">Guide</th>
              <th className="text-left p-3">Tax status</th>
              <th className="text-left p-3">INN</th>
              <th className="text-right p-3">Gross</th>
              <th className="text-right p-3">Net</th>
              <th className="text-right p-3">Paid out</th>
              <th className="text-right p-3">Pending</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(data?.guides ?? []).map((g: any) => (
              <tr key={g.id} className="border-b border-border/40">
                <td className="p-3 font-medium">{g.name}</td>
                <td className="p-3 text-muted-foreground">{g.tax_status}</td>
                <td className="p-3 font-mono text-xs">{g.tax_id ?? "—"}</td>
                <td className="p-3 text-right">{money(g.gross)}</td>
                <td className="p-3 text-right font-semibold">{money(g.net)}</td>
                <td className="p-3 text-right">{money(g.paid)}</td>
                <td className="p-3 text-right text-amber-700">{money(g.pending)}</td>
                <td className="p-3">
                  <button
                    onClick={() => setOpenGuideId(g.id === openGuideId ? null : g.id)}
                    className="px-3 h-8 rounded-full bg-secondary text-xs font-medium"
                  >
                    {openGuideId === g.id ? "Close" : "Open"}
                  </button>
                </td>
              </tr>
            ))}
            {(data?.guides ?? []).length === 0 && (
              <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">No guides</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {openGuideId && (
        <GuideEarningsDetail
          guide={(data?.guides ?? []).find((x: any) => x.id === openGuideId)}
          onChanged={load}
        />
      )}
    </div>
  );
}

function GuideEarningsDetail({ guide, onChanged }: { guide: any; onChanged: () => void }) {
  const listPayoutsFn = useServerFn(adminListGuidePayouts);
  const createPayoutFn = useServerFn(adminCreatePayout);
  const updateStatusFn = useServerFn(adminUpdatePayoutStatus);
  const deletePayoutFn = useServerFn(adminDeletePayout);
  const reportUrlsFn = useServerFn(adminGetGuideReportUrls);

  const [payouts, setPayouts] = useState<any[]>([]);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"bank" | "click" | "payme" | "cash" | "other">("bank");
  const [status, setStatus] = useState<"scheduled" | "processing" | "paid" | "failed">("paid");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const today = new Date();
  const [reportMonth, setReportMonth] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`);
  const [reportYear, setReportYear] = useState(String(today.getFullYear()));

  const load = useCallback(async () => {
    try {
      const r = await listPayoutsFn({ data: { guideId: guide.id } });
      setPayouts(r as any[]);
    } catch (e: any) {
      toast.error(e.message);
    }
  }, [listPayoutsFn, guide.id]);

  useEffect(() => { load(); }, [load]);

  async function createPayout() {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      toast.error("Invalid amount");
      return;
    }
    try {
      await createPayoutFn({ data: { guideId: guide.id, amount: n, method, status, reference: reference || undefined, notes: notes || undefined } });
      toast.success("Payout created");
      setAmount("");
      setReference("");
      setNotes("");
      load();
      onChanged();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function openReport(kind: "monthly" | "annual" | "tax", format: "pdf" | "csv") {
    try {
      const period = kind === "annual" ? reportYear : reportMonth;
      const r = await reportUrlsFn({ data: { guideId: guide.id, kind, period } });
      window.open(format === "pdf" ? (r as any).pdfUrl : (r as any).csvUrl, "_blank");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="bg-background border border-border rounded-xl p-4 space-y-5">
      <h3 className="font-semibold">{guide.name}</h3>

      <div className="space-y-2">
        <h4 className="text-sm font-medium">Reports</h4>
        <div className="flex flex-wrap gap-2 items-end">
          <input type="month" value={reportMonth} onChange={(e) => setReportMonth(e.target.value)} className="h-9 px-2 rounded-md border border-border bg-background" />
          <button onClick={() => openReport("monthly", "pdf")} className="h-9 px-3 inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground text-xs font-medium"><FileText className="h-3 w-3" /> Monthly PDF</button>
          <button onClick={() => openReport("monthly", "csv")} className="h-9 px-3 inline-flex items-center gap-1 rounded-full bg-secondary text-xs font-medium"><Download className="h-3 w-3" /> CSV</button>
          <button onClick={() => openReport("tax", "pdf")} className="h-9 px-3 inline-flex items-center gap-1 rounded-full bg-secondary text-xs font-medium"><FileText className="h-3 w-3" /> Tax PDF</button>
        </div>
        <div className="flex flex-wrap gap-2 items-end">
          <input type="number" value={reportYear} onChange={(e) => setReportYear(e.target.value)} className="h-9 w-24 px-2 rounded-md border border-border bg-background" />
          <button onClick={() => openReport("annual", "pdf")} className="h-9 px-3 inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground text-xs font-medium"><FileText className="h-3 w-3" /> Annual PDF</button>
          <button onClick={() => openReport("annual", "csv")} className="h-9 px-3 inline-flex items-center gap-1 rounded-full bg-secondary text-xs font-medium"><Download className="h-3 w-3" /> CSV</button>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-medium">Create payout</h4>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <input type="number" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-9 px-2 rounded-md border border-border bg-background" />
          <select value={method} onChange={(e) => setMethod(e.target.value as any)} className="h-9 px-2 rounded-md border border-border bg-background">
            <option value="bank">Bank</option>
            <option value="click">Click</option>
            <option value="payme">Payme</option>
            <option value="cash">Cash</option>
            <option value="other">Other</option>
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="h-9 px-2 rounded-md border border-border bg-background">
            <option value="scheduled">Scheduled</option>
            <option value="processing">Processing</option>
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
          </select>
          <input placeholder="Reference" value={reference} onChange={(e) => setReference(e.target.value)} className="h-9 px-2 rounded-md border border-border bg-background sm:col-span-2" />
        </div>
        <input placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="h-9 px-2 rounded-md border border-border bg-background w-full" />
        <button onClick={createPayout} className="h-9 px-4 inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground text-sm font-medium"><Plus className="h-4 w-4" /> Create</button>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-medium">Payouts</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="text-left p-2">#</th>
                <th className="text-right p-2">Amount</th>
                <th className="text-left p-2">Method</th>
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">Date</th>
                <th className="text-left p-2">Reference</th>
                <th className="text-left p-2"></th>
              </tr>
            </thead>
            <tbody>
              {payouts.length === 0 && (
                <tr><td colSpan={7} className="p-3 text-center text-muted-foreground">No payouts</td></tr>
              )}
              {payouts.map((p) => (
                <tr key={p.id} className="border-t border-border/40">
                  <td className="p-2 font-mono text-xs">{p.payout_number}</td>
                  <td className="p-2 text-right font-semibold">{money(Number(p.amount))} {p.currency}</td>
                  <td className="p-2">{p.method}</td>
                  <td className="p-2">
                    <select
                      value={p.status}
                      onChange={async (e) => {
                        try {
                          await updateStatusFn({ data: { payoutId: p.id, status: e.target.value as any } });
                          load();
                          onChanged();
                        } catch (er: any) { toast.error(er.message); }
                      }}
                      className="h-7 px-2 rounded border border-border bg-background text-xs"
                    >
                      <option value="scheduled">scheduled</option>
                      <option value="processing">processing</option>
                      <option value="paid">paid</option>
                      <option value="failed">failed</option>
                    </select>
                  </td>
                  <td className="p-2">{(p.paid_at ?? p.created_at).slice(0, 10)}</td>
                  <td className="p-2 text-muted-foreground">{p.reference ?? "—"}</td>
                  <td className="p-2">
                    <button
                      onClick={async () => {
                        if (!confirm("Delete payout?")) return;
                        try {
                          await deletePayoutFn({ data: { payoutId: p.id } });
                          load();
                          onChanged();
                        } catch (er: any) { toast.error(er.message); }
                      }}
                      className="p-1 text-red-600"
                    ><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

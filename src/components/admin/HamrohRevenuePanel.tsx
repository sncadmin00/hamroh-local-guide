import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, TrendingUp } from "lucide-react";
import { adminGetHamrohRevenue } from "@/lib/earnings.functions";

function money(n: number) {
  return Math.round(Number(n)).toLocaleString("en-US") + " UZS";
}

type Revenue = Awaited<ReturnType<typeof adminGetHamrohRevenue>>;

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

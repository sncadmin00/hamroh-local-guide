import { useMemo, useState } from "react";
import { Calculator, Users } from "lucide-react";
import { useI18n } from "@/lib/i18n";

type Cat = { key: string; label: string; perDay: number };

export function BudgetCalculator() {
  const { t } = useI18n();
  const [days, setDays] = useState(5);
  const [travelers, setTravelers] = useState(2);
  const [items, setItems] = useState<Record<string, number>>({
    stay: 40, food: 25, transport: 15, guide: 60, activities: 20,
  });

  const cats: Cat[] = [
    { key: "stay", label: t("budget.stay") || "Stay", perDay: items.stay },
    { key: "food", label: t("budget.food") || "Food", perDay: items.food },
    { key: "transport", label: t("budget.transport") || "Transport", perDay: items.transport },
    { key: "guide", label: t("budget.guide") || "Guide", perDay: items.guide },
    { key: "activities", label: t("budget.activities") || "Activities", perDay: items.activities },
  ];

  const total = useMemo(() => {
    const perDayPerPerson = cats.reduce((s, c) => s + c.perDay, 0);
    return perDayPerPerson * days * travelers;
  }, [cats, days, travelers]);

  return (
    <section className="max-w-[1280px] mx-auto px-4 md:px-8 pt-10">
      <div className="rounded-3xl p-6 md:p-8" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2 mb-4">
          <Calculator className="h-5 w-5" style={{ color: "#1F9BB4" }} />
          <h2 className="text-xl md:text-2xl tracking-tight" style={{ color: "var(--foreground)", fontFamily: "'DM Serif Display', serif" }}>
            {t("home.budgetCalculator") || "Budget calculator"}
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--muted-foreground)" }}>
            {t("budget.days") || "Days"}
            <input
              type="number" min={1} max={60} value={days} onChange={(e) => setDays(+e.target.value || 1)}
              className="rounded-lg px-3 py-2 text-base" style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" }}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--muted-foreground)" }}>
            <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {t("budget.travelers") || "Travelers"}</span>
            <input
              type="number" min={1} max={20} value={travelers} onChange={(e) => setTravelers(+e.target.value || 1)}
              className="rounded-lg px-3 py-2 text-base" style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" }}
            />
          </label>
        </div>

        <div className="space-y-2 mb-4">
          {cats.map((c) => (
            <div key={c.key} className="flex items-center gap-3">
              <span className="w-24 text-sm" style={{ color: "var(--foreground)" }}>{c.label}</span>
              <input
                type="range" min={0} max={200} value={c.perDay}
                onChange={(e) => setItems({ ...items, [c.key]: +e.target.value })}
                className="flex-1 accent-[#1F9BB4]"
              />
              <span className="w-16 text-right text-sm tabular-nums" style={{ color: "var(--muted-foreground)" }}>${c.perDay}/d</span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between rounded-2xl p-4" style={{ background: "color-mix(in srgb, #1F9BB4 14%, transparent)" }}>
          <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{t("budget.estimated") || "Estimated total"}</span>
          <span className="text-2xl font-bold tabular-nums" style={{ color: "#1F9BB4" }}>${total.toLocaleString()}</span>
        </div>
      </div>
    </section>
  );
}

import { Sparkles, SlidersHorizontal } from "lucide-react";

type Props = {
  active: "ai" | "manual";
  onAi: () => void;
  onManual: () => void;
  aiLabel: string;
  manualLabel: string;
};

export function ModeSwitcher({ active, onAi, onManual, aiLabel, manualLabel }: Props) {
  const base =
    "inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-sm font-medium ring-1 transition";
  const on = "bg-primary text-primary-foreground ring-primary";
  const off = "bg-card ring-border/60 text-muted-foreground hover:bg-secondary/60";
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-secondary/40 p-1 ring-1 ring-border/40">
      <button type="button" onClick={onAi} className={`${base} ${active === "ai" ? on : off}`}>
        <Sparkles className="h-4 w-4" />
        {aiLabel}
      </button>
      <button type="button" onClick={onManual} className={`${base} ${active === "manual" ? on : off}`}>
        <SlidersHorizontal className="h-4 w-4" />
        {manualLabel}
      </button>
    </div>
  );
}

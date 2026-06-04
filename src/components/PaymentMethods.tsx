import { useI18n } from "@/lib/i18n";

type Variant = "footer" | "checkout";

interface Props {
  variant?: Variant;
  className?: string;
}

const methods = [
  { name: "Uzcard", bg: "#00A5DF", fg: "#ffffff" },
  { name: "Humo", bg: "#1B3C8C", fg: "#ffffff" },
  { name: "Visa", bg: "#1A1F71", fg: "#ffffff" },
  { name: "Mastercard", bg: "#ffffff", fg: "#000000" },
];

function MethodBadge({ name, bg, fg, muted }: { name: string; bg: string; fg: string; muted?: boolean }) {
  if (name === "Mastercard") {
    return (
      <div
        aria-label="Mastercard"
        className={`inline-flex h-7 items-center justify-center rounded-md px-2 ring-1 ring-border ${muted ? "opacity-70" : ""}`}
        style={{ background: muted ? "transparent" : "#ffffff" }}
      >
        <span className="relative inline-flex items-center">
          <span className="h-4 w-4 rounded-full" style={{ background: "#EB001B" }} />
          <span className="-ml-2 h-4 w-4 rounded-full" style={{ background: "#F79E1B", mixBlendMode: "multiply" }} />
        </span>
      </div>
    );
  }
  return (
    <span
      aria-label={name}
      className={`inline-flex h-7 items-center justify-center rounded-md px-2.5 text-[11px] font-bold tracking-wide ring-1 ring-border ${muted ? "opacity-70" : ""}`}
      style={{
        background: muted ? "transparent" : bg,
        color: muted ? "var(--muted-foreground)" : fg,
        fontFamily: name === "Visa" ? "Georgia, serif" : undefined,
        fontStyle: name === "Visa" ? "italic" : undefined,
      }}
    >
      {name}
    </span>
  );
}

export function PaymentMethods({ variant = "footer", className = "" }: Props) {
  const { t } = useI18n();
  const muted = variant === "footer";

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <span className="text-xs text-muted-foreground">{t("payments.accepted")}</span>
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {methods.map((m) => (
          <MethodBadge key={m.name} {...m} muted={muted} />
        ))}
      </div>
    </div>
  );
}

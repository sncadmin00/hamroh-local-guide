import { BadgeCheck, Languages, MessageCircle, ShieldCheck, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function TrustBar() {
  const { t } = useI18n();
  const items = [
    { Icon: BadgeCheck, label: t("trust.verified") },
    { Icon: Languages, label: t("trust.language") },
    { Icon: MessageCircle, label: t("trust.directChat") },
    { Icon: ShieldCheck, label: t("trust.secureBooking") },
    { Icon: Sparkles, label: t("trust.trustedReviews") },
  ];
  return (
    <div
      className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 border-y px-6 md:px-12 py-3.5"
      style={{ background: "var(--card)", borderColor: "var(--border)" }}
    >
      {items.map(({ Icon, label }, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-2 text-xs font-medium whitespace-nowrap"
          style={{ color: "var(--muted-foreground)" }}
        >
          <Icon className="h-4 w-4 shrink-0" style={{ color: "var(--gold)" }} />
          {label}
        </span>
      ))}
    </div>
  );
}

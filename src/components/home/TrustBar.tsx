import { BadgeCheck, Languages, MessageCircle, ShieldCheck, Sparkles, Star } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function TrustBar() {
  const { t } = useI18n();
  const items = [
    { Icon: BadgeCheck, label: t("trust.verified") },
    { Icon: Languages, label: t("trust.language") },
    { Icon: MessageCircle, label: t("trust.directChat") },
    { Icon: ShieldCheck, label: t("trust.secureBooking") },
    { Icon: Sparkles, label: t("trust.trustedReviews") },
    { Icon: Star, label: t("trust.rated") },
  ];
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm font-medium text-muted-foreground">
      {items.map(({ Icon, label }, i) => (
        <span key={i} className="inline-flex items-center gap-2">
          <Icon className={`h-4.5 w-4.5 ${label === t("trust.verified") || label === t("trust.rated") ? "text-gold" : "text-accent"}`} style={{ width: 18, height: 18 }} />
          {label}
        </span>
      ))}
    </div>
  );
}

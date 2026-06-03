import { BadgeCheck, MessageCircle, ShieldCheck } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function TrustBar() {
  const { t } = useI18n();
  const items = [
    { Icon: BadgeCheck, label: t("trust.verified") },
    { Icon: MessageCircle, label: t("trust.directChat") },
    { Icon: ShieldCheck, label: t("trust.secureBooking") },
  ];
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-slate-500">
      {items.map(({ Icon, label }, i) => (
        <span key={i} className="inline-flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 text-primary" />
          {label}
        </span>
      ))}
    </div>
  );
}

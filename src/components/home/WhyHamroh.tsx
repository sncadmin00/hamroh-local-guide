import { ShieldCheck, MessageCircle, CreditCard, RefreshCw } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function WhyHamroh() {
  const { t } = useI18n();
  const items = [
    { icon: ShieldCheck, title: t("why.verified.title"), desc: t("why.verified.desc") },
    { icon: MessageCircle, title: t("why.chat.title"), desc: t("why.chat.desc") },
    { icon: CreditCard, title: t("why.pay.title"), desc: t("why.pay.desc") },
    { icon: RefreshCw, title: t("why.cancel.title"), desc: t("why.cancel.desc") },
  ];

  return (
    <section className="px-6 py-16 md:py-20">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground">
            {t("why.title")}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("why.subtitle")}</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {items.map((it) => (
            <div
              key={it.title}
              className="rounded-2xl bg-card ring-1 ring-border p-5 md:p-6 hover:shadow-md transition-shadow"
            >
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <it.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-base md:text-lg font-semibold text-foreground">
                {it.title}
              </h3>
              <p className="mt-1.5 text-xs md:text-sm text-muted-foreground leading-relaxed">
                {it.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

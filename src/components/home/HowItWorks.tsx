import { MessageSquare, MapPin, CalendarCheck } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function HowItWorks() {
  const { t } = useI18n();
  const steps = [
    { Icon: MessageSquare, title: t("how.step1.title"), desc: t("how.step1.desc") },
    { Icon: MapPin, title: t("how.step2.title"), desc: t("how.step2.desc") },
    { Icon: CalendarCheck, title: t("how.step3.title"), desc: t("how.step3.desc") },
  ];
  return (
    <section className="px-6 py-16 md:py-20 border-t border-border/40">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground">
            {t("how.title")}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("how.subtitle")}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map(({ Icon, title, desc }, i) => (
            <div key={i} className="flex flex-col items-center text-center p-6">
              <div className="relative mb-4">
                <div className="absolute inset-0 blur-xl opacity-30 bg-primary rounded-full" />
                <div className="relative w-14 h-14 rounded-2xl bg-card ring-1 ring-border flex items-center justify-center text-primary">
                  <Icon className="h-6 w-6" strokeWidth={1.75} />
                </div>
              </div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                {String(i + 1).padStart(2, "0")}
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground max-w-xs">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function BecomeGuideCTA() {
  const { t } = useI18n();
  return (
    <section className="px-6 py-16 md:py-24">
      <div className="max-w-5xl mx-auto">
        <div className="relative overflow-hidden rounded-3xl p-10 md:p-14 text-center text-white shadow-[var(--shadow-elegant)]"
          style={{ background: "linear-gradient(135deg, #082A78 0%, #1F9BB4 100%)" }}
        >
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-30 blur-3xl bg-white" />
          <div className="relative">
            <h2 className="font-display text-3xl md:text-4xl font-semibold whitespace-pre-line">{t("cta.title")}</h2>
            <p className="mt-3 text-base md:text-lg opacity-90 max-w-xl mx-auto">
              {t("cta.subtitle")}
            </p>
            <Link
              to="/become-a-guide"
              className="mt-7 inline-flex items-center gap-2 h-11 px-6 rounded-full bg-white text-foreground text-sm font-semibold hover:bg-white/90 transition-colors"
            >
              {t("cta.button")} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

import { Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function BookTourBanner() {
  const { t } = useI18n();

  return (
    <section className="px-6 md:px-12 py-14 md:py-[72px]">
      <Link
        to="/search"
        className="relative max-w-[1280px] mx-auto rounded-3xl overflow-hidden flex items-center justify-between gap-6 px-6 py-6 md:px-10 md:py-8 transition-transform hover:-translate-y-0.5"
        style={{
          background: "linear-gradient(135deg, var(--primary) 0%, var(--gold-hover) 100%)",
          color: "var(--gold-foreground)",
        }}
      >
        <div className="flex-1 min-w-0">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] mb-2 opacity-80 flex items-center gap-1.5">
            <Search className="h-3.5 w-3.5" />
            {t("banner.bookTour.label")}
          </p>
          <h2 className="text-[1.4rem] md:text-[2rem] leading-[1.15] tracking-tight" style={{ fontFamily: "'DM Serif Display', serif" }}>
            {t("banner.bookTour.title")}
          </h2>
          <p className="mt-2 text-sm opacity-90 max-w-xl">
            {t("banner.bookTour.subtitle")}
          </p>
        </div>
        <span className="text-3xl md:text-4xl shrink-0">→</span>
      </Link>
    </section>
  );
}

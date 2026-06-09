import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";

export function BookingCtaBlock() {
  const { t } = useI18n();
  return (
    <section className="px-6 py-10 md:py-14">
      <div className="max-w-3xl mx-auto">
        <div className="rounded-3xl bg-foreground text-background p-8 md:p-12 text-center">
          <h2 className="font-display text-2xl md:text-3xl font-semibold">
            {t("home.bookingCta.title")}
          </h2>
          <p className="mt-3 text-sm md:text-base opacity-80 max-w-md mx-auto">
            {t("home.bookingCta.subtitle")}
          </p>
          <Link
            to="/book"
            className="mt-6 inline-flex items-center h-11 px-7 rounded-full bg-background text-foreground text-sm font-semibold hover:bg-background/90 transition-colors"
          >
            {t("home.bookingCta.button")}
          </Link>
        </div>
      </div>
    </section>
  );
}

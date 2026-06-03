import { Link } from "@tanstack/react-router";
import { GuideCard } from "@/components/GuideCard";
import { useGuides } from "@/lib/content-queries";
import { useI18n } from "@/lib/i18n";

export function FeaturedGuides() {
  const { t } = useI18n();
  const { data: guides = [], isLoading } = useGuides();
  if (isLoading || guides.length === 0) return null;
  const featured = [...guides]
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 6);

  return (
    <section className="px-6 py-16 md:py-20 bg-secondary/40">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground">
              {t("featured.title")}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">{t("featured.subtitle")}</p>
          </div>
          <Link
            to="/guides"
            className="hidden md:inline-flex text-sm font-medium text-primary hover:underline"
          >
            {t("featured.viewAll")} →
          </Link>
        </div>

        {/* Mobile: horizontal scroll */}
        <div className="md:hidden -mx-6 px-6">
          <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:thin]">
            {featured.map((g) => (
              <div key={g.id} className="w-72 shrink-0 snap-start">
                <GuideCard guide={g} />
              </div>
            ))}
          </div>
        </div>

        {/* Desktop: grid */}
        <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-6">
          {featured.map((g) => (
            <GuideCard key={g.id} guide={g} />
          ))}
        </div>

        <div className="md:hidden mt-6 text-center">
          <Link to="/guides" className="text-sm font-medium text-primary hover:underline">
            {t("featured.viewAll")} →
          </Link>
        </div>
      </div>
    </section>
  );
}

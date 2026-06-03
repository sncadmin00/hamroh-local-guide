import { Link } from "@tanstack/react-router";
import { GuideCard } from "@/components/GuideCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useGuides } from "@/lib/content-queries";
import { useI18n } from "@/lib/i18n";

function GuideSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

export function FeaturedGuides() {
  const { t } = useI18n();
  const { data: guides = [], isLoading } = useGuides();
  if (!isLoading && guides.length === 0) return null;
  const featured = [...guides]
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 6);

  return (
    <section className="px-6 py-10 md:py-20 bg-secondary/40">
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
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="w-60 shrink-0 snap-start">
                    <GuideSkeleton />
                  </div>
                ))
              : featured.map((g) => (
                  <div key={g.id} className="w-60 shrink-0 snap-start">
                    <GuideCard guide={g} />
                  </div>
                ))}
          </div>
        </div>

        {/* Desktop: grid */}
        <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => <GuideSkeleton key={i} />)
            : featured.map((g) => <GuideCard key={g.id} guide={g} />)}
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

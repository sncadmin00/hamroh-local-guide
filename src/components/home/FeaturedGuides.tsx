import { Link } from "@tanstack/react-router";
import { GuideCard } from "@/components/GuideCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useGuides } from "@/lib/content-queries";
import { useI18n } from "@/lib/i18n";
import { HorizontalCarousel } from "@/components/home/HorizontalCarousel";

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
    .slice(0, 20);

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

        <HorizontalCarousel itemClassName="w-[240px] md:w-[260px]" twoRowsDesktop>
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => <GuideSkeleton key={i} />)
            : featured.map((g) => <GuideCard key={g.id} guide={g} />)}
        </HorizontalCarousel>

        <div className="md:hidden mt-6 text-center">
          <Link to="/guides" className="text-sm font-medium text-primary hover:underline">
            {t("featured.viewAll")} →
          </Link>
        </div>
      </div>
    </section>
  );
}

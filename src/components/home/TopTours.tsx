import { Link } from "@tanstack/react-router";
import { Clock } from "lucide-react";
import { useTours } from "@/lib/content-queries";
import { useI18n } from "@/lib/i18n";
import { WishlistHeart } from "@/components/WishlistHeart";


export function TopTours() {
  const { t } = useI18n();
  const { data: tours = [], isLoading } = useTours();
  if (isLoading || tours.length === 0) return null;
  const top = tours.slice(0, 8);

  return (
    <section className="px-6 py-16 md:py-20">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground">
              {t("topTours.title")}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">{t("topTours.subtitle")}</p>
          </div>
          <Link
            to="/tours"
            className="hidden md:inline-flex text-sm font-medium text-primary hover:underline"
          >
            {t("topTours.viewAll")} →
          </Link>
        </div>

        <div className="-mx-6 px-6">
          <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 [scrollbar-width:thin]">
            {top.map((tour) => (
              <Link
                key={tour.id}
                to="/tours/$slug"
                params={{ slug: tour.slug }}
                className="group w-72 shrink-0 snap-start rounded-2xl border border-border bg-card overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="aspect-[4/3] bg-secondary overflow-hidden">
                  {tour.cover_url ? (
                    <img
                      src={tour.cover_url}
                      alt={tour.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform"
                    />
                  ) : null}
                </div>
                <div className="p-4">
                  <h3 className="font-display text-base font-semibold text-foreground line-clamp-2">
                    {tour.title}
                  </h3>
                  {tour.cities?.name ? (
                    <p className="mt-1 text-xs text-muted-foreground">{tour.cities.name}</p>
                  ) : null}
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <Clock className="size-3.5" />
                      {Number(tour.duration_hours)} {t("tours.hours")}
                    </span>
                    {Number(tour.price_from) > 0 ? (
                      <span className="font-medium text-foreground">
                        {t("tours.priceFrom")} ${Number(tour.price_from)}
                      </span>
                    ) : null}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="md:hidden mt-6 text-center">
          <Link to="/tours" className="text-sm font-medium text-primary hover:underline">
            {t("topTours.viewAll")} →
          </Link>
        </div>
      </div>
    </section>
  );
}

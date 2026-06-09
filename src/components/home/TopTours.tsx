import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Clock, Car, Star } from "lucide-react";
import { useTours, useCategories, pickTourTitle } from "@/lib/content-queries";
import { useI18n } from "@/lib/i18n";
import { WishlistHeart } from "@/components/WishlistHeart";
import { Skeleton } from "@/components/ui/skeleton";
import { HorizontalCarousel } from "@/components/home/HorizontalCarousel";


export function TopTours() {
  const { t, tCategory, tLanguage, lang } = useI18n();
  const { data: tours = [], isLoading } = useTours();
  const { data: categories = [] } = useCategories();
  const [active, setActive] = useState<string | null>(null);

  const availableCategories = useMemo(() => {
    const slugs = new Set<string>();
    for (const tr of tours) {
      for (const tc of tr.tour_categories ?? []) {
        if (tc.categories?.slug) slugs.add(tc.categories.slug);
      }
    }
    return categories.filter((c) => slugs.has(c.slug));
  }, [tours, categories]);

  const filtered = active
    ? tours.filter((tr) => (tr.tour_categories ?? []).some((tc) => tc.categories?.slug === active))
    : tours;
  if (!isLoading && tours.length === 0) return null;
  const top = filtered.slice(0, 20);

  return (
    <section className="px-6 py-10 md:py-20">
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

        {availableCategories.length > 0 && (
          <div className="-mx-6 px-6 mb-4">
            <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <button
                type="button"
                onClick={() => setActive(null)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  active === null
                    ? "bg-foreground text-background border-foreground"
                    : "bg-card text-foreground/70 border-border hover:bg-secondary"
                }`}
              >
                {t("topTours.all")}
              </button>
              {availableCategories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActive(c.slug)}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors whitespace-nowrap ${
                    active === c.slug
                      ? "bg-foreground text-background border-foreground"
                      : "bg-card text-foreground/70 border-border hover:bg-secondary"
                  }`}
                >
                  {tCategory(c.slug, c.name)}
                </button>
              ))}
            </div>
          </div>
        )}

        {!isLoading && top.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6">—</p>
        ) : (
          <HorizontalCarousel itemClassName="w-[240px] md:w-[260px]" twoRowsDesktop>
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))
              : top.map((tour) => {
                  const langPrices = tour.languages
                    .map((lng) => ({ lng, price: tour.price_by_language[lng] ?? Number(tour.price_from) }))
                    .filter((x) => x.price > 0);
                  return (
                    <Link
                      key={tour.id}
                      to="/tours/$slug"
                      params={{ slug: tour.slug }}
                      className="group block"
                    >
                      <div className="relative aspect-[4/3] bg-secondary overflow-hidden rounded-2xl">
                        {tour.cover_url ? (
                          <img
                            src={tour.cover_url}
                            alt={pickTourTitle(tour, lang)}
                            loading="lazy"
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                          />
                        ) : null}
                        {tour.transport_included && (
                          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-background/95 px-2 py-1 text-[10px] font-medium text-primary backdrop-blur">
                            <Car className="size-3" /> transport
                          </span>
                        )}
                        <WishlistHeart type="tour" id={tour.id} className="absolute right-3 top-3" />
                      </div>

                      <div className="pt-3 px-0.5">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-display text-[15px] font-semibold text-foreground line-clamp-1 leading-tight">
                            {pickTourTitle(tour, lang)}
                          </h3>
                          {tour.reviews_count > 0 && (
                            <span className="inline-flex items-center gap-1 text-[13px] shrink-0">
                              <Star className="size-3.5 fill-foreground text-foreground" />
                              <span className="font-medium tabular-nums">{Number(tour.rating).toFixed(1)}</span>
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[13px] text-muted-foreground line-clamp-1">
                          {[tour.cities?.name, tour.guides?.name].filter(Boolean).join(" · ")}
                        </p>
                        <p className="mt-1 inline-flex items-center gap-1 text-[12px] text-muted-foreground">
                          <Clock className="size-3" />
                          {Number(tour.duration_hours)} {t("tours.hours")}
                        </p>
                        {Number(tour.price_from) > 0 && (
                          <p className="mt-1.5 text-[14px] text-foreground">
                            <span className="font-semibold">${Number(tour.price_from)}</span>
                            <span className="text-muted-foreground"> · {t("tours.priceFrom")}</span>
                          </p>
                        )}
                        {langPrices.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {langPrices.slice(0, 3).map(({ lng }) => (
                              <span key={lng} className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                {tLanguage(lng)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
          </HorizontalCarousel>

        )}

        <div className="md:hidden mt-6 text-center">
          <Link to="/tours" className="text-sm font-medium text-primary hover:underline">
            {t("topTours.viewAll")} →
          </Link>
        </div>
      </div>
    </section>
  );
}

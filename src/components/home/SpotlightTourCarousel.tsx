import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { Star, MapPin, Check } from "lucide-react";
import { useTours, pickTourTitle, pickTourShortDescription, pickTourIncluded } from "@/lib/content-queries";
import { useI18n } from "@/lib/i18n";
import { HorizontalCarousel } from "@/components/home/HorizontalCarousel";
import { WishlistHeart } from "@/components/WishlistHeart";

export function SpotlightTourCarousel() {
  const { t, lang } = useI18n();
  const { data: tours = [] } = useTours();
  const items = useMemo(
    () => [...tours].sort((a, b) => Number(b.rating ?? 0) - Number(a.rating ?? 0)).slice(0, 8),
    [tours],
  );

  if (items.length === 0) return null;

  return (
    <section className="px-6 py-12 md:py-16 bg-secondary/40">
      <div className="max-w-6xl mx-auto">
        <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-8 text-center">
          {t("home.spotlightTour.title")}
        </h2>

        <HorizontalCarousel
          itemClassName="w-[300px] md:w-[340px]"
          twoRowsDesktop={false}
        >
          {items.map((tour) => {
            const title = pickTourTitle(tour, lang);
            const desc = pickTourShortDescription(tour, lang);
            const included = pickTourIncluded(tour, lang).slice(0, 4);
            const cat = tour.tour_categories?.[0]?.categories;
            return (
              <Link
                key={tour.id}
                to="/tours/$slug"
                params={{ slug: tour.slug }}
                className="flex flex-col h-full overflow-hidden rounded-2xl bg-card ring-1 ring-border shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-end h-9 px-3 bg-white border-b border-border">
                  <WishlistHeart type="tour" id={tour.id} size="sm" variant="ghost" />
                </div>
                <div className="relative">
                  <div className="aspect-[16/10] w-full overflow-hidden bg-secondary">
                    {tour.cover_url && (
                      <img
                        src={tour.cover_url}
                        alt={title}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    )}
                  </div>
                  {cat?.name && (
                    <span className="absolute left-4 -bottom-4 z-10 inline-flex items-center h-8 px-3 rounded-lg bg-white text-[11px] font-semibold uppercase tracking-wide text-foreground shadow-md ring-1 ring-border">
                      {cat.name}
                    </span>
                  )}
                </div>


                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-display text-lg font-semibold text-foreground leading-snug line-clamp-2">
                    {title}
                  </h3>

                  <div className="mt-2 flex items-center gap-3 text-sm">
                    {Number(tour.rating ?? 0) > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                        <span className="font-semibold tabular-nums text-foreground">
                          {Number(tour.rating).toFixed(1)}
                        </span>
                        {Number(tour.reviews_count ?? 0) > 0 && (
                          <span className="text-muted-foreground">
                            ({tour.reviews_count})
                          </span>
                        )}
                      </span>
                    )}
                    {tour.cities?.name && (
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        {tour.cities.name}
                      </span>
                    )}
                  </div>

                  {desc && (
                    <p className="mt-3 text-sm text-muted-foreground line-clamp-3">{desc}</p>
                  )}

                  {included.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-semibold text-foreground">
                        {t("tours.included")}
                      </p>
                      <ul className="mt-2 space-y-1.5">
                        {included.map((it, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
                            <span className="line-clamp-1">{it}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="mt-auto pt-5 flex items-end justify-between gap-3">
                    {Number(tour.price_from) > 0 ? (
                      <div className="text-sm">
                        <div className="text-muted-foreground">{t("tours.priceFrom")}</div>
                        <div className="text-foreground">
                          <span className="font-display text-lg font-semibold">
                            ${Number(tour.price_from)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span />
                    )}

                    <span className="inline-flex items-center h-10 px-5 rounded-xl bg-foreground text-background text-sm font-semibold hover:opacity-90 transition-opacity">
                      {t("home.spotlightTour.cta")}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </HorizontalCarousel>
      </div>
    </section>
  );
}

import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, MapPin, Star } from "lucide-react";
import { useTours, pickTourTitle, pickTourShortDescription, pickTourIncluded } from "@/lib/content-queries";
import { useI18n } from "@/lib/i18n";
import { WishlistHeart } from "@/components/WishlistHeart";
import { CarouselArrows, ScrollRow, useCarouselControls } from "./ScrollCarousel";


export function SpotlightTourCarousel() {
  const { t, lang } = useI18n();
  const { data: tours = [] } = useTours();
  const items = useMemo(
    () => [...tours].sort((a, b) => Number(b.rating ?? 0) - Number(a.rating ?? 0)).slice(0, 12),
    [tours],
  );
  const { ref, scroll } = useCarouselControls(320);

  if (items.length === 0) return null;

  return (
    <section className="relative px-6 md:px-12 py-16 md:py-[72px] max-w-[1280px] mx-auto">
      <span className="ghost-number">03</span>
      <div className="flex items-baseline justify-between mb-9 gap-4">
        <h2
          className="font-display text-[1.6rem] md:text-[2.2rem] tracking-tight"
          style={{ color: "var(--foreground)", fontFamily: "'DM Serif Display', serif" }}
        >
          {t("home.spotlightTour.title")}
        </h2>
        <div className="flex items-center gap-4 shrink-0">
          <Link
            to="/tours"
            className="text-sm font-medium inline-flex items-center gap-1.5 hover:gap-2.5 transition-all"
            style={{ color: "var(--gold)" }}
          >
            {t("topTours.viewAll")} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <CarouselArrows onPrev={() => scroll(-1)} onNext={() => scroll(1)} />
        </div>
      </div>

      <ScrollRow scrollerRef={ref} cardWidth={320}>

        {items.map((tour) => {
          const title = pickTourTitle(tour, lang);
          const desc = pickTourShortDescription(tour, lang);
          const included = pickTourIncluded(tour, lang).slice(0, 3);
          const cat = tour.tour_categories?.[0]?.categories;
          return (
            <Link
              key={tour.id}
              to="/tours/$slug"
              params={{ slug: tour.slug }}
              className="glass-card group relative flex flex-col overflow-hidden"

            >
              {/* Image */}
              <div className="relative aspect-[16/10] overflow-hidden">
                {tour.cover_url && (
                  <img
                    src={tour.cover_url}
                    alt={title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                )}
                {cat?.name && (
                  <span
                    className="absolute top-3 left-3 rounded-full px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-wider backdrop-blur border"
                    style={{
                      background: "rgba(10,15,30,0.75)",
                      borderColor: "color-mix(in srgb, var(--gold) 25%, transparent)",
                      color: "var(--gold)",
                    }}
                  >
                    {cat.name}
                  </span>
                )}
                <div
                  className="absolute top-3 right-3 rounded-full backdrop-blur border"
                  style={{ background: "rgba(10,15,30,0.7)", borderColor: "var(--border)" }}
                >
                  <WishlistHeart type="tour" id={tour.id} size="sm" variant="ghost" />
                </div>
              </div>

              {/* Body */}
              <div className="flex flex-1 flex-col p-4 pt-4">
                <h3
                  className="text-[0.98rem] font-semibold leading-snug mb-3 line-clamp-2"
                  style={{ color: "var(--foreground)" }}
                >
                  {title}
                </h3>

                {tour.guides?.name && (
                  <div className="flex items-center gap-2 mb-2.5">
                    {tour.guides.photo_url && (
                      <img
                        src={tour.guides.photo_url}
                        alt={tour.guides.name}
                        loading="lazy"
                        className="h-[26px] w-[26px] rounded-full object-cover border"
                        style={{ borderColor: "color-mix(in srgb, var(--gold) 30%, transparent)" }}
                      />
                    )}
                    <span className="text-[0.78rem]" style={{ color: "var(--muted-foreground)" }}>
                      {t("home.spotlightTour.by")}{" "}
                      <span style={{ color: "var(--muted-foreground)" }} className="font-medium">
                        {tour.guides.name}
                      </span>
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-3.5 text-[0.78rem] mb-3.5">
                  {Number(tour.rating ?? 0) > 0 && (
                    <span className="inline-flex items-center gap-1 font-semibold" style={{ color: "var(--foreground)" }}>
                      <Star className="h-3.5 w-3.5 fill-current" style={{ color: "var(--gold)" }} />
                      {Number(tour.rating).toFixed(1)}
                    </span>
                  )}
                  {tour.cities?.name && (
                    <span className="inline-flex items-center gap-1" style={{ color: "var(--muted-foreground)" }}>
                      <MapPin className="h-3.5 w-3.5" style={{ color: "var(--gold)" }} />
                      {tour.cities.name}
                    </span>
                  )}
                </div>

                {desc && (
                  <p
                    className="text-[0.82rem] leading-relaxed mb-3.5 line-clamp-2"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {desc}
                  </p>
                )}

                {included.length > 0 && (
                  <div className="mb-4">
                    <p
                      className="text-[0.72rem] font-semibold uppercase tracking-wider mb-2"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {t("tours.included")}
                    </p>
                    <ul className="space-y-1.5">
                      {included.map((it, i) => (
                        <li
                          key={i}
                          className="flex items-center gap-2 text-[0.8rem]"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          <Check className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--gold)" }} />
                          <span className="line-clamp-1">{it}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div
                className="mt-auto flex items-center justify-between px-4 py-3.5 border-t"
                style={{ borderColor: "var(--border)" }}

              >
                <div>
                  <div className="text-[0.7rem]" style={{ color: "var(--muted-foreground)" }}>
                    {t("tours.priceFrom")}
                  </div>
                  {Number(tour.price_from) > 0 && (
                    <div
                      className="text-[1.2rem] font-bold tracking-tight"
                      style={{ color: "var(--foreground)" }}
                    >
                      ${Number(tour.price_from)}
                    </div>
                  )}
                </div>
                <span
                  className="inline-flex items-center rounded-full px-4 py-2.5 text-[0.82rem] font-semibold transition-all group-hover:scale-105"
                  style={{ background: "var(--gold)", color: "var(--background)" }}
                >
                  {t("home.spotlightTour.cta")}
                </span>
              </div>
            </Link>
          );
        })}
      </ScrollRow>

    </section>
  );
}

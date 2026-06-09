import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Clock, Star } from "lucide-react";
import { useTours, pickTourTitle } from "@/lib/content-queries";
import { useI18n } from "@/lib/i18n";

const AUTOPLAY_MS = 6000;

export function SpotlightTourCarousel() {
  const { t, lang } = useI18n();
  const { data: tours = [] } = useTours();
  const items = useMemo(
    () => [...tours].sort((a, b) => Number(b.rating ?? 0) - Number(a.rating ?? 0)).slice(0, 5),
    [tours],
  );
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const count = items.length;

  useEffect(() => {
    if (paused || count <= 1) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [paused, count]);

  useEffect(() => {
    if (index >= count) setIndex(0);
  }, [count, index]);

  if (count === 0) return null;

  const goTo = (i: number) => setIndex(((i % count) + count) % count);
  const prev = () => goTo(index - 1);
  const next = () => goTo(index + 1);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 40) (dx < 0 ? next : prev)();
    touchStartX.current = null;
  };

  const tour = items[index];
  const title = pickTourTitle(tour, lang);

  return (
    <section className="px-6 py-12 md:py-16 bg-secondary/40">
      <div className="max-w-3xl mx-auto">
        <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-8 text-center">
          {t("home.spotlightTour.title")}
        </h2>

        <div
          className="group relative"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <Link
            to="/tours/$slug"
            params={{ slug: tour.slug }}
            className="block animate-fade-in"
            key={tour.id}
          >
            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-3xl bg-secondary">
              {tour.cover_url && (
                <img
                  src={tour.cover_url}
                  alt={title}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              )}
            </div>
            <div className="mt-5 text-center">
              <h3 className="font-display text-xl md:text-2xl font-semibold text-foreground line-clamp-1">
                {title}
              </h3>
              {tour.cities?.name && (
                <p className="mt-1 text-sm text-muted-foreground">{tour.cities.name}</p>
              )}
              <div className="mt-3 flex items-center justify-center gap-4 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {Number(tour.duration_hours)} {t("tours.hours")}
                </span>
                {Number(tour.rating ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Star className="h-4 w-4 fill-foreground text-foreground" />
                    <span className="tabular-nums font-medium text-foreground">
                      {Number(tour.rating).toFixed(1)}
                    </span>
                  </span>
                )}
                {Number(tour.price_from) > 0 && (
                  <span className="font-semibold text-foreground">
                    ${Number(tour.price_from)}
                  </span>
                )}
              </div>
              <div className="mt-5">
                <span className="inline-flex items-center h-10 px-6 rounded-full bg-foreground text-background text-sm font-semibold hover:opacity-90 transition-opacity">
                  {t("home.spotlightTour.cta")}
                </span>
              </div>
            </div>
          </Link>

          {count > 1 && (
            <>
              <button
                type="button"
                onClick={prev}
                aria-label="Previous"
                className="absolute left-2 top-1/3 -translate-y-1/2 h-10 w-10 flex items-center justify-center rounded-full bg-white shadow-md ring-1 ring-slate-200 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-50"
              >
                <ChevronLeft className="h-5 w-5 text-slate-700" />
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="Next"
                className="absolute right-2 top-1/3 -translate-y-1/2 h-10 w-10 flex items-center justify-center rounded-full bg-white shadow-md ring-1 ring-slate-200 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-50"
              >
                <ChevronRight className="h-5 w-5 text-slate-700" />
              </button>
            </>
          )}
        </div>

        {count > 1 && (
          <div className="mt-6 flex items-center justify-center gap-1.5">
            {items.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-5 bg-foreground" : "w-1.5 bg-slate-300 hover:bg-slate-400"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

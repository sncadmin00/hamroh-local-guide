import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Star, BadgeCheck } from "lucide-react";
import { useGuides } from "@/lib/content-queries";
import { useI18n } from "@/lib/i18n";

const AUTOPLAY_MS = 6000;

export function SpotlightGuideCarousel() {
  const { t } = useI18n();
  const { data: guides = [] } = useGuides();
  const items = useMemo(
    () => [...guides].sort((a, b) => b.rating - a.rating).slice(0, 5),
    [guides],
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

  const g = items[index];

  return (
    <section className="px-6 py-12 md:py-16">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-8">
          {t("home.spotlightGuide.title")}
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
            to="/guides/$guideId"
            params={{ guideId: g.id }}
            className="block animate-fade-in"
            key={g.id}
          >
            <div className="mx-auto h-48 w-48 md:h-56 md:w-56 overflow-hidden rounded-full bg-secondary ring-4 ring-white shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)]">
              <img
                src={g.photo}
                alt={g.name}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="mt-5 flex items-center justify-center gap-1.5">
              <h3 className="font-display text-xl font-semibold text-foreground">{g.name}</h3>
              {g.verified && <BadgeCheck className="h-5 w-5 text-primary" />}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{g.city}</p>
            {g.reviews > 0 && (
              <div className="mt-2 inline-flex items-center gap-1 text-sm text-foreground">
                <Star className="h-4 w-4 fill-foreground text-foreground" />
                <span className="tabular-nums font-medium">{g.rating.toFixed(1)}</span>
                <span className="text-muted-foreground">· {g.reviews} reviews</span>
              </div>
            )}
            <div className="mt-5">
              <span className="inline-flex items-center h-10 px-6 rounded-full bg-foreground text-background text-sm font-semibold hover:opacity-90 transition-opacity">
                {t("home.spotlightGuide.cta")}
              </span>
            </div>
          </Link>

          {count > 1 && (
            <>
              <button
                type="button"
                onClick={prev}
                aria-label="Previous"
                className="absolute left-0 top-24 md:top-28 -translate-y-1/2 h-10 w-10 flex items-center justify-center rounded-full bg-white shadow-md ring-1 ring-slate-200 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-50"
              >
                <ChevronLeft className="h-5 w-5 text-slate-700" />
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="Next"
                className="absolute right-0 top-24 md:top-28 -translate-y-1/2 h-10 w-10 flex items-center justify-center rounded-full bg-white shadow-md ring-1 ring-slate-200 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-50"
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

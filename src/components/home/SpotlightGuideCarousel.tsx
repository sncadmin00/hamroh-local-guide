import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Star, BadgeCheck } from "lucide-react";
import { useGuides } from "@/lib/content-queries";
import { useI18n } from "@/lib/i18n";

const AUTOPLAY_MS = 6000;
const DESKTOP_VISIBLE = 4;

export function SpotlightGuideCarousel() {
  const { t } = useI18n();
  const { data: guides = [] } = useGuides();
  const items = useMemo(
    () => [...guides].sort((a, b) => b.rating - a.rating).slice(0, 8),
    [guides],
  );
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const count = items.length;

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const visible = isDesktop ? Math.min(DESKTOP_VISIBLE, count) : 1;
  const pages = Math.max(1, count - visible + 1);

  useEffect(() => {
    if (paused || pages <= 1) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % pages), AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [paused, pages]);

  useEffect(() => {
    if (index >= pages) setIndex(0);
  }, [pages, index]);

  if (count === 0) return null;

  const goTo = (i: number) => setIndex(((i % pages) + pages) % pages);
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

  const shown = items.slice(index, index + visible);

  return (
    <section className="px-6 py-12 md:py-16">
      <div className="max-w-6xl mx-auto text-center">
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
          <div
            className={`grid gap-6 md:gap-8 animate-fade-in ${
              visible === 1
                ? "grid-cols-1"
                : visible === 2
                  ? "grid-cols-2"
                  : visible === 3
                    ? "grid-cols-3"
                    : "grid-cols-4"
            }`}
            key={index}
          >
            {shown.map((g) => (
              <Link
                key={g.id}
                to="/guides/$guideId"
                params={{ guideId: g.id }}
                className="block group/card"
              >
                <div className="mx-auto aspect-square w-full max-w-[200px] overflow-hidden rounded-full bg-secondary ring-4 ring-white shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] transition-transform duration-500 group-hover/card:scale-[1.03]">
                  <img
                    src={g.photo}
                    alt={g.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="mt-4 flex items-center justify-center gap-1.5">
                  <h3 className="font-display text-lg font-semibold text-foreground line-clamp-1">
                    {g.name}
                  </h3>
                  {g.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-primary" />}
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">{g.city}</p>
                <div className="mt-1.5 flex items-center justify-center gap-3 text-sm text-foreground">
                  {g.reviews > 0 && (
                    <div className="inline-flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-foreground text-foreground" />
                      <span className="tabular-nums font-medium">{g.rating.toFixed(1)}</span>
                      <span className="text-muted-foreground">· {g.reviews}</span>
                    </div>
                  )}
                  {g.completedToursCount > 0 && (
                    <div className="inline-flex items-center gap-1 text-muted-foreground">
                      <Compass className="h-3.5 w-3.5" />
                      <span className="tabular-nums">{g.completedToursCount}</span>
                    </div>
                  )}
                </div>
                {g.languages?.length > 0 && (
                  <p className="mt-1.5 text-xs uppercase tracking-wide text-muted-foreground">
                    {g.languages.slice(0, 4).join(" · ")}
                  </p>
                )}
              </Link>
            ))}
          </div>

          {visible === 1 && (
            <div className="mt-5 text-center">
              <Link
                to="/guides/$guideId"
                params={{ guideId: shown[0].id }}
                className="inline-flex items-center h-10 px-6 rounded-full bg-foreground text-background text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                {t("home.spotlightGuide.cta")}
              </Link>
            </div>
          )}

          {pages > 1 && (
            <>
              <button
                type="button"
                onClick={prev}
                aria-label="Previous"
                className="absolute -left-2 md:-left-6 top-24 md:top-28 -translate-y-1/2 h-10 w-10 flex items-center justify-center rounded-full bg-white shadow-md ring-1 ring-slate-200 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-50"
              >
                <ChevronLeft className="h-5 w-5 text-slate-700" />
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="Next"
                className="absolute -right-2 md:-right-6 top-24 md:top-28 -translate-y-1/2 h-10 w-10 flex items-center justify-center rounded-full bg-white shadow-md ring-1 ring-slate-200 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-50"
              >
                <ChevronRight className="h-5 w-5 text-slate-700" />
              </button>
            </>
          )}
        </div>

        {pages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-1.5">
            {Array.from({ length: pages }).map((_, i) => (
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

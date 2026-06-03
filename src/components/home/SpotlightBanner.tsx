import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, ArrowUpRight } from "lucide-react";
import { spotlights } from "@/lib/spotlights";
import { useI18n } from "@/lib/i18n";

const AUTOPLAY_MS = 6000;

export function SpotlightBanner() {
  const { t } = useI18n();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const count = spotlights.length;

  useEffect(() => {
    if (paused || count <= 1) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [paused, count]);

  const goTo = (i: number) => setIndex(((i % count) + count) % count);
  const prev = () => goTo(index - 1);
  const next = () => goTo(index + 1);

  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 40) (dx < 0 ? next : prev)();
    touchStartX.current = null;
  };

  return (
    <div
      className="group relative mb-6 w-full max-w-2xl"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-gradient-to-br from-[#8BB5A9]/10 to-[#D5A08D]/10 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.08)]">
        {spotlights.map((s, i) => {
          const active = i === index;
          return (
            <Link
              key={s.id}
              to={s.href}
              aria-hidden={!active}
              tabIndex={active ? 0 : -1}
              className={`${active ? "relative opacity-100" : "absolute inset-0 opacity-0 pointer-events-none"} flex items-center gap-4 p-3 sm:p-4 transition-opacity duration-500`}
            >
              <div className="relative h-16 w-16 sm:h-20 sm:w-20 shrink-0 overflow-hidden rounded-xl ring-1 ring-white/60 shadow-sm">
                <img src={s.image} alt="" className="h-full w-full object-cover" loading="lazy" />
              </div>
              <div className="min-w-0 flex-1 text-left">
                <div className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-[#5e8a7e]">
                  {t(s.labelKey as never)}
                </div>
                <div className="mt-0.5 truncate text-sm sm:text-base font-semibold text-slate-800">
                  {t(s.titleKey as never)}
                </div>
                <div className="mt-0.5 line-clamp-1 text-xs sm:text-sm text-slate-500">
                  {t(s.descKey as never)}
                </div>
              </div>
              <ArrowUpRight className="h-5 w-5 shrink-0 text-slate-400 group-hover:text-slate-700 transition-colors" />
            </Link>
          );
        })}
      </div>

      {/* Arrows (desktop hover) */}
      <button
        type="button"
        onClick={prev}
        aria-label="Previous"
        className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 h-9 w-9 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-slate-200 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-50"
      >
        <ChevronLeft className="h-5 w-5 text-slate-600" />
      </button>
      <button
        type="button"
        onClick={next}
        aria-label="Next"
        className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 h-9 w-9 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-slate-200 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-50"
      >
        <ChevronRight className="h-5 w-5 text-slate-600" />
      </button>

      {/* Dots */}
      <div className="mt-2 flex items-center justify-center gap-1.5">
        {spotlights.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`h-1.5 rounded-full transition-all ${i === index ? "w-5 bg-[#8BB5A9]" : "w-1.5 bg-slate-300 hover:bg-slate-400"}`}
          />
        ))}
      </div>
    </div>
  );
}

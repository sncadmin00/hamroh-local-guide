import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ArrowUpRight } from "lucide-react";
import { useSpotlights } from "@/lib/content-queries";
import { useI18n } from "@/lib/i18n";
import type { SpotlightBadge, SpotlightKind, SpotlightRow } from "@/lib/spotlights";

const AUTOPLAY_MS = 6000;

const PLACEHOLDER =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 3'><rect width='4' height='3' fill='%23e5e7eb'/></svg>";

const KIND_LABEL_KEY: Record<SpotlightKind, "spot.newGuide.label" | "spot.newRoute.label" | "spot.news.label" | "spot.newTour.label"> = {
  new_guide: "spot.newGuide.label",
  new_route: "spot.newRoute.label",
  news: "spot.news.label",
  new_tour: "spot.newTour.label",
};

const BADGE_KEY: Record<SpotlightBadge, "spot.badge.new" | "spot.badge.featured" | "spot.badge.trending" | "spot.badge.limited"> = {
  new: "spot.badge.new",
  featured: "spot.badge.featured",
  trending: "spot.badge.trending",
  limited: "spot.badge.limited",
};

const BADGE_STYLE: Record<SpotlightBadge, string> = {
  new: "bg-[#5e8a7e] text-white",
  featured: "bg-amber-400 text-slate-900",
  trending: "bg-orange-500 text-white",
  limited: "bg-rose-500 text-white",
};

export function SpotlightBanner() {
  const { t, lang } = useI18n();
  const { data: items = [] } = useSpotlights();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const count = items.length;

  useEffect(() => {
    if (paused || count <= 1) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [paused, count]);

  useEffect(() => { if (index >= count) setIndex(0); }, [count, index]);

  if (count === 0) return null;

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

  const pick = (s: SpotlightRow) => ({
    title: lang === "ru" ? s.title_ru : lang === "uz" ? s.title_uz : s.title_en,
    desc: lang === "ru" ? s.description_ru : lang === "uz" ? s.description_uz : s.description_en,
  });

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
      {/* Header strip */}
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          <span aria-hidden>🔥</span>
          <span>{t("spot.whatsNew")}</span>
        </div>
        {count > 1 && (
          <div className="text-[11px] font-medium tabular-nums text-slate-400">
            {index + 1} / {count}
          </div>
        )}
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-orange-200/50 bg-gradient-to-br from-amber-50 via-orange-50/60 to-[#D5A08D]/15 shadow-[0_12px_40px_-15px_rgba(234,88,12,0.18)]">
        {/* Top accent line */}
        <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-400/60 to-transparent" />
        {items.map((s, i) => {
          const active = i === index;
          const { title, desc } = pick(s);
          return (
            <a
              key={s.id}
              href={s.href}
              aria-hidden={!active}
              tabIndex={active ? 0 : -1}
              className={`${active ? "relative opacity-100" : "absolute inset-0 opacity-0 pointer-events-none"} flex items-center gap-4 sm:gap-5 p-4 sm:p-5 transition-opacity duration-500`}
            >
              <div className="relative h-44 w-44 sm:h-64 sm:w-64 shrink-0 overflow-hidden rounded-2xl ring-1 ring-white/60 shadow-md">
                <img src={s.image_url || PLACEHOLDER} alt="" className="h-full w-full object-cover" loading="lazy" />
                {s.badge && (
                  <span className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-sm ${BADGE_STYLE[s.badge]}`}>
                    {t(BADGE_KEY[s.badge])}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1 text-left">
                <div className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-gold">
                  <span aria-hidden className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-orange-500" />
                  </span>
                  {t(KIND_LABEL_KEY[s.kind])}
                </div>
                <div className="mt-1 line-clamp-2 text-base sm:text-xl font-semibold text-slate-800 leading-snug">
                  {title}
                </div>
                <div className="mt-1.5 line-clamp-2 text-sm sm:text-base text-slate-500 leading-relaxed">
                  {desc}
                </div>
              </div>

              </div>
            </a>
          );
        })}
      </div>


      {count > 1 && (
        <>
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

          <div className="mt-2 flex items-center justify-center gap-1.5">
            {items.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${i === index ? "w-5 bg-gold" : "w-1.5 bg-slate-300 hover:bg-slate-400"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

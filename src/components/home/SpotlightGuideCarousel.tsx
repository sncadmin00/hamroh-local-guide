import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, MapPin, Star } from "lucide-react";
import { useGuides } from "@/lib/content-queries";
import { useI18n } from "@/lib/i18n";
import { CarouselArrows, ScrollRow, useCarouselControls } from "./ScrollCarousel";


export function SpotlightGuideCarousel() {
  const { t } = useI18n();
  const { data: guides = [] } = useGuides();
  const items = useMemo(
    () => [...guides].sort((a, b) => b.rating - a.rating).slice(0, 12),
    [guides],
  );
  const { ref, scroll } = useCarouselControls(280);

  if (items.length === 0) return null;

  return (
    <section className="relative px-6 md:px-12 py-16 md:py-[72px] max-w-[1280px] mx-auto">
      <span className="ghost-number">02</span>
      <div className="flex items-baseline justify-between mb-9 gap-4">
        <h2
          className="font-display text-[1.6rem] md:text-[2.2rem] tracking-tight"
          style={{ color: "var(--foreground)", fontFamily: "'DM Serif Display', serif" }}
        >
          {t("home.spotlightGuide.title")}
        </h2>
        <div className="flex items-center gap-4 shrink-0">
          <Link
            to="/guides"
            className="text-sm font-medium inline-flex items-center gap-1.5 hover:gap-2.5 transition-all"
            style={{ color: "var(--gold)" }}
          >
            {t("featured.viewAll")} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <CarouselArrows onPrev={() => scroll(-1)} onNext={() => scroll(1)} />
        </div>
      </div>

      <ScrollRow scrollerRef={ref} cardWidth={280}>

        {items.map((g) => (
          <Link
            key={g.id}
            to="/guides/$guideId"
            params={{ guideId: g.id }}
            className="glass-card group relative flex flex-col items-center text-center px-5 pt-7 pb-6 overflow-hidden"

          >
            <div className="relative mb-4">
              <img
                src={g.photo}
                alt={g.name}
                loading="lazy"
                className="h-[88px] w-[88px] rounded-full object-cover border-2 transition-colors"
                style={{ borderColor: "var(--border)" }}
              />
              {g.verified && (
                <span
                  className="absolute bottom-0.5 right-0.5 h-[22px] w-[22px] rounded-full flex items-center justify-center border-2"
                  style={{ background: "var(--gold)", borderColor: "var(--card)" }}
                >
                  <Check className="h-3 w-3" strokeWidth={3} style={{ color: "var(--background)" }} />
                </span>
              )}
            </div>
            <h3 className="text-base font-semibold mb-1" style={{ color: "var(--foreground)" }}>
              {g.name.split(" ")[0]}
            </h3>
            <p
              className="text-xs mb-3 inline-flex items-center justify-center gap-1"
              style={{ color: "var(--muted-foreground)" }}
            >
              <MapPin className="h-3 w-3" style={{ color: "var(--gold)" }} />
              {g.city}
            </p>
            {g.languages?.length > 0 && (
              <p
                className="text-[0.72rem] font-medium uppercase tracking-wider mb-4"
                style={{ color: "var(--muted-foreground)" }}
              >
                {g.languages.slice(0, 4).join(" · ")}
              </p>
            )}
            <div className="flex items-center justify-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className="h-3.5 w-3.5"
                  style={{
                    color: i < Math.round(g.rating) ? "var(--gold)" : "var(--border)",
                    fill: i < Math.round(g.rating) ? "var(--gold)" : "transparent",
                  }}
                />
              ))}
            </div>
          </Link>
        ))}
      </ScrollRow>

    </section>
  );
}

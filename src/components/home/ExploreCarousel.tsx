import { useRef } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { ExploreCard } from "@/lib/explore.functions";

const KIND_COLORS: Record<ExploreCard["kind"], string> = {
  tour: "#1F9BB4",
  guide: "#C9A84C",
  place: "#7AB87A",
  article: "#B47AC9",
  spotlight: "#E07A5F",
};

export function ExploreCarousel({ cards }: { cards: ExploreCard[] }) {
  const { t } = useI18n();
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 1 | -1) => {
    scrollRef.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  };

  const renderCard = (c: ExploreCard) => {
    const inner = (
      <>
        <div className="aspect-[4/3] bg-secondary overflow-hidden">
          {c.image ? <img src={c.image} alt={c.title} className="w-full h-full object-cover" loading="lazy" /> : null}
        </div>
        <div className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{ background: `color-mix(in srgb, ${KIND_COLORS[c.kind]} 15%, transparent)`, color: KIND_COLORS[c.kind] }}
            >
              {c.kind}
            </span>
            {(c.kind === "tour" || c.kind === "guide") && c.rating != null && (
              <span className="inline-flex items-center gap-1 text-xs" style={{ color: "var(--muted-foreground)" }}>
                <Star className="h-3 w-3 fill-current" style={{ color: "#C9A84C" }} />
                {Number(c.rating).toFixed(1)}
              </span>
            )}
          </div>
          <p className="font-semibold text-sm truncate" style={{ color: "var(--foreground)" }}>{c.title}</p>
        </div>
      </>
    );

    const cls = "shrink-0 w-[260px] md:w-[300px] snap-start rounded-2xl overflow-hidden transition-transform hover:-translate-y-1";
    const style = { background: "var(--card)", border: "1px solid var(--border)" } as const;
    const key = `${c.kind}-${c.id}`;

    if (c.kind === "tour") return <Link key={key} to="/tours/$slug" params={{ slug: c.slug }} className={cls} style={style}>{inner}</Link>;
    if (c.kind === "guide") return <Link key={key} to="/guides/$guideId" params={{ guideId: c.slug }} className={cls} style={style}>{inner}</Link>;
    if (c.kind === "place") return <Link key={key} to="/explore/$slug" params={{ slug: c.slug }} className={cls} style={style}>{inner}</Link>;
    if (c.kind === "article") return <div key={key} className={cls} style={style}>{inner}</div>;
    return <a key={key} href={c.href} className={cls} style={style}>{inner}</a>;
  };

  return (
    <section className="max-w-[1280px] mx-auto px-4 md:px-8 pt-10">
      <div className="flex items-end justify-between mb-4">
        <h2 className="text-2xl md:text-3xl tracking-tight" style={{ color: "var(--foreground)", fontFamily: "'DM Serif Display', serif" }}>
          {t("home.explore") || "Explore"}
        </h2>
        <div className="hidden md:flex gap-2">
          <button onClick={() => scroll(-1)} aria-label="Prev" className="h-9 w-9 rounded-full inline-flex items-center justify-center" style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }}>
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={() => scroll(1)} aria-label="Next" className="h-9 w-9 rounded-full inline-flex items-center justify-center" style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }}>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      {cards.length === 0 ? (
        <div className="py-8 text-sm" style={{ color: "var(--muted-foreground)" }}>Loading…</div>
      ) : (
        <div ref={scrollRef} className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-none" style={{ scrollbarWidth: "none" }}>
          {cards.map(renderCard)}
        </div>
      )}
    </section>
  );
}

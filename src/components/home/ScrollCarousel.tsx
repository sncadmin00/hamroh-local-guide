import { useRef, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  children: ReactNode;
  /** Desktop card width in px (e.g. 280 or 320) */
  cardWidth?: number;
  /** Mobile card width as vw (e.g. 72) */
  mobileVw?: number;
  /** Render the prev/next buttons (placed by the parent). */
  renderControls?: (scroll: (dir: 1 | -1) => void) => ReactNode;
};

export function useCarouselControls(cardWidth: number) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    const step = isMobile ? el.clientWidth * 0.75 : cardWidth + 20;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };
  return { ref, scroll };
}

export function CarouselArrows({
  onPrev,
  onNext,
}: {
  onPrev: () => void;
  onNext: () => void;
}) {
  const base =
    "h-9 w-9 rounded-full flex items-center justify-center transition-all";
  const style = {
    background: "#1a2236",
    border: "1px solid #1e2d45",
    color: "#C9A84C",
  } as const;
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label="Previous"
        onClick={onPrev}
        className={`${base} hover:[border-color:rgba(201,168,76,0.5)] hover:[background:#1e2d45]`}
        style={style}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label="Next"
        onClick={onNext}
        className={`${base} hover:[border-color:rgba(201,168,76,0.5)] hover:[background:#1e2d45]`}
        style={style}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ScrollRow({
  scrollerRef,
  children,
  cardWidth,
  mobileVw = 72,
}: {
  scrollerRef: React.RefObject<HTMLDivElement | null>;
  children: ReactNode;
  cardWidth: number;
  mobileVw?: number;
}) {
  return (
    <div
      ref={scrollerRef}
      className="flex overflow-x-auto snap-x snap-mandatory gap-5 pb-4 -mx-6 px-6 md:-mx-12 md:px-12 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {Array.isArray(children)
        ? children.map((child, i) => (
            <div
              key={i}
              className="snap-start shrink-0"
              style={{
                width: `min(${mobileVw}vw, ${cardWidth}px)`,
              }}
            >
              <div
                className="hidden md:block"
                style={{ width: `${cardWidth}px` }}
              />
              {child}
            </div>
          ))
        : children}
    </div>
  );
}

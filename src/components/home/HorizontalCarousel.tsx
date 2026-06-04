import { useRef, useState, useEffect, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  children: ReactNode;
  /** Tailwind classes controlling card width per breakpoint. */
  itemClassName?: string;
  /** Single row on mobile, two rows on desktop. */
  twoRowsDesktop?: boolean;
};

export function HorizontalCarousel({
  children,
  itemClassName = "w-[260px] md:w-[280px]",
  twoRowsDesktop = true,
}: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const updateButtons = () => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    updateButtons();
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => updateButtons();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", updateButtons);
    const ro = new ResizeObserver(() => updateButtons());
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", updateButtons);
      ro.disconnect();
    };
  }, [children]);

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: "smooth" });
  };

  return (
    <div className="relative -mx-6 px-6">
      <button
        type="button"
        onClick={() => scrollBy(-1)}
        disabled={!canLeft}
        aria-label="Scroll left"
        className={`hidden md:flex absolute left-1 top-1/2 -translate-y-1/2 z-10 h-10 w-10 items-center justify-center rounded-full bg-background shadow-md ring-1 ring-border transition-opacity ${
          canLeft ? "opacity-100 hover:bg-secondary" : "opacity-0 pointer-events-none"
        }`}
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={() => scrollBy(1)}
        disabled={!canRight}
        aria-label="Scroll right"
        className={`hidden md:flex absolute right-1 top-1/2 -translate-y-1/2 z-10 h-10 w-10 items-center justify-center rounded-full bg-background shadow-md ring-1 ring-border transition-opacity ${
          canRight ? "opacity-100 hover:bg-secondary" : "opacity-0 pointer-events-none"
        }`}
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      <div
        ref={scrollerRef}
        className="overflow-x-auto pb-3 snap-x snap-mandatory [scrollbar-width:thin]"
      >
        <div
          className={`grid grid-flow-col ${
            twoRowsDesktop ? "grid-rows-1 md:grid-rows-2" : "grid-rows-1"
          } gap-4`}
          style={{ gridAutoColumns: "max-content" }}
        >
          {Array.isArray(children)
            ? children.map((child, i) => (
                <div key={i} className={`${itemClassName} snap-start`}>
                  {child}
                </div>
              ))
            : children}
        </div>
      </div>
    </div>
  );
}

import { useRef, useEffect, Children, type ReactNode } from "react";
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
  const trackRef = useRef<HTMLDivElement>(null);

  const items = Children.toArray(children);
  const loop = items.length > 1;
  // Duplicate items to enable seamless infinite scroll.
  const rendered = loop ? [...items, ...items] : items;

  // Seamless loop: when scrolling past the first copy, jump back by one copy's width.
  useEffect(() => {
    const scroller = scrollerRef.current;
    const track = trackRef.current;
    if (!scroller || !track || !loop) return;

    const getHalf = () => track.scrollWidth / 2;

    const onScroll = () => {
      const half = getHalf();
      if (half <= 0) return;
      if (scroller.scrollLeft >= half) {
        scroller.scrollLeft -= half;
      } else if (scroller.scrollLeft <= 0) {
        scroller.scrollLeft += half;
      }
    };
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => scroller.removeEventListener("scroll", onScroll);
  }, [loop, rendered.length]);

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
        aria-label="Scroll left"
        className="hidden md:flex absolute left-1 top-1/2 -translate-y-1/2 z-10 h-10 w-10 items-center justify-center rounded-full bg-background shadow-md ring-1 ring-border hover:bg-secondary"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={() => scrollBy(1)}
        aria-label="Scroll right"
        className="hidden md:flex absolute right-1 top-1/2 -translate-y-1/2 z-10 h-10 w-10 items-center justify-center rounded-full bg-background shadow-md ring-1 ring-border hover:bg-secondary"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      <div
        ref={scrollerRef}
        className="overflow-x-auto pb-3 [scrollbar-width:thin]"
      >
        <div
          ref={trackRef}
          className={`grid grid-flow-col ${
            twoRowsDesktop ? "grid-rows-1 md:grid-rows-2" : "grid-rows-1"
          } gap-4`}
          style={{ gridAutoColumns: "max-content" }}
        >
          {rendered.map((child, i) => (
            <div key={i} className={itemClassName}>
              {child}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

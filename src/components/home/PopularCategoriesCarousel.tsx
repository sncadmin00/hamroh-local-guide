import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CategoryIcon } from "@/components/CategoryIcon";
import { supabase } from "@/integrations/supabase/client";
import { useCategories } from "@/lib/content-queries";
import { useI18n } from "@/lib/i18n";

import coverCity from "@/assets/cat-city.jpg";
import coverGastro from "@/assets/cat-gastro.jpg";
import coverMountains from "@/assets/cat-mountains.jpg";
import coverPeople from "@/assets/cat-people.jpg";
import coverHistory from "@/assets/cat-history.jpg";
import coverCrafts from "@/assets/cat-crafts.jpg";
import coverCulture from "@/assets/cat-culture.jpg";
import coverPhoto from "@/assets/cat-photo.jpg";
import coverLocals from "@/assets/cat-locals.jpg";

const COVER: Record<string, string> = {
  city: coverCity,
  gastro: coverGastro,
  mountains: coverMountains,
  people: coverPeople,
  history: coverHistory,
  crafts: coverCrafts,
  culture: coverCulture,
  photo: coverPhoto,
  "locals-favourite": coverLocals,
};

function useCategoryGuideCounts() {
  return useQuery({
    queryKey: ["category-guide-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guide_categories")
        .select("category_id");
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const row of data ?? []) {
        const id = (row as { category_id: string }).category_id;
        counts[id] = (counts[id] ?? 0) + 1;
      }
      return counts;
    },
  });
}

export function PopularCategoriesCarousel() {
  const { t, tCategory } = useI18n();
  const { data: categories = [] } = useCategories();
  const { data: counts = {} } = useCategoryGuideCounts();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const items = useMemo(() => categories, [categories]);

  const updateButtons = () => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    updateButtons();
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateButtons, { passive: true });
    window.addEventListener("resize", updateButtons);
    return () => {
      el.removeEventListener("scroll", updateButtons);
      window.removeEventListener("resize", updateButtons);
    };
  }, [items.length]);

  if (items.length === 0) return null;

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.8), behavior: "smooth" });
  };

  return (
    <section className="px-6 py-10 md:py-14">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-end justify-between mb-5 md:mb-6">
          <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground">
            {t("home.categories.title")}
          </h2>
          <Link
            to="/guides"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("home.categories.viewAll")}
          </Link>
        </div>

        <div className="group relative">
          <div
            ref={scrollerRef}
            className="flex gap-4 md:gap-5 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            {items.map((c) => {
              const cover = COVER[c.slug] ?? coverCity;
              const count = counts[c.id] ?? 0;
              return (
                <Link
                  key={c.id}
                  to="/guides"
                  search={{ category: c.slug }}
                  className="snap-start shrink-0 w-[180px] md:w-[220px] group/card"
                >
                  <div className="relative rounded-2xl bg-card shadow-[0_6px_20px_-8px_rgba(0,0,0,0.18)] ring-1 ring-black/5 transition-shadow duration-300 group-hover/card:shadow-[0_12px_28px_-10px_rgba(0,0,0,0.25)]">
                    <div className="relative aspect-[4/3] w-full">
                      <div className="absolute inset-0 overflow-hidden rounded-t-2xl bg-secondary">
                        <img
                          src={cover}
                          alt={tCategory(c.slug, c.name)}
                          loading="lazy"
                          width={400}
                          height={300}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover/card:scale-[1.05]"
                        />
                      </div>
                      <div className="absolute bottom-0 left-6 translate-y-1/2 z-20 h-12 w-12 rounded-full bg-card border-2 border-card shadow-[0_4px_10px_-2px_rgba(0,0,0,0.2)] flex items-center justify-center">
                        <CategoryIcon name={c.icon} className="h-6 w-6 text-foreground" />
                      </div>
                    </div>
                    <div className="px-4 pt-6 pb-4 rounded-b-2xl">
                      <h3 className="font-display text-[15px] md:text-base font-semibold text-foreground line-clamp-1">
                        {tCategory(c.slug, c.name)}
                      </h3>
                      <p className="mt-0.5 text-xs md:text-sm text-muted-foreground">
                        {count} {t("home.categories.guidesCount")}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {canPrev && (
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              aria-label="Previous"
              className="hidden md:flex absolute left-0 top-[28%] -translate-x-1/2 -translate-y-1/2 h-10 w-10 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-slate-200 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-50"
            >
              <ChevronLeft className="h-5 w-5 text-slate-700" />
            </button>
          )}
          {canNext && (
            <button
              type="button"
              onClick={() => scrollBy(1)}
              aria-label="Next"
              className="hidden md:flex absolute right-0 top-[28%] translate-x-1/2 -translate-y-1/2 h-10 w-10 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-slate-200 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-50"
            >
              <ChevronRight className="h-5 w-5 text-slate-700" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { CategoryIcon } from "@/components/CategoryIcon";
import { supabase } from "@/integrations/supabase/client";
import { useCategories } from "@/lib/content-queries";
import { useI18n } from "@/lib/i18n";

import coverCity from "@/assets/cat-city.jpg";
import coverGastro from "@/assets/cat-gastro.jpg";
import coverMountains from "@/assets/cat-mountains.jpg";
import coverPeople from "@/assets/cat-people.jpg";
import coverCulture from "@/assets/cat-culture.jpg";
import coverLocals from "@/assets/cat-locals.jpg";

const COVER: Record<string, string> = {
  "city-tours": coverCity,
  "food-culture": coverGastro,
  "nature-adventure": coverMountains,
  "local-life": coverPeople,
  "history-heritage": coverCulture,
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

  if (categories.length === 0) return null;

  return (
    <section className="px-6 md:px-12 py-16 md:py-[72px] max-w-[1280px] mx-auto">
      <div className="flex items-baseline justify-between mb-9">
        <h2
          className="font-display text-[1.6rem] md:text-[2.2rem] tracking-tight"
          style={{ color: "#F0EBE0", fontFamily: "'DM Serif Display', serif" }}
        >
          {t("home.categories.title")}
        </h2>
        <Link
          to="/guides"
          className="text-sm font-medium inline-flex items-center gap-1.5 hover:gap-2.5 transition-all"
          style={{ color: "#C9A84C" }}
        >
          {t("home.categories.viewAll")} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {categories.map((c) => {
          const cover = COVER[c.slug] ?? coverCity;
          const count = counts[c.id] ?? 0;
          return (
            <Link
              key={c.id}
              to="/guides"
              search={{ category: c.slug }}
              className="group relative rounded-2xl overflow-hidden aspect-[3/4] border transition-all hover:-translate-y-1.5"
              style={{ borderColor: "rgba(201,168,76,0.12)" }}
            >
              <img
                src={cover}
                alt={tCategory(c.slug, c.name)}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to top, rgba(10,15,30,0.92) 0%, rgba(10,15,30,0.3) 50%, rgba(10,15,30,0.1) 100%)",
                }}
              />
              <div className="absolute inset-x-0 bottom-0 p-4">
                <div
                  className="mb-2.5 h-[34px] w-[34px] rounded-lg flex items-center justify-center border"
                  style={{
                    background: "rgba(201,168,76,0.15)",
                    borderColor: "rgba(201,168,76,0.3)",
                    color: "#C9A84C",
                  }}
                >
                  <CategoryIcon name={c.icon} className="h-4 w-4" />
                </div>
                <h3
                  className="text-[0.95rem] font-semibold mb-0.5 line-clamp-1"
                  style={{ color: "#F0EBE0" }}
                >
                  {tCategory(c.slug, c.name)}
                </h3>
                <p
                  className="text-[0.72rem] tracking-wider"
                  style={{ color: "#4A6080" }}
                >
                  {count} {t("home.categories.guidesCount")}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

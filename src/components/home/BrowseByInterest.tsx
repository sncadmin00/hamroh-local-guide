import { Link } from "@tanstack/react-router";
import { CategoryIcon } from "@/components/CategoryIcon";
import { useCategories } from "@/lib/content-queries";
import { useI18n } from "@/lib/i18n";

export function BrowseByInterest({ headless = false }: { headless?: boolean }) {
  const { t, tCategory } = useI18n();
  const { data: categories = [] } = useCategories();
  if (categories.length === 0) return null;

  const list = (
    <div className="flex gap-2.5 overflow-x-auto scroll-smooth px-6 pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      {categories.map((c) => (
        <Link
          key={c.id}
          to="/guides"
          search={{ category: c.slug }}
          className="group shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border border-slate-200/70 hover:border-slate-300 hover:bg-slate-50 transition-colors"
        >
          <span className="w-7 h-7 rounded-full bg-gradient-to-br from-[#62A1B1]/15 to-[#D5A08D]/15 flex items-center justify-center text-slate-700">
            <CategoryIcon name={c.icon} className="h-4 w-4" strokeWidth={1.75} />
          </span>
          <span className="text-sm font-medium text-slate-800 whitespace-nowrap">
            {tCategory(c.slug, c.name)}
          </span>
        </Link>
      ))}
    </div>
  );

  if (headless) return <div className="-mx-6">{list}</div>;

  return (
    <section className="py-12 md:py-16">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-6 md:mb-8 px-6">
          <h2 className="font-display text-2xl md:text-3xl font-semibold text-slate-900">
            {t("browse.title")}
          </h2>
          <p className="mt-2 text-sm text-slate-500">{t("browse.subtitle")}</p>
        </div>
        {list}
      </div>
    </section>
  );
}

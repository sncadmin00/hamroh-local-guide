import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { GuideCard } from "@/components/GuideCard";
import { CityPicker } from "@/components/CityPicker";
import { CategoryIcon } from "@/components/CategoryIcon";
import { useGuides, useCategories } from "@/lib/content-queries";
import { useI18n } from "@/lib/i18n";


export const Route = createFileRoute("/guides")({
  validateSearch: (search: Record<string, unknown>): { city?: string; category?: string; lang?: string } => ({
    city: typeof search.city === "string" ? search.city : undefined,
    category: typeof search.category === "string" ? search.category : undefined,
    lang: typeof search.lang === "string" ? search.lang : undefined,
  }),
  head: () => ({
    meta: [
      { title: "All guides — Hamroh" },
      { name: "description", content: "Browse verified local guides in cities around the world." },
    ],
  }),
  component: GuidesPage,
});


function GuidesPage() {
  const { t, tCategory, tLanguage } = useI18n();
  const { city: initialCity, category: initialCategory, lang: initialLang } = Route.useSearch();

  const [city, setCity] = useState<"All" | string>(initialCity ?? "All");
  const [category, setCategory] = useState<"All" | string>(initialCategory ?? "All");
  const [lang, setLang] = useState<string>(initialLang ?? "All");
  const [instant, setInstant] = useState(false);
  const { data: guides = [], isLoading } = useGuides();
  const { data: categories = [] } = useCategories();

  const allLangs = Array.from(new Set(guides.flatMap((g) => g.languages))).sort();

  const filtered = guides.filter(
    (g) =>
      (city === "All" || g.city === city) &&
      (lang === "All" || g.languages.includes(lang)) &&
      (!instant || g.instantBook) &&
      (category === "All" || g.categories.some((c) => c.slug === category)),
  );


  const pillBase = "inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-sm transition";
  const pillInactive = "bg-[var(--secondary)] border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]";
  const pillActive = "bg-[#C9A84C] text-[var(--background)] font-semibold border-0";

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <SiteHeader />
      <section className="border-b border-[var(--border)]">
        <div className="container mx-auto px-4 py-12 md:py-16">
          <h1 className="font-display text-4xl font-semibold md:text-5xl text-[var(--foreground)]">Find your guide</h1>
          <p className="mt-3 max-w-xl text-[var(--muted-foreground)]">
            {isLoading ? "Loading guides…" : `${filtered.length} verified locals ready to show you around.`}
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-10" aria-labelledby="filter-heading">
        <h2 id="filter-heading" className="sr-only">Filter guides</h2>
        <div className="flex flex-col gap-4 rounded-2xl bg-[var(--secondary)] border border-[var(--border)] p-4 md:flex-row md:items-center md:p-5">
          <CityPicker value={city} onChange={setCity} />

          <div className="md:ml-auto md:pl-5 md:border-l md:border-[var(--border)] flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-[var(--foreground)]">
              <input type="checkbox" checked={instant} onChange={(e) => setInstant(e.target.checked)} className="accent-[#C9A84C]" />
              Instant book
            </label>
          </div>
        </div>

        {categories.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => setCategory("All")}
              className={`${pillBase} ${category === "All" ? pillActive : pillInactive}`}
            >
              All categories
            </button>
            {categories.map((c) => {
              const on = category === c.slug;
              return (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.slug)}
                  className={`${pillBase} ${on ? pillActive : pillInactive}`}
                >
                  <CategoryIcon name={c.icon} className="h-4 w-4" />
                  {tCategory(c.slug, c.name)}
                </button>
              );
            })}
          </div>
        )}

        {allLangs.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              onClick={() => setLang("All")}
              className={`${pillBase} ${lang === "All" ? pillActive : pillInactive}`}
            >
              {t("tours.allLanguages")}
            </button>
            {allLangs.map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`${pillBase} ${lang === l ? pillActive : pillInactive}`}
              >
                {tLanguage(l)}
              </button>
            ))}
          </div>
        )}

        <h2 id="guides-heading" className="sr-only mt-10">
          {isLoading ? "Loading guides" : `${filtered.length} guides found`}
        </h2>
        {isLoading ? (
          <div className="mt-16 text-center text-[var(--muted-foreground)]">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="mt-16 text-center text-[var(--muted-foreground)]">No guides match your filters yet — try widening your search.</div>
        ) : (
          <div aria-labelledby="guides-heading" className="mt-10 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((g) => <GuideCard key={g.id} guide={g} />)}
          </div>
        )}
      </section>

      <SiteFooter />
    </div>
  );
}

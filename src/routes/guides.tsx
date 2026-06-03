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
  validateSearch: (search: Record<string, unknown>): { city?: string; category?: string } => ({
    city: typeof search.city === "string" ? search.city : undefined,
    category: typeof search.category === "string" ? search.category : undefined,
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
  const { tCategory } = useI18n();
  const { city: initialCity, category: initialCategory } = Route.useSearch();

  const [city, setCity] = useState<"All" | string>(initialCity ?? "All");
  const [category, setCategory] = useState<"All" | string>(initialCategory ?? "All");
  const [lang, setLang] = useState<string>("All");
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

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <section className="border-b border-border/60 bg-secondary/30">
        <div className="container mx-auto px-4 py-12 md:py-16">
          <h1 className="font-display text-4xl font-semibold md:text-5xl">Find your guide</h1>
          <p className="mt-3 max-w-xl text-muted-foreground">
            {isLoading ? "Loading guides…" : `${filtered.length} verified locals ready to show you around.`}
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-10" aria-labelledby="filter-heading">
        <h2 id="filter-heading" className="sr-only">Filter guides</h2>
        <div className="flex flex-col gap-4 rounded-2xl bg-card p-4 ring-1 ring-border/60 shadow-[var(--shadow-card)] md:flex-row md:items-center md:p-5">
          <CityPicker value={city} onChange={setCity} />

          <div className="md:ml-auto flex flex-wrap items-center gap-3">
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="h-10 rounded-full border border-input bg-background px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="All">All languages</option>
              {allLangs.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm font-medium">
              <input type="checkbox" checked={instant} onChange={(e) => setInstant(e.target.checked)} className="accent-primary" />
              Instant book
            </label>
          </div>
        </div>

        {categories.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => setCategory("All")}
              className={`inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-sm font-medium ring-1 transition ${
                category === "All"
                  ? "bg-primary text-primary-foreground ring-primary"
                  : "bg-card ring-border/60 text-muted-foreground hover:bg-secondary/60"
              }`}
            >
              All categories
            </button>
            {categories.map((c) => {
              const on = category === c.slug;
              return (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.slug)}
                  className={`inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-sm font-medium ring-1 transition ${
                    on
                      ? "bg-primary text-primary-foreground ring-primary"
                      : "bg-card ring-border/60 text-muted-foreground hover:bg-secondary/60"
                  }`}
                >
                  <CategoryIcon name={c.icon} className="h-4 w-4" />
                  {tCategory(c.slug, c.name)}
                </button>
              );
            })}
          </div>
        )}

        <h2 id="guides-heading" className="sr-only mt-10">
          {isLoading ? "Loading guides" : `${filtered.length} guides found`}
        </h2>
        {isLoading ? (
          <div className="mt-16 text-center text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="mt-16 text-center text-muted-foreground">No guides match your filters yet — try widening your search.</div>
        ) : (
          <div aria-labelledby="guides-heading" className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((g) => <GuideCard key={g.id} guide={g} />)}
          </div>
        )}
      </section>

      <SiteFooter />
    </div>
  );
}

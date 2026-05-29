import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { GuideCard } from "@/components/GuideCard";
import { CityPicker } from "@/components/CityPicker";
import { useGuides } from "@/lib/content-queries";
export const Route = createFileRoute("/guides")({
  validateSearch: (search: Record<string, unknown>): { city?: string } => ({
    city: typeof search.city === "string" ? search.city : undefined,
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
  const { city: initialCity } = Route.useSearch();
  const [city, setCity] = useState<"All" | string>(initialCity ?? "All");
  const [lang, setLang] = useState<string>("All");
  const [instant, setInstant] = useState(false);
  const { data: guides = [], isLoading } = useGuides();

  const allLangs = Array.from(new Set(guides.flatMap((g) => g.languages))).sort();

  const filtered = guides.filter(
    (g) =>
      (city === "All" || g.city === city) &&
      (lang === "All" || g.languages.includes(lang)) &&
      (!instant || g.instantBook),
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

      <section className="container mx-auto px-4 py-10">
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

        {isLoading ? (
          <div className="mt-16 text-center text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="mt-16 text-center text-muted-foreground">No guides match your filters yet — try widening your search.</div>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((g) => <GuideCard key={g.id} guide={g} />)}
          </div>
        )}
      </section>

      <SiteFooter />
    </div>
  );
}

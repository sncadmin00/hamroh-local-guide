import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useTours, useCities } from "@/lib/content-queries";
import { useI18n } from "@/lib/i18n";
import { Clock, MapPin } from "lucide-react";

export const Route = createFileRoute("/tours")({
  head: () => ({
    meta: [
      { title: "Tours — Hamroh" },
      { name: "description", content: "Curated tour routes across Uzbekistan, led by verified local guides." },
      { property: "og:title", content: "Tours — Hamroh" },
      { property: "og:description", content: "Curated tour routes across Uzbekistan, led by verified local guides." },
    ],
  }),
  component: ToursPage,
  errorComponent: ({ error }) => <div className="p-8 text-sm text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8 text-sm">Not found.</div>,
});

const PLACEHOLDER =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 3'><rect width='4' height='3' fill='%23e5e7eb'/></svg>";

function ToursPage() {
  const { t } = useI18n();
  const [citySlug, setCitySlug] = useState<string>("");
  const { data: cities = [] } = useCities();
  const { data: tours = [], isLoading } = useTours();

  const filtered = useMemo(
    () => (citySlug ? tours.filter((tr) => tr.cities?.slug === citySlug) : tours),
    [tours, citySlug]
  );

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-10">
        <h1 className="font-display text-3xl sm:text-4xl font-semibold">{t("tours.title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("tours.subtitle")}</p>

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            onClick={() => setCitySlug("")}
            className={`px-3 h-8 rounded-full text-sm ${citySlug === "" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-secondary/80"}`}
          >
            {t("tours.allCities")}
          </button>
          {cities.map((c) => (
            <button
              key={c.id}
              onClick={() => setCitySlug(c.slug)}
              className={`px-3 h-8 rounded-full text-sm ${citySlug === c.slug ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-secondary/80"}`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {isLoading ? (
          <p className="mt-10 text-sm text-muted-foreground">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="mt-10 text-sm text-muted-foreground">{t("tours.empty")}</p>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((tr) => (
              <Link
                key={tr.id}
                to="/tours/$slug"
                params={{ slug: tr.slug }}
                className="group overflow-hidden rounded-2xl bg-card ring-1 ring-border/60 hover:shadow-lg transition-shadow"
              >
                <div className="aspect-[4/3] w-full overflow-hidden bg-secondary">
                  <img
                    src={tr.cover_url || PLACEHOLDER}
                    alt={tr.title}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                    loading="lazy"
                  />
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {tr.cities?.name && (
                      <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{tr.cities.name}</span>
                    )}
                    {tr.duration_hours > 0 && (
                      <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{tr.duration_hours}{t("tours.hours")}</span>
                    )}
                  </div>
                  <h3 className="mt-1 font-semibold leading-snug">{tr.title}</h3>
                  {tr.short_description && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{tr.short_description}</p>
                  )}
                  <div className="mt-3 text-sm">
                    <span className="text-muted-foreground">{t("tours.priceFrom")} </span>
                    <span className="font-semibold">${Number(tr.price_from).toFixed(0)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

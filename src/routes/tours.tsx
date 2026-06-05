import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useTours, useCities, useCategories, pickTourTitle } from "@/lib/content-queries";
import { useI18n } from "@/lib/i18n";
import { Clock, MapPin, Car } from "lucide-react";

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
  const { t, tCategory, lang } = useI18n();
  const [citySlug, setCitySlug] = useState<string>("");
  const [categorySlug, setCategorySlug] = useState<string>("");
  const { data: cities = [] } = useCities();
  const { data: categories = [] } = useCategories();
  const { data: tours = [], isLoading } = useTours();

  const filtered = useMemo(
    () =>
      tours.filter((tr) => {
        if (citySlug && tr.cities?.slug !== citySlug) return false;
        if (categorySlug && !tr.tour_categories?.some((tc) => tc.categories?.slug === categorySlug)) return false;
        return true;
      }),
    [tours, citySlug, categorySlug]
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

        <div className="mt-2 flex flex-wrap gap-2">
          <button
            onClick={() => setCategorySlug("")}
            className={`px-3 h-8 rounded-full text-sm ${categorySlug === "" ? "bg-foreground text-background" : "bg-secondary text-foreground hover:bg-secondary/80"}`}
          >
            {t("tours.allCategories")}
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategorySlug(c.slug)}
              className={`px-3 h-8 rounded-full text-sm ${categorySlug === c.slug ? "bg-foreground text-background" : "bg-secondary text-foreground hover:bg-secondary/80"}`}
            >
              {tCategory(c.slug, c.name)}
            </button>
          ))}
        </div>

        {isLoading ? (
          <p className="mt-10 text-sm text-muted-foreground">{t("tours.loading")}</p>
        ) : filtered.length === 0 ? (
          <p className="mt-10 text-sm text-muted-foreground">{t("tours.empty")}</p>
        ) : (
          <div className="mt-8 grid gap-3 grid-cols-2">
            {filtered.map((tr) => {
              const langPrices = tr.languages
                .map((lng) => ({ lng, price: tr.price_by_language[lng] ?? Number(tr.price_from) }))
                .filter((x) => x.price > 0);
              return (
                <Link
                  key={tr.id}
                  to="/tours/$slug"
                  params={{ slug: tr.slug }}
                  className="group overflow-hidden rounded-xl bg-card ring-1 ring-border/60 hover:shadow-md transition-shadow"
                >
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-secondary">
                    <img
                      src={tr.cover_url || PLACEHOLDER}
                      alt={pickTourTitle(tr, lang)}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                      loading="lazy"
                    />
                    {tr.transport_included && (
                      <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-background/95 px-1.5 py-0.5 text-[9px] font-medium text-primary backdrop-blur">
                        <Car className="h-2.5 w-2.5" /> transport
                      </span>
                    )}
                  </div>
                  <div className="p-2.5">
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground flex-wrap">
                      {tr.cities?.name && (
                        <span className="inline-flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{tr.cities.name}</span>
                      )}
                      {tr.duration_hours > 0 && (
                        <span className="inline-flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{Number(tr.duration_hours)}{t("tours.hours")}</span>
                      )}
                    </div>
                    <h3 className="mt-0.5 text-sm font-semibold leading-snug line-clamp-2">{pickTourTitle(tr, lang)}</h3>
                    {tr.guides?.name && (
                      <p className="mt-0.5 text-[10px] text-muted-foreground">{t("tours.by")} {tr.guides.name}</p>
                    )}
                    {langPrices.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {langPrices.slice(0, 3).map(({ lng, price }) => (
                          <span key={lng} className="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-[9px]">
                            <span className="font-medium">{lng}</span>
                            <span className="text-muted-foreground tabular-nums">${Math.round(price)}</span>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mt-1.5 text-xs">
                      <span className="text-muted-foreground">{t("tours.priceFrom")} </span>
                      <span className="font-semibold">${Number(tr.price_from).toFixed(0)}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

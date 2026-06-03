import { Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import { useCities, useGuides } from "@/lib/content-queries";
import { useI18n } from "@/lib/i18n";

export function PopularCities() {
  const { t } = useI18n();
  const { data: cities = [] } = useCities();
  const { data: guides = [] } = useGuides();
  if (cities.length === 0) return null;

  const counts = guides.reduce<Record<string, number>>((acc, g) => {
    acc[g.cityId] = (acc[g.cityId] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <section className="px-6 py-16 md:py-20">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground">
            {t("cities.title")}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("cities.subtitle")}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          {cities.map((c) => {
            const count = counts[c.id] ?? 0;
            return (
              <Link
                key={c.id}
                to="/guides"
                search={{ city: c.slug }}
                className="inline-flex items-center gap-2 rounded-full bg-card ring-1 ring-border px-4 py-2.5 text-sm font-medium text-foreground hover:ring-primary/40 hover:shadow-sm transition-all"
              >
                <MapPin className="h-3.5 w-3.5 text-primary" />
                {c.name}
                {count > 0 && (
                  <span className="text-xs text-muted-foreground">· {count}</span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

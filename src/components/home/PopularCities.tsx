import { Link } from "@tanstack/react-router";
import { MapPin, Navigation } from "lucide-react";
import { useMemo } from "react";
import { useCities, useGuides } from "@/lib/content-queries";
import { useDetectedLocation } from "@/hooks/useDetectedLocation";
import { nearestCityNames } from "@/data/cities";
import { useI18n } from "@/lib/i18n";
import { WishlistHeart } from "@/components/WishlistHeart";


export function PopularCities() {
  const { t } = useI18n();
  const { data: cities = [] } = useCities();
  const { data: guides = [] } = useGuides();
  const { data: geo } = useDetectedLocation();

  const nearestName = useMemo(() => {
    if (!geo || geo.lat == null || geo.lng == null || cities.length === 0) return null;
    const [n] = nearestCityNames(cities, geo.lat, geo.lng, 1);
    return n ?? null;
  }, [geo, cities]);

  if (cities.length === 0) return null;

  const counts = guides.reduce<Record<string, number>>((acc, g) => {
    acc[g.cityId] = (acc[g.cityId] ?? 0) + 1;
    return acc;
  }, {});

  const nearestCity = nearestName ? cities.find((c) => c.name === nearestName) ?? null : null;

  return (
    <section className="px-6 py-16 md:py-20">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground">
            {t("cities.title")}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("cities.subtitle")}</p>
        </div>

        {nearestCity && (
          <div className="mb-5 flex justify-center">
            <Link
              to="/book"
              search={{ city: nearestCity.slug }}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#62A1B1]/10 to-[#8BB5A9]/10 ring-1 ring-[#62A1B1]/30 px-4 py-2 text-sm font-medium text-foreground hover:ring-[#62A1B1]/60 transition"
            >
              <Navigation className="h-3.5 w-3.5 text-[#5e8a7e]" />
              <span className="text-muted-foreground">{t("book.autoDetected")}:</span>
              <span className="font-semibold">{nearestCity.name}</span>
            </Link>
          </div>
        )}

        <div className="flex flex-wrap justify-center gap-3">
          {cities.map((c) => {
            const count = counts[c.id] ?? 0;
            return (
              <div
                key={c.id}
                className="group inline-flex items-center gap-1 rounded-full bg-card ring-1 ring-border pl-4 pr-1.5 py-1.5 text-sm font-medium text-foreground hover:ring-primary/40 hover:shadow-sm transition-all"
              >
                <Link to="/guides" search={{ city: c.name }} className="inline-flex items-center gap-2 py-1">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  {c.name}
                  {count > 0 && (
                    <span className="text-xs text-muted-foreground">· {count}</span>
                  )}
                </Link>
                <WishlistHeart type="city" id={c.id} size="sm" variant="ghost" />
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}

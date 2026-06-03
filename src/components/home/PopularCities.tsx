import { Link } from "@tanstack/react-router";
import { Navigation, Clock } from "lucide-react";
import { useMemo } from "react";
import { useCities, useGuides, useTours } from "@/lib/content-queries";
import { useDetectedLocation } from "@/hooks/useDetectedLocation";
import { nearestCityNames } from "@/data/cities";
import { useI18n } from "@/lib/i18n";
import { WishlistHeart } from "@/components/WishlistHeart";
import tashkentImg from "@/assets/city-tashkent.jpg";
import samarkandImg from "@/assets/city-samarkand.jpg";
import bukharaImg from "@/assets/city-bukhara.jpg";

const CITY_META: Record<string, { image: string; tagline: string }> = {
  tashkent: { image: tashkentImg, tagline: "Capital of contrasts — modern skyline meets ancient madrasas" },
  samarkand: { image: samarkandImg, tagline: "Jewel of the Silk Road, home of the Registan" },
  bukhara: { image: bukharaImg, tagline: "Living museum of 2,000 years of Islamic art" },
};

const COMING_SOON = [
  { name: "Khiva", tagline: "Walled open-air museum of Khorezm" },
  { name: "Fergana", tagline: "Lush valley of silk and ceramics" },
  { name: "Nukus", tagline: "Desert gateway to the Aral & Savitsky art" },
];

export function PopularCities() {
  const { t } = useI18n();
  const { data: cities = [] } = useCities();
  const { data: guides = [] } = useGuides();
  const { data: tours = [] } = useTours();
  const { data: geo } = useDetectedLocation();

  const nearestName = useMemo(() => {
    if (!geo || geo.lat == null || geo.lng == null || cities.length === 0) return null;
    const [n] = nearestCityNames(cities, geo.lat, geo.lng, 1);
    return n ?? null;
  }, [geo, cities]);

  if (cities.length === 0) return null;

  const guideCounts = guides.reduce<Record<string, number>>((acc, g) => {
    acc[g.cityId] = (acc[g.cityId] ?? 0) + 1;
    return acc;
  }, {});
  const tourCounts = tours.reduce<Record<string, number>>((acc, tour) => {
    if (tour.city_id) acc[tour.city_id] = (acc[tour.city_id] ?? 0) + 1;
    return acc;
  }, {});

  const nearestCity = nearestName ? cities.find((c) => c.name === nearestName) ?? null : null;

  return (
    <section className="px-6 py-16 md:py-20">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground">
            {t("cities.title")}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("cities.subtitle")}</p>
        </div>

        {nearestCity && (
          <div className="mb-8 flex justify-center">
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

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
          {cities
            .filter((c) => c.slug in CITY_META)
            .map((c) => {
              const meta = CITY_META[c.slug];
              const gCount = guideCounts[c.id] ?? 0;
              const tCount = tourCounts[c.id] ?? 0;
              return (
                <Link
                  key={c.id}
                  to="/guides"
                  search={{ city: c.name }}
                  className="group relative block overflow-hidden rounded-xl md:rounded-2xl bg-card ring-1 ring-border hover:shadow-lg transition-all"
                >
                  <div className="relative aspect-[3/4] md:aspect-[4/5] overflow-hidden bg-secondary">
                    {meta?.image && (
                      <img
                        src={meta.image}
                        alt={c.name}
                        loading="lazy"
                        width={1024}
                        height={1280}
                        className="h-full w-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                    <WishlistHeart type="city" id={c.id} className="absolute right-2 top-2 md:right-3 md:top-3" />

                    <div className="absolute inset-x-0 bottom-0 p-3 md:p-5 text-white">
                      <h3 className="font-display text-lg md:text-2xl font-semibold">{c.name}</h3>
                      {meta?.tagline && (
                        <p className="mt-0.5 md:mt-1 text-xs md:text-sm text-white/85 line-clamp-2">{meta.tagline}</p>
                      )}
                      <div className="mt-2 md:mt-3 flex items-center gap-2 md:gap-3 text-[10px] md:text-xs text-white/90">
                        {gCount > 0 && <span>{gCount} {gCount === 1 ? "guide" : "guides"}</span>}
                        {gCount > 0 && tCount > 0 && <span className="opacity-60">·</span>}
                        {tCount > 0 && <span>{tCount} {tCount === 1 ? "tour" : "tours"}</span>}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}

          {COMING_SOON.map((c) => (
            <div
              key={c.name}
              className="relative overflow-hidden rounded-xl md:rounded-2xl ring-1 ring-dashed ring-border bg-secondary/40"
            >
              <div className="relative aspect-[3/4] md:aspect-[4/5] flex flex-col items-center justify-center p-4 md:p-6 text-center">
                <span className="inline-flex items-center gap-1 rounded-full bg-background/80 ring-1 ring-border px-2.5 py-0.5 md:px-3 md:py-1 text-[10px] md:text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  <Clock className="h-2.5 w-2.5 md:h-3 md:w-3" />
                  Coming soon
                </span>
                <h3 className="mt-3 md:mt-4 font-display text-lg md:text-2xl font-semibold text-foreground/70">
                  {c.name}
                </h3>
                <p className="mt-1.5 md:mt-2 text-xs md:text-sm text-muted-foreground max-w-[20ch]">{c.tagline}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

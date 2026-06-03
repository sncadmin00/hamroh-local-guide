import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Clock } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { GuideCard } from "@/components/GuideCard";
import { FeaturedGuides } from "@/components/home/FeaturedGuides";
import { TopTours } from "@/components/home/TopTours";
import { PopularCities } from "@/components/home/PopularCities";
import { BrowseByInterest } from "@/components/home/BrowseByInterest";
import { useGuides, useTours } from "@/lib/content-queries";
import { useIsMobile } from "@/hooks/use-mobile";
import { useI18n } from "@/lib/i18n";

export function ExploreTabs() {
  const isMobile = useIsMobile();
  const { t } = useI18n();
  const [tab, setTab] = useState("guides");
  const { data: guides = [] } = useGuides();
  const { data: tours = [] } = useTours();

  // Mobile: keep existing stacked horizontal-scroll sections.
  if (isMobile) {
    return (
      <>
        <FeaturedGuides />
        <TopTours />
        <BrowseByInterest />
        <PopularCities />
      </>
    );
  }

  const featuredGuides = [...guides].sort((a, b) => b.rating - a.rating).slice(0, 6);
  const topTours = tours.slice(0, 6);

  const viewAllByTab: Record<string, { label: string; to: string }> = {
    guides: { label: t("featured.viewAll"), to: "/guides" },
    tours: { label: t("topTours.viewAll"), to: "/tours" },
    cities: { label: t("featured.viewAll"), to: "/guides" },
    explore: { label: t("featured.viewAll"), to: "/guides" },
  };

  return (
    <section className="px-6 py-16 md:py-20 bg-secondary/40">
      <div className="max-w-6xl mx-auto">
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
            <TabsList className="h-11 bg-white/70 backdrop-blur ring-1 ring-border p-1 rounded-full">
              <TabsTrigger value="guides" className="rounded-full px-4 h-9 text-sm">
                {t("explore.tabs.guides")}
              </TabsTrigger>
              <TabsTrigger value="tours" className="rounded-full px-4 h-9 text-sm">
                {t("explore.tabs.tours")}
              </TabsTrigger>
              <TabsTrigger value="cities" className="rounded-full px-4 h-9 text-sm">
                {t("explore.tabs.cities")}
              </TabsTrigger>
              <TabsTrigger value="explore" className="rounded-full px-4 h-9 text-sm">
                {t("explore.tabs.explore")}
              </TabsTrigger>
            </TabsList>
            <Link
              to={viewAllByTab[tab].to}
              className="text-sm font-medium text-primary hover:underline"
            >
              {viewAllByTab[tab].label} →
            </Link>
          </div>

          <TabsContent value="guides" className="mt-0">
            {featuredGuides.length > 0 ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredGuides.map((g) => (
                  <GuideCard key={g.id} guide={g} />
                ))}
              </div>
            ) : (
              <EmptyState />
            )}
          </TabsContent>

          <TabsContent value="tours" className="mt-0">
            {topTours.length > 0 ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                {topTours.map((tour) => (
                  <Link
                    key={tour.id}
                    to="/tours/$slug"
                    params={{ slug: tour.slug }}
                    className="group rounded-2xl border border-border bg-card overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="aspect-[4/3] bg-secondary overflow-hidden">
                      {tour.cover_url ? (
                        <img
                          src={tour.cover_url}
                          alt={tour.title}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform"
                        />
                      ) : null}
                    </div>
                    <div className="p-4">
                      <h3 className="font-display text-base font-semibold text-foreground line-clamp-2">
                        {tour.title}
                      </h3>
                      {tour.cities?.name ? (
                        <p className="mt-1 text-xs text-muted-foreground">{tour.cities.name}</p>
                      ) : null}
                      <div className="mt-3 flex items-center justify-between text-sm">
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <Clock className="size-3.5" />
                          {Number(tour.duration_hours)} {t("tours.hours")}
                        </span>
                        {Number(tour.price_from) > 0 ? (
                          <span className="font-medium text-foreground">
                            {t("tours.priceFrom")} ${Number(tour.price_from)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState />
            )}
          </TabsContent>

          <TabsContent value="cities" className="mt-0">
            <PopularCities />
          </TabsContent>

          <TabsContent value="explore" className="mt-0">
            <BrowseByInterest headless />
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}

function EmptyState() {
  return (
    <div className="text-center text-sm text-muted-foreground py-12">Loading…</div>
  );
}

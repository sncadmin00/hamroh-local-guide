import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { MapPin, Clock, Heart } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { GuideCard } from "@/components/GuideCard";
import { WishlistHeart } from "@/components/WishlistHeart";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useWishlist } from "@/hooks/useWishlist";
import { useGuides, useTours, useCities } from "@/lib/content-queries";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/wishlist")({
  head: () => ({
    meta: [
      { title: "My wishlist · Hamroh" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WishlistPage,
});

function WishlistPage() {
  const { t } = useI18n();
  const { items, ready } = useWishlist();
  const { data: guides = [] } = useGuides();
  const { data: tours = [] } = useTours();
  const { data: cities = [] } = useCities();

  const savedGuides = useMemo(() => {
    const ids = new Set(items.filter((i) => i.type === "guide").map((i) => i.id));
    return guides.filter((g) => ids.has(g.dbId));
  }, [items, guides]);

  const savedTours = useMemo(() => {
    const ids = new Set(items.filter((i) => i.type === "tour").map((i) => i.id));
    return tours.filter((tr) => ids.has(tr.id));
  }, [items, tours]);

  const savedCities = useMemo(() => {
    const ids = new Set(items.filter((i) => i.type === "city").map((i) => i.id));
    return cities.filter((c) => ids.has(c.id));
  }, [items, cities]);

  const total = savedGuides.length + savedTours.length + savedCities.length;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />

      <main className="flex-1 px-6 py-10 md:py-14">
        <div className="max-w-6xl mx-auto">
          <header className="mb-8">
            <h1 className="font-display text-3xl md:text-4xl font-semibold text-foreground">
              {t("wishlist.title")}
            </h1>
            {ready && total === 0 && (
              <p className="mt-3 text-muted-foreground">{t("wishlist.empty")}</p>
            )}
          </header>

          {ready && total > 0 && (
            <Tabs defaultValue="guides">
              <TabsList className="mb-8 rounded-full bg-secondary/70 p-1 h-11">
                <TabsTrigger value="guides" className="rounded-full px-4 h-9">
                  {t("wishlist.tabs.guides")} ({savedGuides.length})
                </TabsTrigger>
                <TabsTrigger value="tours" className="rounded-full px-4 h-9">
                  {t("wishlist.tabs.tours")} ({savedTours.length})
                </TabsTrigger>
                <TabsTrigger value="cities" className="rounded-full px-4 h-9">
                  {t("wishlist.tabs.cities")} ({savedCities.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="guides">
                {savedGuides.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {savedGuides.map((g) => (
                      <div key={g.id} className="relative">
                        <WishlistHeart type="guide" id={g.dbId} className="absolute top-3 right-3 z-10" />
                        <GuideCard guide={g} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyMini />
                )}
              </TabsContent>

              <TabsContent value="tours">
                {savedTours.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {savedTours.map((tour) => (
                      <div key={tour.id} className="relative">
                        <WishlistHeart type="tour" id={tour.id} className="absolute top-3 right-3 z-10" />
                        <Link
                          to="/tours/$slug"
                          params={{ slug: tour.slug }}
                          className="group block rounded-2xl border border-border bg-card overflow-hidden hover:shadow-md transition-shadow"
                        >
                          <div className="aspect-[4/3] bg-secondary overflow-hidden">
                            {tour.cover_url ? (
                              <img src={tour.cover_url} alt={tour.title} loading="lazy"
                                className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform" />
                            ) : null}
                          </div>
                          <div className="p-4">
                            <h3 className="font-display text-base font-semibold text-foreground line-clamp-2">{tour.title}</h3>
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
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyMini />
                )}
              </TabsContent>

              <TabsContent value="cities">
                {savedCities.length > 0 ? (
                  <div className="flex flex-wrap gap-3">
                    {savedCities.map((c) => (
                      <div key={c.id} className="inline-flex items-center gap-2 rounded-full bg-card ring-1 ring-border px-4 py-2.5">
                        <Link
                          to="/guides"
                          search={{ city: c.name }}
                          className="inline-flex items-center gap-2 text-sm font-medium text-foreground"
                        >
                          <MapPin className="h-3.5 w-3.5 text-primary" />
                          {c.name}
                        </Link>
                        <WishlistHeart type="city" id={c.id} size="sm" variant="ghost" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyMini />
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

function EmptyMini() {
  const { t } = useI18n();
  return (
    <div className="rounded-2xl border border-dashed border-border/70 p-10 text-center text-sm text-muted-foreground inline-flex flex-col items-center gap-3 w-full">
      <Heart className="h-8 w-8 text-muted-foreground/50" />
      {t("wishlist.empty")}
    </div>
  );
}

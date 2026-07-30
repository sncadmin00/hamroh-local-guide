import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SocialEmbed } from "@/components/SocialEmbed";
import { CityPicker } from "@/components/CityPicker";
import { SuggestPlaceModal } from "@/components/SuggestPlaceModal";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Star, BadgeCheck, MapPin } from "lucide-react";

export const Route = createFileRoute("/explore")({
  head: () => ({
    meta: [
      { title: "Explore — Hamroh" },
      { name: "description", content: "Articles, guides and social highlights from around the world." },
      { property: "og:title", content: "Explore — Hamroh" },
      { property: "og:description", content: "Articles, guides and social highlights from around the world." },
    ],
  }),
  component: ExplorePage,
});

type Article = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  cover_url: string | null;
  published_at: string | null;
  article_cities: { city_id: string }[];
};

type City = { id: string; name: string; slug: string; lat: number; lng: number };

type Embed = {
  id: string;
  platform: "instagram" | "tiktok" | "youtube" | "x";
  url: string;
  caption: string;
  social_embed_cities: { city_id: string }[];
};

type Guide = {
  id: string;
  slug: string;
  name: string;
  city_id: string;
  photo_url: string | null;
  tagline: string;
  rating: number;
  reviews: number;
  verified: boolean;
  price_per_day: number;
};

function ExplorePage() {
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [articles, setArticles] = useState<Article[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [embeds, setEmbeds] = useState<Embed[]>([]);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [city, setCity] = useState<"All" | string>("All");

  useEffect(() => {
    (async () => {
      const [a, c, e, g] = await Promise.all([
        supabase
          .from("articles")
          .select("id,title,slug,excerpt,cover_url,published_at,article_cities(city_id)")
          .eq("published", true)
          .order("sort_order")
          .order("published_at", { ascending: false }),
        supabase.from("cities").select("id,name,slug,lat,lng").order("sort_order"),
        supabase
          .from("social_embeds")
          .select("id,platform,url,caption,social_embed_cities(city_id)")
          .eq("visible", true)
          .order("sort_order"),
        supabase
          .from("guides")
          .select("id,slug,name,city_id,photo_url,tagline,rating,reviews,verified,price_per_day")
          .eq("published", true)
          .order("sort_order"),
      ]);
      if (a.data) setArticles(a.data as unknown as Article[]);
      if (c.data) setCities(c.data as City[]);
      if (e.data) setEmbeds(e.data as unknown as Embed[]);
      if (g.data) setGuides(g.data as unknown as Guide[]);
    })();
  }, []);


  const selectedCityId = useMemo(
    () => (city === "All" ? null : cities.find((c) => c.name === city)?.id ?? null),
    [city, cities],
  );

  const filteredArticles = useMemo(() => {
    if (city === "All") return articles;
    return articles.filter(
      (a) => a.article_cities.length === 0 || a.article_cities.some((ac) => ac.city_id === selectedCityId),
    );
  }, [articles, city, selectedCityId]);

  const filteredEmbeds = useMemo(() => {
    if (city === "All") return embeds;
    return embeds.filter(
      (e) => e.social_embed_cities.length === 0 || e.social_embed_cities.some((sc) => sc.city_id === selectedCityId),
    );
  }, [embeds, city, selectedCityId]);

  const filteredGuides = useMemo(() => {
    if (city === "All") return guides.slice(0, 6);
    return guides.filter((g) => g.city_id === selectedCityId).slice(0, 6);
  }, [guides, city, selectedCityId]);

  const cityLabel = city === "All" ? "All cities" : city;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 container mx-auto px-4 py-12 md:py-16">
        <header className="max-w-2xl">
          <h1 className="font-display text-4xl md:text-5xl font-semibold">Explore</h1>
          <p className="mt-3 text-muted-foreground">Stories, guides and moments — explore places with locals.</p>
          <button
            onClick={() => setSuggestOpen(true)}
            className="mt-5 inline-flex items-center gap-2 px-4 h-10 rounded-full text-sm font-semibold"
            style={{ background: "#C9A84C", color: "#0F1F5C" }}
          >
            <MapPin className="h-4 w-4" /> Suggest a place
          </button>
        </header>
        <SuggestPlaceModal open={suggestOpen} onClose={() => setSuggestOpen(false)} source="client" />

        <div className="mt-8 sticky top-16 z-30 -mx-4 px-4 py-3 bg-background/80 backdrop-blur-md border-b border-border/60">
          <CityPicker value={city} onChange={setCity} />
        </div>

        {/* Articles */}
        <section className="mt-12">
          <h2 className="font-display text-2xl font-semibold">Articles · {cityLabel}</h2>
          {filteredArticles.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No articles for {cityLabel} yet — check back soon.</p>
          ) : (
            <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredArticles.map((a) => (
                <Link
                  key={a.id}
                  to="/explore/$slug"
                  params={{ slug: a.slug }}
                  className="group block rounded-2xl bg-card ring-1 ring-border/60 overflow-hidden hover:ring-border transition"
                >
                  {a.cover_url ? (
                    <div className="aspect-[16/10] overflow-hidden bg-secondary">
                      <img src={a.cover_url} alt={a.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    </div>
                  ) : (
                    <div className="aspect-[16/10] bg-gradient-to-br from-secondary to-primary/20" />
                  )}
                  <div className="p-5">
                    <h3 className="font-display text-lg font-semibold leading-tight">{a.title}</h3>
                    {a.excerpt && <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{a.excerpt}</p>}
                    {a.published_at && (
                      <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(a.published_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Guides */}
        <section className="mt-16">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <h2 className="font-display text-2xl font-semibold">Guides · {cityLabel}</h2>
            <Link
              to="/guides"
              search={{ city }}
              className="text-sm font-medium text-primary hover:underline"
            >
              See all →
            </Link>
          </div>
          {filteredGuides.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No guides for {cityLabel} yet.</p>
          ) : (
              <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredGuides.map((g) => (
                  <Link
                    key={g.id}
                    to="/guides/$guideId"
                    params={{ guideId: g.slug }}
                    className="group block rounded-2xl bg-card ring-1 ring-border/60 overflow-hidden hover:ring-border transition"
                  >
                    {g.photo_url && (
                      <div className="aspect-[4/3] overflow-hidden bg-secondary">
                        <img src={g.photo_url} alt={g.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      </div>
                    )}
                    <div className="p-5">
                      <div className="flex items-center gap-2">
                        <h3 className="font-display text-lg font-semibold">{g.name}</h3>
                        {g.verified && <BadgeCheck className="h-4 w-4 text-primary" />}
                      </div>
                      {g.tagline && <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{g.tagline}</p>}
                      <div className="mt-3 flex items-center justify-between text-sm">
                        <span className="inline-flex items-center gap-1">
                          <Star className="h-4 w-4 fill-current text-amber-500" />
                          {Number(g.rating).toFixed(1)} <span className="text-muted-foreground">({g.reviews})</span>
                        </span>
                        <span className="font-medium">${Number(g.price_per_day).toFixed(0)}/day</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

        {/* Social */}
        <section className="mt-16">
          <h2 className="font-display text-2xl font-semibold">From our socials · {cityLabel}</h2>
          {filteredEmbeds.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No social posts for {cityLabel} yet.</p>
          ) : (
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredEmbeds.map((e) => (
                <SocialEmbed key={e.id} platform={e.platform} url={e.url} caption={e.caption} />
              ))}
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

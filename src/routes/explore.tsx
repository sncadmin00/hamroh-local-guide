import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SocialEmbed } from "@/components/SocialEmbed";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "lucide-react";

export const Route = createFileRoute("/explore")({
  head: () => ({
    meta: [
      { title: "Explore — Hamroh" },
      { name: "description", content: "Travel articles and social highlights from across Uzbekistan." },
      { property: "og:title", content: "Explore — Hamroh" },
      { property: "og:description", content: "Travel articles and social highlights from across Uzbekistan." },
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
};

type City = { id: string; name: string; slug: string };

type Embed = {
  id: string;
  platform: "instagram" | "tiktok" | "youtube" | "x";
  url: string;
  caption: string;
};

function ExplorePage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [embeds, setEmbeds] = useState<Embed[]>([]);

  useEffect(() => {
    (async () => {
      const [a, g, c, e] = await Promise.all([
        supabase.from("articles").select("id,title,slug,excerpt,cover_url,published_at").eq("published", true).order("sort_order").order("published_at", { ascending: false }),
        supabase.from("guides").select("id,name,slug,tagline,photo_url,rating,price_per_day").order("sort_order").limit(6),
        supabase.from("cities").select("id,name,slug").order("sort_order"),
        supabase.from("social_embeds").select("id,platform,url,caption").eq("visible", true).order("sort_order"),
      ]);
      if (a.data) setArticles(a.data as Article[]);
      if (g.data) setGuides(g.data as Guide[]);
      if (c.data) setCities(c.data as City[]);
      if (e.data) setEmbeds(e.data as Embed[]);
    })();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 container mx-auto px-4 py-12 md:py-16">
        <header className="max-w-2xl">
          <h1 className="font-display text-4xl md:text-5xl font-semibold">Explore</h1>
          <p className="mt-3 text-muted-foreground">Stories, guides, and moments from across Uzbekistan.</p>
        </header>

        {/* Articles */}
        <section className="mt-12">
          <div className="flex items-end justify-between">
            <h2 className="font-display text-2xl font-semibold">Latest articles</h2>
          </div>
          {articles.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No articles yet — check back soon.</p>
          ) : (
            <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {articles.map((a) => (
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

        {/* Featured guides */}
        {guides.length > 0 && (
          <section className="mt-16">
            <div className="flex items-end justify-between">
              <h2 className="font-display text-2xl font-semibold">Featured guides</h2>
              <Link to="/guides" className="text-sm font-medium text-primary hover:underline">See all</Link>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {guides.map((g) => (
                <Link
                  key={g.id}
                  to="/guides/$guideId"
                  params={{ guideId: g.slug }}
                  className="flex gap-4 items-center rounded-2xl bg-card p-4 ring-1 ring-border/60 hover:ring-border transition"
                >
                  <div className="h-16 w-16 rounded-full overflow-hidden bg-secondary shrink-0">
                    {g.photo_url ? (
                      <img src={g.photo_url} alt={g.name} className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{g.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{g.tagline}</p>
                    <p className="mt-1 text-xs">★ {Number(g.rating).toFixed(1)} · ${Number(g.price_per_day).toFixed(0)}/day</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Cities */}
        {cities.length > 0 && (
          <section className="mt-16">
            <h2 className="font-display text-2xl font-semibold">Destinations</h2>
            <div className="mt-6 flex flex-wrap gap-2">
              {cities.map((c) => (
                <Link
                  key={c.id}
                  to="/guides"
                  search={{ city: c.name }}
                  className="px-4 h-10 inline-flex items-center rounded-full bg-card ring-1 ring-border/60 text-sm font-medium hover:bg-secondary/60"
                >
                  {c.name}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Social */}
        {embeds.length > 0 && (
          <section className="mt-16">
            <h2 className="font-display text-2xl font-semibold">From our socials</h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {embeds.map((e) => (
                <SocialEmbed key={e.id} platform={e.platform} url={e.url} caption={e.caption} />
              ))}
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

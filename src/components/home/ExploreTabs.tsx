import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Clock, Instagram, Facebook, Youtube, Link2, Music2, PlayCircle } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { GuideCard } from "@/components/GuideCard";
import { PlaceCard } from "@/components/PlaceCard";
import { WishlistHeart } from "@/components/WishlistHeart";
import { HorizontalCarousel } from "@/components/home/HorizontalCarousel";
import {
  useGuides,
  useTours,
  usePlaces,
  useLatestArticles,
  useLatestReels,
  pickTourTitle,
} from "@/lib/content-queries";

import { useI18n } from "@/lib/i18n";

const platformMeta = {
  instagram: { label: "Instagram", Icon: Instagram },
  facebook: { label: "Facebook", Icon: Facebook },
  tiktok: { label: "TikTok", Icon: Music2 },
  youtube: { label: "YouTube", Icon: Youtube },
  other: { label: "Post", Icon: Link2 },
} as const;

type TabKey = "guides" | "tours" | "places" | "reels" | "articles";

export function ExploreTabs() {
  
  const { t, lang } = useI18n();
  const [tab, setTab] = useState<TabKey>("guides");

  const { data: guides = [] } = useGuides();
  const { data: tours = [] } = useTours();
  const { data: places = [] } = usePlaces();
  const { data: articles = [] } = useLatestArticles(12);
  const { data: reels = [] } = useLatestReels(24);

  const featuredGuides = [...guides].sort((a, b) => b.rating - a.rating).slice(0, 12);
  const topTours = tours.slice(0, 12);
  const topPlaces = places.slice(0, 12);
  const topArticles = articles.slice(0, 12);
  const topReels = reels.slice(0, 24);




  const itemW = "w-[240px] md:w-[260px]";

  const renderGuides = () => (
    <HorizontalCarousel itemClassName={itemW}>
      {featuredGuides.map((g) => <GuideCard key={g.id} guide={g} />)}
    </HorizontalCarousel>
  );

  const renderTours = () => {
    const list = topTours.map((tour) => {
      const title = pickTourTitle(tour, lang);
      return (
        <Link
          key={tour.id}
          to="/tours/$slug"
          params={{ slug: tour.slug }}
          className="group block"
        >
          <div className="relative aspect-[4/3] bg-secondary overflow-hidden rounded-2xl">
            {tour.cover_url ? (
              <img
                src={tour.cover_url}
                alt={title}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              />
            ) : null}
            <WishlistHeart type="tour" id={tour.id} className="absolute right-3 top-3" />
          </div>
          <div className="pt-3 px-0.5">
            <h3 className="font-display text-[15px] font-semibold text-foreground line-clamp-1 leading-tight">
              {title}
            </h3>
            {tour.cities?.name ? (
              <p className="mt-0.5 text-[13px] text-muted-foreground">{tour.cities.name}</p>
            ) : null}
            <div className="mt-1 flex items-center justify-between text-[13px]">
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Clock className="size-3" />
                {Number(tour.duration_hours)} {t("tours.hours")}
              </span>
              {Number(tour.price_from) > 0 ? (
                <span className="text-foreground">
                  <span className="font-semibold">${Number(tour.price_from)}</span>
                </span>
              ) : null}
            </div>
          </div>
        </Link>
      );
    });
    return <HorizontalCarousel itemClassName={itemW}>{list}</HorizontalCarousel>;
  };

  const renderPlaces = () => {
    const list = topPlaces.map((p) => (
      <div key={p.id}>
        <PlaceCard place={p} />
      </div>
    ));
    return <HorizontalCarousel itemClassName={itemW}>{list}</HorizontalCarousel>;
  };



  const renderReels = () => {
    const list = topReels.map((r) => {
      const badgeLabel = r.source === "admin" ? "Hamroh" : (r.guideName ?? "Reel");
      const BadgeIcon = PlayCircle;

      const inner = (
        <div className="relative flex h-72 flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-border/60 transition-transform hover:-translate-y-0.5">
          {r.thumbnailUrl ? (
            <img
              src={r.thumbnailUrl}
              alt={r.caption || r.title || badgeLabel}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/25 via-accent/10 to-background" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute inset-0 flex items-center justify-center">
            <PlayCircle className="h-12 w-12 text-white/85 drop-shadow" />
          </div>
          <div className="relative mt-auto flex flex-col gap-2 p-3 text-white">
            <span className="inline-flex w-fit items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-medium backdrop-blur">
              <BadgeIcon className="h-3 w-3" /> {badgeLabel}
            </span>
            {r.title && <p className="text-xs font-medium opacity-90 line-clamp-1">{r.title}</p>}
            {r.caption && <p className="line-clamp-2 text-xs leading-snug opacity-80">{r.caption}</p>}
          </div>
        </div>
      );
      return r.source === "guide" && r.guideSlug ? (
        <Link key={r.id} to="/guides/$guideId" params={{ guideId: r.guideSlug }}>
          {inner}
        </Link>
      ) : (
        <a key={r.id} href={r.url} target="_blank" rel="noopener noreferrer">
          {inner}
        </a>
      );
    });
    return <HorizontalCarousel itemClassName="w-48">{list}</HorizontalCarousel>;
  };


  const renderArticles = () => {
    const list = topArticles.map((a) => (
      <Link
        key={a.id}
        to="/explore/$slug"
        params={{ slug: a.slug }}
        className="relative flex h-72 flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-border/60 transition-transform hover:-translate-y-0.5"
      >
        {a.coverUrl ? (
          <img
            src={a.coverUrl}
            alt={a.title}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-background" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="relative mt-auto flex flex-col gap-1 p-3 text-white">
          <h3 className="font-display text-sm font-semibold leading-tight line-clamp-2">{a.title}</h3>
          {a.excerpt && <p className="line-clamp-2 text-xs leading-snug opacity-80">{a.excerpt}</p>}
        </div>
      </Link>
    ));
    return <HorizontalCarousel itemClassName="w-[240px] md:w-[260px]">{list}</HorizontalCarousel>;
  };

  // 5 tabs; each tab handles its own empty state.
  const tabs: { key: TabKey; count: number }[] = [
    { key: "guides", count: featuredGuides.length },
    { key: "tours", count: topTours.length },
    { key: "places", count: topPlaces.length },
    { key: "reels", count: topReels.length },
    { key: "articles", count: topArticles.length },
  ];


  return (
    <section className="px-6 py-14 md:py-20 bg-secondary/40">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 md:mb-10 text-center">
          <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground">
            {t("explore.section.title")}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("explore.section.subtitle")}</p>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="w-full">
          <div className="relative mb-8 border-b border-border overflow-x-auto">
            <TabsList className="mx-auto flex h-auto w-max md:w-full justify-start md:justify-center gap-6 md:gap-12 bg-transparent p-0 rounded-none">
              {tabs.map(({ key }) => (
                <TabsTrigger
                  key={key}
                  value={key}
                  className="relative whitespace-nowrap rounded-none bg-transparent px-0 pb-3 pt-1 text-sm font-medium text-muted-foreground shadow-none transition-colors hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none after:absolute after:left-0 after:right-0 after:-bottom-px after:h-[2px] after:bg-foreground after:scale-x-0 after:transition-transform after:origin-center data-[state=active]:after:scale-x-100"
                >
                  {t(`explore.tabs.${key}`)}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>


          <TabsContent value="guides" className="mt-0">{renderGuides()}</TabsContent>
          <TabsContent value="tours" className="mt-0">{renderTours()}</TabsContent>
          <TabsContent value="places" className="mt-0">{renderPlaces()}</TabsContent>
          <TabsContent value="reels" className="mt-0">{renderReels()}</TabsContent>
          <TabsContent value="articles" className="mt-0">{renderArticles()}</TabsContent>
          
        </Tabs>
      </div>
    </section>
  );
}

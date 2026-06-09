import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Star, BadgeCheck, MapPin, Globe2, Clock, ArrowLeft, Car, Video, Award, ShieldCheck, Users, MessageCircle, Play } from "lucide-react";

import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useGuide, useGuideTours, useCities } from "@/lib/content-queries";
import { supabase } from "@/integrations/supabase/client";
import { GuideReviews } from "@/components/GuideReviews";
import { GuidePostsFeed } from "@/components/GuidePostsFeed";
import { WishlistHeart } from "@/components/WishlistHeart";

const SITE_URL = "https://hamroh-local-guide.lovable.app";
const PLACEHOLDER =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 3'><rect width='4' height='3' fill='%23e5e7eb'/></svg>";

export const Route = createFileRoute("/guides_/$guideId")({
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("guides")
      .select("name, tagline, bio, photo_url, cities(name)")
      .eq("slug", params.guideId)
      .maybeSingle();
    return { meta: data as { name: string; tagline: string; bio: string; photo_url: string | null; cities: { name: string } | null } | null };
  },
  head: ({ params, loaderData }) => {
    const m = loaderData?.meta;
    const title = m ? `${m.name} — Local guide in ${m.cities?.name ?? ""} | Hamroh` : "Guide — Hamroh";
    const description = m ? (m.tagline || m.bio || `Book ${m.name}, a verified local guide.`).slice(0, 160) : "Book a verified local guide.";
    const image = m?.photo_url || `${SITE_URL}/hamroh-og.jpg`;
    const url = `${SITE_URL}/guides/${params.guideId}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "profile" },
        { property: "og:url", content: url },
        { property: "og:image", content: image },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: image },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: GuidePage,
  errorComponent: ({ error }) => (
    <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
      Couldn't load the guide: {error.message}
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center px-4 text-center">
      <div>
        <h1 className="font-display text-3xl font-semibold">Guide not found</h1>
        <Link to="/guides" className="mt-4 inline-block text-primary hover:underline">Browse all guides</Link>
      </div>
    </div>
  ),
});

function GuidePage() {
  const { guideId } = Route.useParams();
  const { data: guide, isLoading } = useGuide(guideId);
  const { data: tours = [] } = useGuideTours(guide?.dbId);
  const { data: cities = [] } = useCities();

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <div className="container mx-auto px-4 py-24 text-center text-muted-foreground">Loading…</div>
        <SiteFooter />
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <h1 className="font-display text-3xl">Guide not found</h1>
            <Link to="/guides" className="mt-4 inline-block text-primary hover:underline">Browse all guides</Link>
          </div>
        </div>
        <SiteFooter />
      </div>
    );
  }

  const coverImage = tours.find((t) => t.cover_url)?.cover_url || guide.photo;
  const stats = [
    { icon: Award, label: `${guide.completedToursCount > 0 ? `${guide.completedToursCount}+` : "New"}`, sub: "tours completed" },
    { icon: ShieldCheck, label: guide.identityVerified ? "Licensed" : "Pending", sub: "guide" },
    { icon: Users, label: `${guide.reviews}+`, sub: "happy travelers" },
    {
      icon: MessageCircle,
      label: guide.avgResponseMinutes != null && guide.avgResponseMinutes <= 60 ? "Fast" : "Replies",
      sub: "response",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <section className="mx-auto max-w-2xl px-4 pb-16 pt-4">
        <Link to="/guides" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> All guides
        </Link>

        {/* Cover + avatar */}
        <div className="relative mt-4 overflow-hidden rounded-3xl">
          <div className="relative aspect-[16/9] w-full bg-secondary">
            <img src={coverImage} alt="" className="h-full w-full object-cover" />
            <WishlistHeart type="guide" id={guide.dbId} size="lg" className="absolute right-3 top-3" />
          </div>
        </div>

        <div className="relative -mt-12 flex items-end gap-4 px-1">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full ring-4 ring-background bg-secondary">
            <img src={guide.photo} alt={guide.name} className="h-full w-full object-cover" />
          </div>
          <div className="pb-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="font-display text-2xl font-semibold truncate">{guide.name}</h1>
              {guide.verified && <BadgeCheck className="h-5 w-5 shrink-0 text-primary fill-primary/10" />}
            </div>
            <div className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              <span className="truncate">{cityNames.join(", ")}</span>
            </div>
          </div>
        </div>

        {/* Rating row */}
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="inline-flex items-center gap-1">
            <Star className="h-4 w-4 fill-accent text-accent" />
            <span className="font-semibold">{guide.rating}</span>
            <span className="text-muted-foreground">({guide.reviews} reviews)</span>
          </span>
          <span className="text-muted-foreground">{tours.length} tours</span>
        </div>

        {guide.languages.length > 0 && (
          <p className="mt-1 text-sm text-muted-foreground">
            Speaks: <span className="text-foreground">{guide.languages.join(", ")}</span>
          </p>
        )}

        {/* Video introduction */}
        {guide.introVideoUrl && (
          <div className="mt-6">
            <h2 className="font-display text-lg font-semibold">Video introduction</h2>
            <div className="mt-3 overflow-hidden rounded-2xl bg-card ring-1 ring-border/60">
              <video
                src={guide.introVideoUrl}
                controls
                playsInline
                preload="metadata"
                poster={guide.photo}
                className="aspect-video w-full bg-muted object-cover"
              />
            </div>
          </div>
        )}

        {/* About me */}
        <div className="mt-6">
          <h2 className="font-display text-lg font-semibold">About me</h2>
          <p className="mt-2 text-sm text-foreground/80 leading-relaxed whitespace-pre-line">{guide.bio || guide.tagline}</p>
        </div>

        {/* Stats grid */}
        <div className="mt-6 grid grid-cols-4 gap-3">
          {stats.map(({ icon: Icon, label, sub }) => (
            <div key={sub} className="flex flex-col items-center text-center">
              <Icon className="h-6 w-6 text-foreground/80" strokeWidth={1.5} />
              <span className="mt-2 text-xs font-semibold leading-tight">{label}</span>
              <span className="text-[11px] leading-tight text-muted-foreground">{sub}</span>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="mt-8 border-b border-border/60">
          <div className="flex gap-6">
            {(["tours", "reviews", "about"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`relative -mb-px pb-3 text-sm font-medium capitalize transition ${
                  tab === t ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "reviews" ? `Reviews (${guide.reviews})` : t === "tours" ? "Tours" : "About"}
                {tab === t && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="mt-5">
          {tab === "tours" && (
            tours.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tours published yet.</p>
            ) : (
              <div className="space-y-3">
                {tours.map((t) => {
                  const price = Math.round(Number(t.price_from));
                  return (
                    <Link
                      key={t.id}
                      to="/tours/$slug"
                      params={{ slug: t.slug }}
                      className="group flex items-stretch gap-3 overflow-hidden rounded-2xl bg-card ring-1 ring-border/60 hover:shadow-md transition-shadow"
                    >
                      <div className="relative h-24 w-28 shrink-0 overflow-hidden bg-secondary">
                        <img
                          src={t.cover_url || PLACEHOLDER}
                          alt={t.title}
                          loading="lazy"
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <div className="flex flex-1 flex-col justify-between py-2 pr-3 min-w-0">
                        <h3 className="font-semibold text-sm leading-snug line-clamp-2">{t.title}</h3>
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                            <span className="font-medium text-foreground">{guide.rating}</span>
                            <span>({guide.reviews})</span>
                          </span>
                          <span className="text-xs text-muted-foreground">
                            From <span className="font-semibold text-foreground">${price}</span>
                          </span>
                        </div>
                        {(t.cities?.name || t.duration_hours > 0 || t.transport_included) && (
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                            {t.cities?.name && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{t.cities.name}</span>}
                            {t.duration_hours > 0 && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{Number(t.duration_hours)}h</span>}
                            {t.transport_included && <span className="inline-flex items-center gap-1 text-primary"><Car className="h-3 w-3" />transport</span>}
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )
          )}

          {tab === "reviews" && <GuideReviews guideId={guide.dbId} />}

          {tab === "about" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Languages</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {guide.languages.map((l) => {
                    const level = guide.verifiedLanguages?.[l];
                    return (
                      <span key={l} className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm">
                        <Globe2 className="h-3.5 w-3.5" /> {l}
                        {level && (
                          <span
                            title={`AI-verified · CEFR ${level}`}
                            className="ml-1 inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary"
                          >
                            <BadgeCheck className="h-3 w-3" /> {level}
                          </span>
                        )}
                      </span>
                    );
                  })}
                </div>
              </div>
              {guide.specialties.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Specialties</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {guide.specialties.map((s) => (
                      <span key={s} className="rounded-full bg-secondary px-3 py-1 text-sm">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Latest posts</h3>
                <div className="mt-3">
                  <GuidePostsFeed guideId={guide.dbId} guideName={guide.name} />
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}


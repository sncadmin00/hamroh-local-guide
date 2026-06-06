import { createFileRoute, Link } from "@tanstack/react-router";
import { Star, BadgeCheck, Zap, MapPin, Globe2, Clock, ArrowLeft, Car, CarTaxiFront, Video } from "lucide-react";
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

  const allCityIds = [guide.cityId, ...guide.extraCityIds];
  const cityNames = cities
    .filter((c) => allCityIds.includes(c.id))
    .map((c) => c.name);
  if (cityNames.length === 0 && guide.city) cityNames.push(guide.city);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="container mx-auto px-4 pt-6">
        <Link to="/guides" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> All guides
        </Link>
      </div>

      <section className="container mx-auto px-4 py-8 md:py-12">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <div className="relative overflow-hidden rounded-3xl">
              <img src={guide.photo} alt={guide.name} width={1200} height={900} className="aspect-[4/3] w-full object-cover" />
              <WishlistHeart type="guide" id={guide.dbId} size="lg" className="absolute right-4 top-4" />
            </div>

            {guide.introVideoUrl && (
              <div className="mt-5 overflow-hidden rounded-3xl bg-card ring-1 ring-border/60">
                <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3 text-sm font-medium">
                  <Video className="h-4 w-4 text-primary" /> Video greeting from {guide.name}
                </div>
                <video
                  src={guide.introVideoUrl}
                  controls
                  playsInline
                  preload="metadata"
                  className="aspect-video w-full bg-muted object-contain"
                />
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-2">
              {guide.verified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  <BadgeCheck className="h-3.5 w-3.5" /> Verified guide
                </span>
              )}
              {guide.instantBook && (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent">
                  <Zap className="h-3.5 w-3.5" /> Instant book
                </span>
              )}
              {cityNames.map((name) => (
                <span key={name} className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs font-medium">
                  <MapPin className="h-3.5 w-3.5" /> {name}
                </span>
              ))}
            </div>
            <h1 className="mt-4 font-display text-4xl font-semibold md:text-5xl">{guide.name}</h1>
            <p className="mt-2 text-lg text-muted-foreground">{guide.tagline}</p>
            <div className="mt-4 flex items-center gap-2 text-sm">
              <Star className="h-4 w-4 fill-accent text-accent" />
              <span className="font-medium">{guide.rating}</span>
              <span className="text-muted-foreground">· {guide.reviews} reviews</span>
            </div>

            <div className="mt-8 space-y-8">
              <div>
                <h2 className="font-display text-2xl font-semibold">Tours offered by {guide.name}</h2>
                {tours.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">No tours published yet.</p>
                ) : (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {tours.map((t) => {
                      const langPrices = t.languages
                        .map((lng) => ({ lng, price: t.price_by_language[lng] ?? Number(t.price_from) }))
                        .filter((x) => x.price > 0);
                      return (
                        <Link
                          key={t.id}
                          to="/tours/$slug"
                          params={{ slug: t.slug }}
                          className="group flex flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-border/60 hover:shadow-md transition-shadow"
                        >
                          <div className="aspect-[4/3] w-full overflow-hidden bg-secondary">
                            <img src={t.cover_url || PLACEHOLDER} alt={t.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                          </div>
                          <div className="p-4">
                            <h3 className="font-semibold leading-snug">{t.title}</h3>
                            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                              {t.cities?.name && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{t.cities.name}</span>}
                              {t.duration_hours > 0 && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{Number(t.duration_hours)}h</span>}
                              {t.transport_included && <span className="inline-flex items-center gap-1 text-primary"><Car className="h-3 w-3" />transport</span>}
                            </div>
                            {langPrices.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-1">
                                {langPrices.slice(0, 4).map(({ lng, price }) => (
                                  <span key={lng} className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs">
                                    <span className="font-medium">{lng}</span>
                                    <span className="text-muted-foreground tabular-nums">${Math.round(price)}</span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <h2 className="font-display text-2xl font-semibold">Latest from {guide.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">Posts, videos and stories from social channels.</p>
                <div className="mt-4">
                  <GuidePostsFeed guideId={guide.dbId} guideName={guide.name} />
                </div>
              </div>

              <div>
                <h2 className="font-display text-2xl font-semibold">About</h2>
                <p className="mt-3 text-foreground/80 leading-relaxed">{guide.bio}</p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
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
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Specialties</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {guide.specialties.map((s) => (
                      <span key={s} className="rounded-full bg-secondary px-3 py-1 text-sm">{s}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <h2 className="font-display text-2xl font-semibold">
                  Reviews <span className="text-base font-normal text-muted-foreground">· {guide.reviews}</span>
                </h2>
                <div className="mt-4">
                  <GuideReviews guideId={guide.dbId} />
                </div>
              </div>
            </div>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl bg-card p-6 ring-1 ring-border/60 shadow-[var(--shadow-elegant)]">
              <h3 className="font-display text-lg font-semibold">Book a tour with {guide.name}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Choose a tour below to see prices per language and pick a date.
              </p>
              {tours.length === 0 ? (
                <p className="mt-5 text-sm text-muted-foreground">No tours available yet.</p>
              ) : (
                <ul className="mt-5 space-y-2">
                  {tours.map((t) => (
                    <li key={t.id}>
                      <Link
                        to="/tours/$slug"
                        params={{ slug: t.slug }}
                        className="flex items-center justify-between gap-3 rounded-xl bg-secondary/60 hover:bg-secondary px-3 py-2.5 text-sm transition"
                      >
                        <span className="truncate font-medium">{t.title}</span>
                        <span className="shrink-0 inline-flex items-center gap-1 text-xs text-muted-foreground">
                          {t.transport_included && <CarTaxiFront className="h-3.5 w-3.5 text-primary" />}
                          from ${Math.round(Number(t.price_from))}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-5 space-y-3 border-t border-border/60 pt-5 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground"><BadgeCheck className="h-4 w-4 text-primary" /> Identity & license verified</div>
                <div className="flex items-center gap-2 text-muted-foreground"><Globe2 className="h-4 w-4 text-primary" /> Speaks {guide.languages.length} languages</div>
                <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-4 w-4 text-primary" /> Works in {cityNames.length} {cityNames.length === 1 ? "city" : "cities"}</div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

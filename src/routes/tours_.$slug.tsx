import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useTour, useTours, pickTourTitle, pickTourShortDescription, pickTourDescriptionMd } from "@/lib/content-queries";
import { useI18n } from "@/lib/i18n";
import { Clock, MapPin, Check, X, Car, Star } from "lucide-react";
import { WishlistHeart } from "@/components/WishlistHeart";
import { ReviewForm } from "@/components/ReviewForm";
import { listTourReviews } from "@/lib/reviews.functions";
import { supabase } from "@/integrations/supabase/client";


export const Route = createFileRoute("/tours_/$slug")({
  head: () => ({ meta: [{ title: "Tour — Hamroh" }] }),
  component: TourDetailPage,
  errorComponent: ({ error }) => <div className="p-8 text-sm text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8 text-sm">Tour not found.</div>,
});

const PLACEHOLDER =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 9'><rect width='16' height='9' fill='%23e5e7eb'/></svg>";
const AVATAR_PLACEHOLDER =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 4'><rect width='4' height='4' fill='%23e5e7eb'/></svg>";

function TourDetailPage() {
  const { slug } = Route.useParams();
  const { t, lang } = useI18n();
  const { data: tour, isLoading } = useTour(slug);
  const { data: allTours } = useTours();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="container mx-auto px-4 py-10 text-sm text-muted-foreground">Loading…</main>
        <SiteFooter />
      </div>
    );
  }

  if (!tour) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="container mx-auto px-4 py-10">
          <Link to="/tours" className="text-sm text-primary">{t("tours.backToList")}</Link>
          <p className="mt-4 text-muted-foreground">Tour not found.</p>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const guide = tour.guides;
  const localizedTitle = pickTourTitle(tour, lang);
  const localizedShort = pickTourShortDescription(tour, lang);
  const localizedDesc = pickTourDescriptionMd(tour, lang);
  const langPrices = tour.languages
    .map((lng) => ({ lng, price: tour.price_by_language[lng] ?? Number(tour.price_from) }))
    .filter((x) => x.price > 0);

  const currentCatSlugs = new Set(
    (tour.tour_categories ?? []).map((tc) => tc.categories?.slug).filter(Boolean) as string[]
  );
  const currentCitySlug = tour.cities?.slug;
  const similar = (allTours ?? [])
    .filter((tr) => tr.id !== tour.id)
    .map((tr) => {
      let score = 0;
      if ((tr.tour_categories ?? []).some((tc) => tc.categories?.slug && currentCatSlugs.has(tc.categories.slug))) score += 2;
      if (currentCitySlug && tr.cities?.slug === currentCitySlug) score += 1;
      return { tr, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((x) => x.tr);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-8">
        <Link to="/tours" className="text-sm text-primary">{t("tours.backToList")}</Link>

        <div className="mt-4 grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div>
            <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-secondary">
              <img src={tour.cover_url || PLACEHOLDER} alt={localizedTitle} className="h-full w-full object-cover" />
              <WishlistHeart type="tour" id={tour.id} size="lg" className="absolute right-4 top-4" />
            </div>

            <div className="mt-5 flex items-center flex-wrap gap-3 text-sm text-muted-foreground">
              {tour.cities?.name && (
                <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" />{tour.cities.name}</span>
              )}
              {tour.duration_hours > 0 && (
                <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" />{Number(tour.duration_hours)}{t("tours.hours")}</span>
              )}
              {tour.transport_included && (
                <span className="inline-flex items-center gap-1 text-primary"><Car className="h-4 w-4" />Transport included</span>
              )}
            </div>
            <h1 className="mt-2 font-display text-3xl sm:text-4xl font-semibold">{localizedTitle}</h1>
            {tour.reviews_count > 0 && (
              <div className="mt-2 inline-flex items-center gap-1.5 text-sm">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${i < Math.round(tour.rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`}
                    />
                  ))}
                </div>
                <span className="font-semibold tabular-nums">{Number(tour.rating).toFixed(1)}</span>
                <span className="text-muted-foreground">· {tour.reviews_count} {tour.reviews_count === 1 ? "review" : "reviews"}</span>
              </div>
            )}
            {localizedShort && <p className="mt-2 text-lg text-muted-foreground">{localizedShort}</p>}


            {langPrices.length > 0 && (
              <section className="mt-6">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Price per language</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {langPrices.map(({ lng, price }) => (
                    <span key={lng} className="inline-flex items-center gap-2 rounded-xl bg-card ring-1 ring-border/60 px-3 py-2 text-sm">
                      <span className="font-medium">{lng}</span>
                      <span className="font-display text-lg font-semibold tabular-nums">${Math.round(price)}</span>
                      <span className="text-xs text-muted-foreground">/ person</span>
                    </span>
                  ))}
                </div>
              </section>
            )}

            {tour.highlights.length > 0 && (
              <section className="mt-8">
                <h2 className="font-semibold text-lg">{t("tours.highlights")}</h2>
                <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                  {tour.highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {localizedDesc && (
              <section className="mt-8 prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap">{localizedDesc}</p>
              </section>
            )}

            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              {tour.included.length > 0 && (
                <div>
                  <h3 className="font-semibold">{t("tours.included")}</h3>
                  <ul className="mt-2 space-y-1.5">
                    {tour.included.map((it, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm"><Check className="h-4 w-4 mt-0.5 text-green-600 shrink-0" />{it}</li>
                    ))}
                  </ul>
                </div>
              )}
              {tour.not_included.length > 0 && (
                <div>
                  <h3 className="font-semibold">{t("tours.notIncluded")}</h3>
                  <ul className="mt-2 space-y-1.5">
                    {tour.not_included.map((it, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm"><X className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />{it}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <TourReviewsSection tourId={tour.id} tourTitle={localizedTitle} />
          </div>


          <aside className="lg:sticky lg:top-20 self-start space-y-4">
            <div className="rounded-2xl bg-card p-5 ring-1 ring-border/60">
              <div className="text-sm text-muted-foreground">{t("tours.priceFrom")}</div>
              <div className="text-3xl font-semibold">${Math.round(Number(tour.price_from))}</div>
              <Link
                to="/book/$slug"
                params={{ slug: tour.slug }}
                className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                {t("tours.book")}
              </Link>
            </div>

            {guide && (
              <div className="rounded-2xl bg-card p-5 ring-1 ring-border/60">
                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Your guide</h3>
                <Link
                  to="/guides/$guideId"
                  params={{ guideId: guide.slug }}
                  className="mt-3 flex items-center gap-3 hover:bg-secondary/50 -mx-2 px-2 py-1.5 rounded-lg"
                >
                  <img
                    src={guide.photo_url || AVATAR_PLACEHOLDER}
                    alt={guide.name}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                  <div className="min-w-0">
                    <div className="font-medium truncate">{guide.name}</div>
                    <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                      <Star className="h-3 w-3 fill-accent text-accent" />
                      {Number(guide.rating).toFixed(1)} · {guide.reviews} reviews
                    </div>
                  </div>
                </Link>
              </div>
            )}
          </aside>
        </div>

        {similar.length > 0 && (
          <section className="mt-12">
            <h2 className="font-display text-2xl font-semibold">{t("tours.similar")}</h2>
            <div className="mt-5 grid gap-3 grid-cols-2 lg:grid-cols-4">
              {similar.map((tr) => (
                <Link
                  key={tr.id}
                  to="/tours/$slug"
                  params={{ slug: tr.slug }}
                  className="group overflow-hidden rounded-xl bg-card ring-1 ring-border/60 hover:shadow-md transition-shadow"
                >
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-secondary">
                    <img
                      src={tr.cover_url || PLACEHOLDER}
                      alt={tr.title}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                      loading="lazy"
                    />
                    {tr.transport_included && (
                      <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-background/95 px-1.5 py-0.5 text-[9px] font-medium text-primary backdrop-blur">
                        <Car className="h-2.5 w-2.5" /> transport
                      </span>
                    )}
                  </div>
                  <div className="p-2.5">
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground flex-wrap">
                      {tr.cities?.name && (
                        <span className="inline-flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{tr.cities.name}</span>
                      )}
                      {tr.duration_hours > 0 && (
                        <span className="inline-flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{Number(tr.duration_hours)}{t("tours.hours")}</span>
                      )}
                    </div>
                    <h3 className="mt-0.5 text-sm font-semibold leading-snug line-clamp-2">{tr.title}</h3>
                    <div className="mt-1.5 text-xs">
                      <span className="text-muted-foreground">{t("tours.priceFrom")} </span>
                      <span className="font-semibold">${Number(tr.price_from).toFixed(0)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function TourReviewsSection({ tourId, tourTitle }: { tourId: string; tourTitle: string }) {
  const fetchReviews = useServerFn(listTourReviews);
  const [userId, setUserId] = useState<string | null>(null);
  const [eligibleBookingId, setEligibleBookingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!u.user) {
        setUserId(null);
        return;
      }
      setUserId(u.user.id);
      // find a completed booking for this tour without a review yet
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, status, date, tour_id")
        .eq("user_id", u.user.id)
        .eq("tour_id", tourId);
      if (cancelled) return;
      const candidates = (bookings ?? []).filter((b) => {
        const okStatus = ["confirmed", "completed"].includes(String(b.status));
        const okDate = new Date(b.date as string).getTime() <= today.getTime();
        return okStatus && okDate;
      });
      if (candidates.length === 0) {
        setEligibleBookingId(null);
        return;
      }
      const ids = candidates.map((b) => b.id);
      const { data: existing } = await supabase
        .from("reviews")
        .select("booking_id")
        .in("booking_id", ids)
        .eq("user_id", u.user.id);
      const reviewed = new Set((existing ?? []).map((r) => r.booking_id));
      const first = candidates.find((b) => !reviewed.has(b.id));
      setEligibleBookingId(first?.id ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [tourId]);

  const q = useQuery({
    queryKey: ["tour-reviews", tourId],
    queryFn: () => fetchReviews({ data: { tourId } }),
  });

  const reviews = q.data ?? [];

  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl font-semibold">Reviews</h2>

      {eligibleBookingId && (
        <div className="mt-4 rounded-2xl bg-card ring-1 ring-border/60 p-4">
          <p className="text-sm font-medium">You went on this tour — share your experience</p>
          <ReviewForm bookingId={eligibleBookingId} guideName={tourTitle} />
        </div>
      )}

      {!eligibleBookingId && userId === null && (
        <p className="mt-3 text-sm text-muted-foreground">
          <Link to="/login" className="text-primary hover:underline">Sign in</Link> after your tour to leave a review.
        </p>
      )}

      {q.isLoading ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading reviews…</p>
      ) : reviews.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No reviews yet. Be the first to share your experience.</p>
      ) : (
        <ul className="mt-4 space-y-4">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-2xl bg-card ring-1 ring-border/60 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{r.authorName}</p>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`}
                    />
                  ))}
                </div>
              </div>
              {r.comment && (
                <p className="mt-2 text-sm text-foreground/80 whitespace-pre-line">{r.comment}</p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                {new Date(r.createdAt).toLocaleDateString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useTour } from "@/lib/content-queries";
import { useI18n } from "@/lib/i18n";
import { Clock, MapPin, Check, X } from "lucide-react";

export const Route = createFileRoute("/tours_/$slug")({
  head: () => ({ meta: [{ title: "Tour — Hamroh" }] }),
  component: TourDetailPage,
  errorComponent: ({ error }) => <div className="p-8 text-sm text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8 text-sm">Tour not found.</div>,
});

const PLACEHOLDER =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 9'><rect width='16' height='9' fill='%23e5e7eb'/></svg>";

function TourDetailPage() {
  const { slug } = Route.useParams();
  const { t } = useI18n();
  const { data: tour, isLoading } = useTour(slug);

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

  const guides = (tour.tour_guides ?? []).map((tg) => tg.guides).filter(Boolean) as NonNullable<NonNullable<typeof tour.tour_guides>[number]["guides"]>[];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-8">
        <Link to="/tours" className="text-sm text-primary">{t("tours.backToList")}</Link>

        <div className="mt-4 grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div>
            <div className="aspect-[16/9] overflow-hidden rounded-2xl bg-secondary">
              <img src={tour.cover_url || PLACEHOLDER} alt={tour.title} className="h-full w-full object-cover" />
            </div>

            <div className="mt-5 flex items-center gap-3 text-sm text-muted-foreground">
              {tour.cities?.name && (
                <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" />{tour.cities.name}</span>
              )}
              {tour.duration_hours > 0 && (
                <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" />{tour.duration_hours}{t("tours.hours")}</span>
              )}
            </div>
            <h1 className="mt-2 font-display text-3xl sm:text-4xl font-semibold">{tour.title}</h1>
            {tour.short_description && <p className="mt-2 text-lg text-muted-foreground">{tour.short_description}</p>}

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

            {tour.description_md && (
              <section className="mt-8 prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap">{tour.description_md}</p>
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
          </div>

          <aside className="lg:sticky lg:top-20 self-start space-y-4">
            <div className="rounded-2xl bg-card p-5 ring-1 ring-border/60">
              <div className="text-sm text-muted-foreground">{t("tours.priceFrom")}</div>
              <div className="text-3xl font-semibold">${Number(tour.price_from).toFixed(0)}</div>
              {guides.length > 0 && (
                <Link
                  to="/book/$guideId"
                  params={{ guideId: guides[0].slug }}
                  search={{ tour: tour.slug } as never}
                  className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90"
                >
                  {t("tours.book")}
                </Link>
              )}
            </div>

            {guides.length > 0 && (
              <div className="rounded-2xl bg-card p-5 ring-1 ring-border/60">
                <h3 className="font-semibold">{t("tours.guides")}</h3>
                <ul className="mt-3 space-y-3">
                  {guides.map((g) => (
                    <li key={g.id}>
                      <Link
                        to="/guides/$guideId"
                        params={{ guideId: g.slug }}
                        className="flex items-center gap-3 hover:bg-secondary/50 -mx-2 px-2 py-1.5 rounded-lg"
                      >
                        <img
                          src={g.photo_url || PLACEHOLDER}
                          alt={g.name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                        <span className="text-sm font-medium">{g.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

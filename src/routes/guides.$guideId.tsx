import { createFileRoute, Link } from "@tanstack/react-router";
import { Star, BadgeCheck, Zap, MapPin, Globe2, Clock, ArrowLeft } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useGuide } from "@/lib/content-queries";

export const Route = createFileRoute("/guides/$guideId")({
  head: () => ({ meta: [{ title: "Guide — Sancho" }] }),
  component: GuidePage,
});

function GuidePage() {
  const { guideId } = Route.useParams();
  const { data: guide, isLoading } = useGuide(guideId);

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
            <div className="overflow-hidden rounded-3xl">
              <img src={guide.photo} alt={guide.name} width={1200} height={900} className="aspect-[4/3] w-full object-cover" />
            </div>
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
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs font-medium">
                <MapPin className="h-3.5 w-3.5" /> {guide.city}
              </span>
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
                <h2 className="font-display text-2xl font-semibold">About</h2>
                <p className="mt-3 text-foreground/80 leading-relaxed">{guide.bio}</p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Languages</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {guide.languages.map((l) => (
                      <span key={l} className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm">
                        <Globe2 className="h-3.5 w-3.5" /> {l}
                      </span>
                    ))}
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
                <h2 className="font-display text-2xl font-semibold">Experiences</h2>
                <div className="mt-4 space-y-3">
                  {guide.experiences.map((e) => (
                    <div key={e.title} className="flex items-center justify-between gap-4 rounded-2xl bg-card p-5 ring-1 ring-border/60">
                      <div>
                        <h4 className="font-medium">{e.title}</h4>
                        <p className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" /> {e.duration}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="font-display text-xl font-semibold">${e.price}</div>
                        <div className="text-xs text-muted-foreground">per person</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl bg-card p-6 ring-1 ring-border/60 shadow-[var(--shadow-elegant)]">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="font-display text-3xl font-semibold">${guide.pricePerDay}</span>
                  <span className="text-muted-foreground"> / day</span>
                </div>
                <span className="inline-flex items-center gap-1 text-sm">
                  <Star className="h-4 w-4 fill-accent text-accent" /> {guide.rating}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">Free cancellation up to 24 hours before.</p>
              <Link
                to="/book/$guideId"
                params={{ guideId: guide.id }}
                className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02]"
              >
                {guide.instantBook ? "Book instantly" : "Request to book"}
              </Link>
              <div className="mt-5 space-y-3 border-t border-border/60 pt-5 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground"><BadgeCheck className="h-4 w-4 text-primary" /> Identity & license verified</div>
                <div className="flex items-center gap-2 text-muted-foreground"><Globe2 className="h-4 w-4 text-primary" /> Speaks {guide.languages.length} languages</div>
                <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-4 w-4 text-primary" /> Based in {guide.city}</div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

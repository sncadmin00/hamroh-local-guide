import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useI18n } from "@/lib/i18n";
import { getSpotlightById } from "@/lib/spotlights.functions";
import type { SpotlightKind, SpotlightBadge, SpotlightRow } from "@/lib/spotlights";

const KIND_LABEL_KEY: Record<SpotlightKind, "spot.newGuide.label" | "spot.newRoute.label" | "spot.news.label" | "spot.newTour.label"> = {
  new_guide: "spot.newGuide.label",
  new_route: "spot.newRoute.label",
  news: "spot.news.label",
  new_tour: "spot.newTour.label",
};

const BADGE_KEY: Record<SpotlightBadge, "spot.badge.new" | "spot.badge.featured" | "spot.badge.trending" | "spot.badge.limited"> = {
  new: "spot.badge.new",
  featured: "spot.badge.featured",
  trending: "spot.badge.trending",
  limited: "spot.badge.limited",
};

export const Route = createFileRoute("/spotlight/$id")({
  loader: async ({ params }) => {
    const row = await getSpotlightById({ data: { id: params.id } });
    if (!row) throw notFound();
    return { spotlight: row };
  },
  head: ({ loaderData }) => {
    const s = loaderData?.spotlight;
    const title = s ? `${s.title_en} — Hamroh` : "Spotlight — Hamroh";
    const description = s?.description_en?.slice(0, 160) ?? "Hamroh spotlight";
    const meta: Array<Record<string, string>> = [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ];
    if (s?.image_url) meta.push({ property: "og:image", content: s.image_url });
    return { meta };
  },
  component: SpotlightPage,
  notFoundComponent: SpotlightNotFound,
  errorComponent: SpotlightError,
});

function SpotlightPage() {
  const { t, lang } = useI18n();
  const { spotlight } = Route.useLoaderData();
  const s = spotlight as SpotlightRow;

  const title = lang === "ru" ? s.title_ru : lang === "uz" ? s.title_uz : s.title_en;
  const desc = lang === "ru" ? s.description_ru : lang === "uz" ? s.description_uz : s.description_en;

  const ctaKey: "spot.newGuide.cta" | "spot.newRoute.cta" | "spot.news.cta" | "spot.newTour.cta" =
    s.kind === "new_guide" ? "spot.newGuide.cta"
    : s.kind === "new_route" ? "spot.newRoute.cta"
    : s.kind === "news" ? "spot.news.cta"
    : "spot.newTour.cta";

  const isInternal = s.href.startsWith("/");

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <SiteHeader />
      <article className="mx-auto w-full max-w-3xl px-5 py-10 md:py-16">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("common.back")}
        </Link>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#C9A84C]">
            {t(KIND_LABEL_KEY[s.kind])}
          </span>
          {s.badge && (
            <span className="rounded-full bg-[var(--secondary)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--foreground)]">
              {t(BADGE_KEY[s.badge])}
            </span>
          )}
        </div>

        <h1 className="font-serif text-3xl leading-tight text-[var(--foreground)] md:text-5xl">
          {title}
        </h1>

        {s.image_url && (
          <div className="mt-8 overflow-hidden rounded-2xl bg-[var(--secondary)]">
            <img
              src={s.image_url}
              alt=""
              className="h-auto w-full object-cover"
              loading="eager"
            />
          </div>
        )}

        {desc && (
          <div className="mt-8 whitespace-pre-line text-lg leading-relaxed text-[var(--foreground)]/90">
            {desc}
          </div>
        )}

        {s.href && (
          <div className="mt-10 border-t border-[var(--border)] pt-8">
            {isInternal ? (
              <Link
                to={s.href}
                className="inline-flex items-center gap-2 rounded-full bg-[#C9A84C] px-6 py-3 text-sm font-semibold text-[#0B1430] transition-transform hover:-translate-y-0.5"
              >
                {t(ctaKey)}
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            ) : (
              <a
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-[#C9A84C] px-6 py-3 text-sm font-semibold text-[#0B1430] transition-transform hover:-translate-y-0.5"
              >
                {t(ctaKey)}
                <ArrowUpRight className="h-4 w-4" />
              </a>
            )}
          </div>
        )}
      </article>
      <SiteFooter />
    </div>
  );
}

function SpotlightNotFound() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <SiteHeader />
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="font-serif text-3xl text-[var(--foreground)]">Spotlight not found</h1>
        <p className="mt-3 text-[var(--muted-foreground)]">
          This spotlight is no longer available.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-1.5 text-sm text-[#C9A84C] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
      </div>
      <SiteFooter />
    </div>
  );
}

function SpotlightError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <SiteHeader />
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="font-serif text-3xl text-[var(--foreground)]">Something went wrong</h1>
        <p className="mt-3 text-sm text-[var(--muted-foreground)]">{error.message}</p>
        <button
          onClick={() => {
            reset();
            router.invalidate();
          }}
          className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-[#C9A84C] px-5 py-2 text-sm font-semibold text-[#0B1430]"
        >
          Try again
        </button>
      </div>
      <SiteFooter />
    </div>
  );
}

import { Link } from "@tanstack/react-router";
import { BadgeCheck, Zap, MapPin, Globe2, Languages } from "lucide-react";
import type { Guide } from "@/data/guides";
import { WishlistHeart } from "@/components/WishlistHeart";
import { useCities } from "@/lib/content-queries";
import { GuideBadges } from "@/components/GuideBadges";

export function GuideCard({ guide }: { guide: Guide }) {
  const { data: cities } = useCities();
  const extraNames = (guide.extraCityIds ?? [])
    .map((id) => cities?.find((c) => c.id === id)?.name)
    .filter(Boolean) as string[];
  const isMultiCity = extraNames.length > 0;
  const isBilingual = (guide.languages ?? []).length > 1;
  const hasVerifiedLanguage = Object.keys(guide.verifiedLanguages ?? {}).length > 0;
  return (
    <Link
      to="/guides/$guideId"
      params={{ guideId: guide.id }}
      className="group flex flex-col overflow-hidden rounded-2xl bg-card shadow-[var(--shadow-card)] ring-1 ring-border/60 transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-elegant)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={guide.photo}
          alt={guide.name}
          loading="lazy"
          width={800}
          height={600}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute left-3 top-3 flex gap-2">
          {guide.verified && (
            <span className="inline-flex items-center gap-1 rounded-full bg-background/95 px-2.5 py-1 text-xs font-medium backdrop-blur">
              <BadgeCheck className="h-3.5 w-3.5 text-primary" /> Verified
            </span>
          )}
          {guide.instantBook && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">
              <Zap className="h-3.5 w-3.5" /> Instant
            </span>
          )}
        </div>
        <WishlistHeart type="guide" id={guide.dbId} className="absolute right-3 top-3" />
      </div>

      <div className="flex flex-1 flex-col p-6">
        <h3 className="font-display text-xl font-semibold">{guide.name}</h3>

        <p className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" /> {allCities.join(" · ")}
        </p>

        <div className="mt-4">

          <GuideBadges
            data={{
              identityVerified: guide.identityVerified,
              hasVerifiedLanguage,
              introVideoVerified: guide.introVideoVerified,
              reviewsCount: guide.reviews,
              avgRating: guide.rating,
              completedToursCount: guide.completedToursCount,
              avgResponseMinutes: guide.avgResponseMinutes,
              hasTransport: guide.hasTransport,
              transportSeats: guide.transportSeats,
            }}
          />
        </div>

        <div className="mt-auto pt-4 flex items-center justify-end border-t border-border/60">
          <span className="text-sm font-medium text-primary group-hover:underline">View tours →</span>
        </div>
      </div>
    </Link>
  );
}


import { Link } from "@tanstack/react-router";
import { BadgeCheck, Zap, Star, Globe2, Languages } from "lucide-react";
import type { Guide } from "@/data/guides";
import { WishlistHeart } from "@/components/WishlistHeart";
import { useCities } from "@/lib/content-queries";

export function GuideCard({ guide }: { guide: Guide }) {
  const { data: cities } = useCities();
  const extraNames = (guide.extraCityIds ?? [])
    .map((id) => cities?.find((c) => c.id === id)?.name)
    .filter(Boolean) as string[];
  const isMultiCity = extraNames.length > 0;
  const isBilingual = (guide.languages ?? []).length > 1;

  return (
    <Link
      to="/guides/$guideId"
      params={{ guideId: guide.id }}
      className="group block"
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-secondary">
        <img
          src={guide.photo}
          alt={guide.name}
          loading="lazy"
          width={800}
          height={1000}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
        <div className="absolute left-3 top-3 flex gap-1.5">
          {guide.verified && (
            <span className="inline-flex items-center gap-1 rounded-full bg-background/95 px-2 py-1 text-[11px] font-medium backdrop-blur">
              <BadgeCheck className="h-3 w-3 text-primary" /> Verified
            </span>
          )}
          {guide.instantBook && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-1 text-[11px] font-medium text-accent-foreground">
              <Zap className="h-3 w-3" /> Instant
            </span>
          )}
        </div>
        <WishlistHeart type="guide" id={guide.dbId} className="absolute right-3 top-3" />
      </div>

      <div className="pt-3 px-0.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-[15px] font-semibold text-foreground leading-tight line-clamp-1">
            {guide.name}
          </h3>
          {guide.reviews > 0 && (
            <span className="inline-flex items-center gap-1 text-[13px] text-foreground shrink-0">
              <Star className="h-3.5 w-3.5 fill-foreground text-foreground" />
              <span className="tabular-nums font-medium">{guide.rating.toFixed(1)}</span>
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[13px] text-muted-foreground line-clamp-1">
          {guide.city}
          {extraNames.length > 0 ? ` · +${extraNames.length}` : ""}
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {isMultiCity && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Globe2 className="h-3 w-3" /> Multi-city
            </span>
          )}
          {isBilingual && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Languages className="h-3 w-3" /> {(guide.languages ?? []).length} langs
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

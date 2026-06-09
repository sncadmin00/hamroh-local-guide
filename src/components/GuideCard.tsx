import { Link } from "@tanstack/react-router";
import { BadgeCheck, Star } from "lucide-react";
import type { Guide } from "@/data/guides";



export function GuideCard({ guide }: { guide: Guide }) {
  const langs = (guide.languages ?? []).slice(0, 3).join(", ");

  return (
    <Link
      to="/guides/$guideId"
      params={{ guideId: guide.id }}
      className="group block aspect-square w-full"
    >
      <div className="flex h-full w-full flex-col rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
        <div className="flex items-start gap-4">
          <div className="aspect-square w-[34%] max-w-[110px] shrink-0 overflow-hidden rounded-full bg-secondary">
            <img
              src={guide.photo}
              alt={guide.name}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            />
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-1 pt-1">
            <h3 className="font-display text-lg font-semibold leading-tight text-foreground line-clamp-1">
              {guide.name.split(" ")[0]}
            </h3>
            <p className="inline-flex items-center gap-1 text-sm text-muted-foreground line-clamp-1">
              {guide.city}
              {guide.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-primary" />}
            </p>

            {guide.reviews > 0 && (
              <div className="inline-flex items-center gap-1 text-sm text-foreground">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span className="font-semibold tabular-nums">{guide.rating.toFixed(1)}</span>
                <span className="text-muted-foreground">({guide.reviews} reviews)</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-1 text-sm text-muted-foreground">
          {langs && (
            <p className="line-clamp-1">
              Speaks: <span className="text-foreground">{langs}</span>
            </p>
          )}
          {guide.completedToursCount > 0 && (
            <p className="line-clamp-1">{guide.completedToursCount} tours</p>
          )}
        </div>

        <div className="mt-auto flex items-end justify-end pt-3">
          <p className="text-sm text-muted-foreground">
            From <span className="text-xl font-bold text-foreground">${guide.pricePerDay}</span>
          </p>
        </div>
      </div>
    </Link>
  );
}

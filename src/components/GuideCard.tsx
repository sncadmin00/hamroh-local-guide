import { Link } from "@tanstack/react-router";
import { BadgeCheck, Star } from "lucide-react";
import type { Guide } from "@/data/guides";

export function GuideCard({ guide }: { guide: Guide }) {
  return (
    <Link
      to="/guides/$guideId"
      params={{ guideId: guide.id }}
      className="group block text-center"
    >
      <div className="mx-auto aspect-square w-full max-w-[200px] overflow-hidden rounded-full bg-secondary">
        <img
          src={guide.photo}
          alt={guide.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
      </div>

      <div className="pt-4">
        <div className="flex items-center justify-center gap-1.5">
          <h3 className="font-display text-[15px] font-semibold text-foreground leading-tight line-clamp-1">
            {guide.name}
          </h3>
          {guide.verified && <BadgeCheck className="h-4 w-4 text-primary shrink-0" />}
        </div>
        <p className="mt-0.5 text-[13px] text-muted-foreground line-clamp-1">{guide.city}</p>
        {guide.reviews > 0 && (
          <div className="mt-1 inline-flex items-center gap-1 text-[13px] text-foreground">
            <Star className="h-3.5 w-3.5 fill-foreground text-foreground" />
            <span className="tabular-nums font-medium">{guide.rating.toFixed(1)}</span>
          </div>
        )}
      </div>
    </Link>
  );
}

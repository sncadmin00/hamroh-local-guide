import { Link } from "@tanstack/react-router";
import { Star, BadgeCheck, Zap, MapPin } from "lucide-react";
import type { Guide } from "@/data/guides";

export function GuideCard({ guide }: { guide: Guide }) {
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
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-xl font-semibold">{guide.name}</h3>
          <span className="inline-flex items-center gap-1 text-sm font-medium">
            <Star className="h-4 w-4 fill-accent text-accent" />
            {guide.rating}
            <span className="text-muted-foreground">({guide.reviews})</span>
          </span>
        </div>
        <p className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" /> {guide.city}
        </p>
        <p className="mt-3 text-sm text-foreground/80">{guide.tagline}</p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {guide.languages.slice(0, 3).map((l) => (
            <span key={l} className="rounded-full bg-secondary px-2.5 py-1 text-xs text-secondary-foreground">{l}</span>
          ))}
        </div>
        <div className="mt-5 flex items-end justify-between border-t border-border/60 pt-4">
          <div>
            <span className="font-display text-2xl font-semibold">${guide.pricePerDay}</span>
            <span className="text-sm text-muted-foreground"> / day</span>
          </div>
          <span className="text-sm font-medium text-primary group-hover:underline">View profile →</span>
        </div>
      </div>
    </Link>
  );
}

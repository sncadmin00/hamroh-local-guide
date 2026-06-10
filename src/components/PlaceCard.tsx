import { MapPin } from "lucide-react";
import type { Place } from "@/lib/content-queries";

const PLACEHOLDER =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 3'><rect width='4' height='3' fill='%23e5e7eb'/></svg>";

export function PlaceCard({ place }: { place: Place }) {
  return (
    <div className="overflow-hidden rounded-xl bg-card ring-1 ring-border/60">
      <div className="aspect-[16/10] w-full overflow-hidden bg-secondary">
        <img
          src={place.photoUrl || PLACEHOLDER}
          alt={place.name}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>
      <div className="p-2.5">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground flex-wrap">
          {place.cityName && (
            <span className="inline-flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{place.cityName}</span>
          )}
          <span className="inline-flex items-center gap-0.5 rounded-full bg-secondary px-1.5 py-0.5">{place.category}</span>
        </div>
        <h3 className="mt-0.5 text-sm font-semibold leading-snug line-clamp-2">{place.name}</h3>
        {place.shortDescription && (
          <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">{place.shortDescription}</p>
        )}
      </div>
    </div>
  );
}

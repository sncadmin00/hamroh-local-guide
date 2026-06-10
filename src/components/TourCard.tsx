import { Link } from "@tanstack/react-router";
import { Clock, MapPin, Car } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { pickTourTitle, type TourRow } from "@/lib/content-queries";

const PLACEHOLDER =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 3'><rect width='4' height='3' fill='%23e5e7eb'/></svg>";

export function TourCard({ tour }: { tour: TourRow }) {
  const { t, lang } = useI18n();
  return (
    <Link
      to="/tours/$slug"
      params={{ slug: tour.slug }}
      className="group overflow-hidden rounded-xl bg-card ring-1 ring-border/60 hover:shadow-md transition-shadow"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-secondary">
        <img
          src={tour.cover_url || PLACEHOLDER}
          alt={pickTourTitle(tour, lang)}
          className="h-full w-full object-cover group-hover:scale-105 transition-transform"
          loading="lazy"
        />
        {tour.transport_included && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-background/95 px-1.5 py-0.5 text-[9px] font-medium text-primary backdrop-blur">
            <Car className="h-2.5 w-2.5" /> transport
          </span>
        )}
      </div>
      <div className="p-2.5">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground flex-wrap">
          {tour.cities?.name && (
            <span className="inline-flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{tour.cities.name}</span>
          )}
          {tour.duration_hours > 0 && (
            <span className="inline-flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{Number(tour.duration_hours)}{t("tours.hours")}</span>
          )}
        </div>
        <h3 className="mt-0.5 text-sm font-semibold leading-snug line-clamp-2">{pickTourTitle(tour, lang)}</h3>
        {tour.guides?.name && (
          <p className="mt-0.5 text-[10px] text-muted-foreground">{t("tours.by")} {tour.guides.name}</p>
        )}
        <div className="mt-1.5 text-xs">
          <span className="text-muted-foreground">{t("tours.priceFrom")} </span>
          <span className="font-semibold">${Number(tour.price_from).toFixed(0)}</span>
        </div>
      </div>
    </Link>
  );
}

import { Link } from "@tanstack/react-router";
import { BadgeCheck, Star, MapPin } from "lucide-react";
import type { Guide } from "@/data/guides";

const LANG_CODE: Record<string, string> = {
  English: "EN",
  Russian: "RU",
  Uzbek: "UZ",
  Tajik: "TJ",
  French: "FR",
  German: "DE",
  Spanish: "ES",
  Italian: "IT",
  Chinese: "ZH",
  Japanese: "JA",
  Korean: "KO",
  Arabic: "AR",
  Turkish: "TR",
};

function langCode(name: string) {
  return LANG_CODE[name] ?? name.slice(0, 2).toUpperCase();
}

export function GuideCard({ guide }: { guide: Guide }) {
  const langs = (guide.languages ?? []).slice(0, 3).map(langCode).join(" · ");

  return (
    <Link
      to="/guides/$guideId"
      params={{ guideId: guide.id }}
      className="group block aspect-square w-full text-center"
    >
      <div className="flex h-full w-full flex-col items-center justify-start gap-3 p-2">
        <div className="aspect-square w-[62%] max-w-[160px] overflow-hidden rounded-full bg-secondary">
          <img
            src={guide.photo}
            alt={guide.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        </div>

        <div className="flex min-w-0 flex-col items-center gap-0.5">
          <div className="flex items-center justify-center gap-1.5">
            <h3 className="font-display text-[15px] font-semibold leading-tight text-foreground line-clamp-1">
              {guide.name.split(" ")[0]}
            </h3>
            {guide.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-primary" />}
          </div>

          <p className="inline-flex items-center gap-1 text-[13px] text-muted-foreground line-clamp-1">
            <MapPin className="h-3.5 w-3.5" />
            {guide.city}
          </p>

          {guide.reviews > 0 && (
            <div className="inline-flex items-center gap-1 text-[13px] text-foreground">
              <Star className="h-3.5 w-3.5 fill-foreground text-foreground" />
              <span className="font-medium tabular-nums">{guide.rating.toFixed(1)}</span>
              <span className="text-muted-foreground">({guide.reviews})</span>
            </div>
          )}

          {langs && (
            <p className="text-[12px] uppercase tracking-wide text-muted-foreground">{langs}</p>
          )}
        </div>
      </div>
    </Link>
  );
}

import { ArrowUpRight } from "lucide-react";
import { useSpotlights } from "@/lib/content-queries";
import { useI18n } from "@/lib/i18n";
import type { SpotlightKind, SpotlightRow } from "@/lib/spotlights";

const PLACEHOLDER =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 3'><rect width='4' height='3' fill='%23e5e7eb'/></svg>";

const KIND_LABEL_KEY: Record<SpotlightKind, "spot.newGuide.label" | "spot.newRoute.label" | "spot.news.label" | "spot.newTour.label"> = {
  new_guide: "spot.newGuide.label",
  new_route: "spot.newRoute.label",
  news: "spot.news.label",
  new_tour: "spot.newTour.label",
};

export function SpotlightBanner() {
  const { t, lang } = useI18n();
  const { data: items = [] } = useSpotlights();

  if (items.length === 0) return null;

  const pick = (s: SpotlightRow) => ({
    title: lang === "ru" ? s.title_ru : lang === "uz" ? s.title_uz : s.title_en,
    desc: lang === "ru" ? s.description_ru : lang === "uz" ? s.description_uz : s.description_en,
  });

  // Slim editorial news bar — one teaser at a time, rotates on tap
  const s = items[0];
  const { title } = pick(s);
  return (
    <div className="mb-8 w-full max-w-2xl">
      <a
        href={s.href}
        className="group flex items-center gap-4 border-y border-slate-900/10 py-4 transition-opacity hover:opacity-70"
      >
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-sm bg-slate-100">
          <img
            src={s.image_url || PLACEHOLDER}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gold">
            <span>{t(KIND_LABEL_KEY[s.kind])}</span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-500">{t("spot.whatsNew")}</span>
          </div>
          <h3 className="truncate font-serif text-base sm:text-lg leading-tight text-slate-900">
            {title}
          </h3>
        </div>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </a>
    </div>
  );
}

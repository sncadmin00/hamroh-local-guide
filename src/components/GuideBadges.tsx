import { BadgeCheck, ShieldCheck, Video, Languages, Star, Compass, Clock, Car } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useI18n } from "@/lib/i18n";

export type GuideBadgesData = {
  identityVerified: boolean;
  hasVerifiedLanguage: boolean;
  introVideoVerified: boolean;
  reviewsCount: number;
  avgRating?: number | null;
  completedToursCount: number;
  avgResponseMinutes: number | null;
  hasTransport?: boolean;
  transportSeats?: number | null;
};

const REVIEWS_THRESHOLD = 3;
const RESPONSE_LIMIT = 30;

function fmt(template: string, vars: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}

function BadgePill({
  active,
  icon: Icon,
  label,
  tooltip,
  premium = false,
}: {
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  tooltip: string;
  premium?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${
            active
              ? premium
                ? "bg-gold/10 text-gold ring-gold/30"
                : "bg-accent/10 text-accent ring-accent/25"
              : "bg-muted text-muted-foreground/60 ring-border/60 opacity-50"
          }`}
        >
          <Icon className="h-3 w-3" />
          {label}
        </span>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

export function GuideBadges({ data, compact = false }: { data: GuideBadgesData; compact?: boolean }) {
  const { t } = useI18n();
  const responseActive = data.avgResponseMinutes !== null && data.avgResponseMinutes <= RESPONSE_LIMIT;
  const reviewsActive = data.reviewsCount >= REVIEWS_THRESHOLD;
  const min = t("badges.min");

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-1.5">
        {!compact && (
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70">{t("badges.verified")}</p>
        )}
        <div className="flex flex-wrap gap-1">
          <BadgePill
            active={data.identityVerified}
            icon={ShieldCheck}
            label={t("badges.identity")}
            tooltip={data.identityVerified ? t("badges.identity.on") : t("badges.identity.off")}
            premium
          />
          <BadgePill
            active={data.hasVerifiedLanguage}
            icon={Languages}
            label={t("badges.language")}
            tooltip={data.hasVerifiedLanguage ? t("badges.language.on") : t("badges.language.off")}
          />
          <BadgePill
            active={data.introVideoVerified}
            icon={Video}
            label={t("badges.introVideo")}
            tooltip={data.introVideoVerified ? t("badges.introVideo.on") : t("badges.introVideo.off")}
          />
        </div>

        {!compact && (
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 pt-1">{t("badges.activity")}</p>
        )}
        <div className="flex flex-wrap gap-1">
          <BadgePill
            active={!!data.hasTransport}
            icon={Car}
            label={
              data.hasTransport && data.transportSeats
                ? fmt(t("badges.transport.seats"), { n: data.transportSeats })
                : t("badges.transport")
            }
            tooltip={
              data.hasTransport
                ? data.transportSeats
                  ? fmt(t("badges.transport.on"), { n: data.transportSeats })
                  : t("badges.transport.onNoSeats")
                : t("badges.transport.off")
            }
          />
          <BadgePill
            active={reviewsActive}
            premium={reviewsActive}
            icon={Star}
            label={
              data.avgRating != null && data.reviewsCount > 0
                ? `${data.avgRating.toFixed(1)} ★ · ${data.reviewsCount}`
                : `${data.reviewsCount} ${t("badges.reviews")}`
            }
            tooltip={reviewsActive
              ? fmt(t("badges.reviews.on"), { n: data.reviewsCount })
              : fmt(t("badges.reviews.off"), { n: REVIEWS_THRESHOLD })}
          />
          <BadgePill
            active={data.completedToursCount > 0}
            icon={Compass}
            label={`${data.completedToursCount} ${t("badges.tours")}`}
            tooltip={fmt(t("badges.tours.count"), { n: data.completedToursCount })}
          />
          <BadgePill
            active={responseActive}
            icon={Clock}
            label={responseActive ? `<${RESPONSE_LIMIT} ${min}` : (data.avgResponseMinutes !== null ? `${Math.round(data.avgResponseMinutes)} ${min}` : "—")}
            tooltip={
              data.avgResponseMinutes === null
                ? t("badges.response.none")
                : responseActive
                  ? fmt(t("badges.response.on"), { n: Math.round(data.avgResponseMinutes) })
                  : fmt(t("badges.response.off"), { n: Math.round(data.avgResponseMinutes), limit: RESPONSE_LIMIT })
            }
          />
        </div>
      </div>
    </TooltipProvider>
  );
}

// Avoids unused import warning
void BadgeCheck;

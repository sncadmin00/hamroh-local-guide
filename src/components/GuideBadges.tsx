import { BadgeCheck, ShieldCheck, Video, Languages, Star, Compass, Clock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export type GuideBadgesData = {
  identityVerified: boolean;
  hasVerifiedLanguage: boolean;
  introVideoVerified: boolean;
  reviewsCount: number;
  completedToursCount: number;
  avgResponseMinutes: number | null;
};

const REVIEWS_THRESHOLD = 3;
const RESPONSE_LIMIT = 30;

function BadgePill({
  active,
  icon: Icon,
  label,
  tooltip,
}: {
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  tooltip: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${
            active
              ? "bg-primary/10 text-primary ring-primary/20"
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
  const responseActive = data.avgResponseMinutes !== null && data.avgResponseMinutes <= RESPONSE_LIMIT;
  const reviewsActive = data.reviewsCount >= REVIEWS_THRESHOLD;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-1.5">
        {!compact && (
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70">Verified</p>
        )}
        <div className="flex flex-wrap gap-1">
          <BadgePill
            active={data.identityVerified}
            icon={ShieldCheck}
            label="Identity"
            tooltip={data.identityVerified ? "Email, phone & passport verified" : "Identity not verified"}
          />
          <BadgePill
            active={data.hasVerifiedLanguage}
            icon={Languages}
            label="Language"
            tooltip={data.hasVerifiedLanguage ? "AI language test passed (B1+)" : "No verified language"}
          />
          <BadgePill
            active={data.introVideoVerified}
            icon={Video}
            label="Intro video"
            tooltip={data.introVideoVerified ? "Intro video approved" : "No approved intro video"}
          />
        </div>
        {!compact && (
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 pt-1">Activity</p>
        )}
        <div className="flex flex-wrap gap-1">
          <BadgePill
            active={reviewsActive}
            icon={Star}
            label={`${data.reviewsCount} reviews`}
            tooltip={reviewsActive ? `${data.reviewsCount} reviews from completed tours` : `Needs ${REVIEWS_THRESHOLD}+ verified reviews`}
          />
          <BadgePill
            active={data.completedToursCount > 0}
            icon={Compass}
            label={`${data.completedToursCount} tours`}
            tooltip={`${data.completedToursCount} completed tours`}
          />
          <BadgePill
            active={responseActive}
            icon={Clock}
            label={responseActive ? `<${RESPONSE_LIMIT} min` : (data.avgResponseMinutes !== null ? `${Math.round(data.avgResponseMinutes)} min` : "—")}
            tooltip={
              data.avgResponseMinutes === null
                ? "Not enough data to measure response time"
                : responseActive
                  ? `Median response time ${Math.round(data.avgResponseMinutes)} min`
                  : `Median response ${Math.round(data.avgResponseMinutes)} min (badge requires <${RESPONSE_LIMIT})`
            }
          />
        </div>
      </div>
    </TooltipProvider>
  );
}

// Avoids unused import warning
void BadgeCheck;

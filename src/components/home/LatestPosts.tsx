import { Link } from "@tanstack/react-router";
import { Instagram, Facebook, Youtube, Link2, Music2 } from "lucide-react";
import { useLatestPosts } from "@/lib/content-queries";
import { useI18n } from "@/lib/i18n";

const platformMeta = {
  instagram: { label: "Instagram", Icon: Instagram },
  facebook: { label: "Facebook", Icon: Facebook },
  tiktok: { label: "TikTok", Icon: Music2 },
  youtube: { label: "YouTube", Icon: Youtube },
  other: { label: "Post", Icon: Link2 },
} as const;

export function LatestPosts() {
  const { t } = useI18n();
  const { data: posts = [], isLoading } = useLatestPosts(12);
  if (isLoading || posts.length === 0) return null;

  return (
    <section className="px-6 py-16 md:py-20 bg-secondary/40">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground">
              {t("latest.title")}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">{t("latest.subtitle")}</p>
          </div>
        </div>

        <div className="-mx-6 px-6">
          <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:thin]">
            {posts.map((p) => {
              const meta = platformMeta[p.platform];
              const Icon = meta.Icon;
              return (
                <Link
                  key={p.id}
                  to="/guides/$guideId"
                  params={{ guideId: p.guideSlug }}
                  className="relative flex h-72 w-48 shrink-0 snap-start flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-border/60 transition-transform hover:-translate-y-0.5"
                >
                  {p.thumbnailUrl ? (
                    <img
                      src={p.thumbnailUrl}
                      alt={p.caption || meta.label}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-background" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="relative mt-auto flex flex-col gap-2 p-3 text-white">
                    <span className="inline-flex w-fit items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-medium backdrop-blur">
                      <Icon className="h-3 w-3" /> {meta.label}
                    </span>
                    <p className="text-xs font-medium opacity-90">{p.guideName}</p>
                    {p.caption && (
                      <p className="line-clamp-2 text-xs leading-snug opacity-80">{p.caption}</p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

import { Instagram, Facebook, Youtube, ExternalLink, Music2 } from "lucide-react";
import { useGuidePosts, type GuidePost } from "@/lib/content-queries";

const platformMeta: Record<GuidePost["platform"], { label: string; Icon: typeof Instagram }> = {
  instagram: { label: "Instagram", Icon: Instagram },
  facebook: { label: "Facebook", Icon: Facebook },
  tiktok: { label: "TikTok", Icon: Music2 },
  youtube: { label: "YouTube", Icon: Youtube },
  other: { label: "Link", Icon: ExternalLink },
};

export function GuidePostsFeed({ guideId, guideName }: { guideId: string; guideName: string }) {
  const { data: posts, isLoading } = useGuidePosts(guideId);

  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-64 w-44 shrink-0 animate-pulse rounded-2xl bg-secondary" />
        ))}
      </div>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="rounded-2xl bg-card p-6 ring-1 ring-border/60 text-sm text-muted-foreground">
        {guideName} hasn't posted yet. Check back soon.
      </div>
    );
  }

  return (
    <div className="-mx-4 px-4 md:mx-0 md:px-0">
      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:thin]">
        {posts.map((post) => {
          const meta = platformMeta[post.platform];
          const Icon = meta.Icon;
          return (
            <a
              key={post.id}
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex h-72 w-48 shrink-0 snap-start flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-border/60 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-elegant)]"
            >
              {post.thumbnailUrl ? (
                <img
                  src={post.thumbnailUrl}
                  alt={post.caption || meta.label}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-background" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="relative mt-auto flex flex-col gap-2 p-3 text-white">
                <span className="inline-flex w-fit items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-medium backdrop-blur">
                  <Icon className="h-3 w-3" /> {meta.label}
                </span>
                {post.caption && (
                  <p className="line-clamp-3 text-xs leading-snug">{post.caption}</p>
                )}
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}

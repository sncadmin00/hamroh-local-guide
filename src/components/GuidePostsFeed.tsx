import { Play, Video } from "lucide-react";
import { useGuidePosts } from "@/lib/content-queries";

export function GuidePostsFeed({ guideId, guideName }: { guideId: string; guideName: string }) {
  const { data: posts, isLoading } = useGuidePosts(guideId);

  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-72 w-48 shrink-0 animate-pulse rounded-2xl bg-secondary" />
        ))}
      </div>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="rounded-2xl bg-card p-6 ring-1 ring-border/60 text-sm text-muted-foreground">
        {guideName} hasn't posted a video yet. Check back soon.
      </div>
    );
  }

  return (
    <div className="-mx-4 px-4 md:mx-0 md:px-0">
      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:thin]">
        {posts.map((post) => (
          <a
            key={post.id}
            href={post.videoUrl ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="relative flex h-72 w-48 shrink-0 snap-start flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-border/60 select-none group"
          >
            {post.thumbnailUrl ? (
              <img
                src={post.thumbnailUrl}
                alt={post.caption || "Video"}
                loading="lazy"
                draggable={false}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-background flex items-center justify-center">
                <Video className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(0,0,0,0.35)" }}>
              <Play className="h-10 w-10 text-white fill-white" />
            </div>
            <div className="relative mt-auto flex flex-col gap-2 p-3 text-white">
              {post.durationSeconds ? (
                <span className="inline-flex w-fit items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-medium backdrop-blur">
                  {post.durationSeconds}s
                </span>
              ) : null}
              {post.caption && (
                <p className="line-clamp-3 text-xs leading-snug">{post.caption}</p>
              )}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

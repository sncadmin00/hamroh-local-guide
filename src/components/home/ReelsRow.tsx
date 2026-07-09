import { useEffect, useState } from "react";
import { Play } from "lucide-react";
import { useI18n } from "@/lib/i18n";

type Reel = {
  id: string;
  video_url: string | null;
  thumbnail_url: string | null;
  caption: string;
  guide_name: string | null;
};

export function ReelsRow() {
  const { t } = useI18n();
  const [posts, setPosts] = useState<Reel[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/public/hooks/featured-reels?limit=12");
        if (!res.ok) return;
        const json = (await res.json()) as { items?: Reel[] };
        setPosts(json.items ?? []);
      } catch {
        /* noop */
      }
    })();
  }, []);

  if (posts.length === 0) return null;

  return (
    <section className="max-w-[1280px] mx-auto px-4 md:px-8 pt-10">
      <h2 className="text-2xl md:text-3xl tracking-tight mb-4" style={{ color: "var(--foreground)", fontFamily: "'DM Serif Display', serif" }}>
        {t("home.reels") || "From our guides"}
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-2 snap-x scrollbar-none" style={{ scrollbarWidth: "none" }}>
        {posts.map((p) => (
          <a
            key={p.id}
            href={p.video_url ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 w-[160px] md:w-[180px] snap-start rounded-2xl overflow-hidden relative group"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          >
            <div className="aspect-[9/16] bg-secondary relative">
              {p.thumbnail_url ? (
                <img src={p.thumbnail_url} alt={p.caption ?? ""} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl">🎬</div>
              )}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(0,0,0,0.4)" }}>
                <Play className="h-10 w-10 text-white fill-white" />
              </div>
            </div>
            <div className="p-2">
              <p className="text-xs font-semibold truncate" style={{ color: "var(--foreground)" }}>{p.guide_name || "Guide"}</p>
              {p.caption && <p className="text-[10px] truncate" style={{ color: "var(--muted-foreground)" }}>{p.caption}</p>}
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

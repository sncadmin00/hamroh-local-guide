import { useEffect, useState } from "react";
import { Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

type Post = { id: string; url: string; caption: string | null; platform: string | null; thumbnail_url: string | null; guide_name?: string | null };

const emoji = (p: string | null) => (p === "instagram" ? "📸" : p === "tiktok" ? "🎵" : p === "youtube" ? "▶️" : "🎬");

export function ReelsRow() {
  const { t } = useI18n();
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("guide_posts")
        .select("id,url,caption,platform,thumbnail_url,guides(name)")
        .eq("visible", true)
        .order("sort_order", { ascending: true })
        .limit(12);
      setPosts((data ?? []).map((r: { id: string; url: string; caption: string | null; platform: string | null; thumbnail_url: string | null; guides?: { name?: string | null } | null }) => ({
        id: r.id, url: r.url, caption: r.caption, platform: r.platform, thumbnail_url: r.thumbnail_url, guide_name: r.guides?.name ?? null,
      })));
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
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 w-[160px] md:w-[180px] snap-start rounded-2xl overflow-hidden relative group"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          >
            <div className="aspect-[9/16] bg-secondary relative">
              {p.thumbnail_url ? (
                <img src={p.thumbnail_url} alt={p.caption ?? ""} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl">{emoji(p.platform)}</div>
              )}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(0,0,0,0.4)" }}>
                <Play className="h-10 w-10 text-white fill-white" />
              </div>
              <div className="absolute top-2 left-2 text-lg">{emoji(p.platform)}</div>
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

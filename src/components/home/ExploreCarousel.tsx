import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, MapPin, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

type Card =
  | { kind: "tour"; id: string; title: string; image: string | null; slug: string; meta?: string; rating?: number }
  | { kind: "guide"; id: string; title: string; image: string | null; slug: string; meta?: string; rating?: number }
  | { kind: "place"; id: string; title: string; image: string | null; slug: string; meta?: string };

export function ExploreCarousel() {
  const { t } = useI18n();
  const [cards, setCards] = useState<Card[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const [tours, guides, places] = await Promise.all([
        supabase.from("tours").select("id,title_en,cover_url,slug,rating").eq("published", true).limit(4),
        supabase.from("guides").select("id,name,photo_url,slug,rating").eq("verified", true).limit(4),
        supabase.from("places").select("id,name,photo_url,slug").eq("published", true).limit(4),
      ]);
      const mixed: Card[] = [];
      const t2 = ((tours.data ?? []) as Array<{ id: string; title_en: string | null; cover_url: string | null; slug: string; rating: number | null }>).map<Card>((r) => ({ kind: "tour", id: r.id, title: r.title_en ?? "", image: r.cover_url, slug: r.slug, rating: r.rating ?? undefined }));
      const g2 = ((guides.data ?? []) as Array<{ id: string; name: string | null; photo_url: string | null; slug: string; rating: number | null }>).map<Card>((r) => ({ kind: "guide", id: r.id, title: (r.name || "").split(" ")[0], image: r.photo_url, slug: r.slug, rating: r.rating ?? undefined }));
      const p2 = ((places.data ?? []) as Array<{ id: string; name: string | null; photo_url: string | null; slug: string }>).map<Card>((r) => ({ kind: "place", id: r.id, title: r.name ?? "", image: r.photo_url, slug: r.slug }));
      const max = Math.max(t2.length, g2.length, p2.length);
      for (let i = 0; i < max; i++) { if (t2[i]) mixed.push(t2[i]); if (g2[i]) mixed.push(g2[i]); if (p2[i]) mixed.push(p2[i]); }
      setCards(mixed);
    })();
  }, []);

  const scroll = (dir: 1 | -1) => {
    scrollRef.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  };

  const linkFor = (c: Card): { to: string; params?: Record<string, string> } => {
    if (c.kind === "tour") return { to: "/tours/$slug", params: { slug: c.slug } };
    if (c.kind === "guide") return { to: "/guides/$guideId", params: { guideId: c.slug } };
    return { to: "/explore/$slug", params: { slug: c.slug } };
  };

  return (
    <section className="max-w-[1280px] mx-auto px-4 md:px-8 pt-10">
      <div className="flex items-end justify-between mb-4">
        <h2 className="text-2xl md:text-3xl tracking-tight" style={{ color: "var(--foreground)", fontFamily: "'DM Serif Display', serif" }}>
          {t("home.explore") || "Explore"}
        </h2>
        <div className="hidden md:flex gap-2">
          <button onClick={() => scroll(-1)} aria-label="Prev" className="h-9 w-9 rounded-full inline-flex items-center justify-center" style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }}>
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={() => scroll(1)} aria-label="Next" className="h-9 w-9 rounded-full inline-flex items-center justify-center" style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }}>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div ref={scrollRef} className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-none" style={{ scrollbarWidth: "none" }}>
        {cards.map((c) => {
          const l = linkFor(c);
          return (
            <Link
              key={`${c.kind}-${c.id}`}
              to={l.to}
              params={l.params as never}
              className="shrink-0 w-[260px] md:w-[300px] snap-start rounded-2xl overflow-hidden transition-transform hover:-translate-y-1"
              style={{ background: "var(--card)", border: "1px solid var(--border)" }}
            >
              <div className="aspect-[4/3] bg-secondary overflow-hidden">
                {c.image ? <img src={c.image} alt={c.title} className="w-full h-full object-cover" loading="lazy" /> : null}
              </div>
              <div className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{ background: "color-mix(in srgb, #1F9BB4 15%, transparent)", color: "#1F9BB4" }}
                  >
                    {c.kind}
                  </span>
                  {c.kind !== "place" && c.rating != null && (
                    <span className="inline-flex items-center gap-1 text-xs" style={{ color: "var(--muted-foreground)" }}>
                      <Star className="h-3 w-3 fill-current" style={{ color: "#C9A84C" }} />
                      {Number(c.rating).toFixed(1)}
                    </span>
                  )}
                </div>
                <p className="font-semibold text-sm truncate" style={{ color: "var(--foreground)" }}>{c.title}</p>
                {c.meta && (
                  <p className="mt-0.5 text-xs inline-flex items-center gap-1" style={{ color: "var(--muted-foreground)" }}>
                    <MapPin className="h-3 w-3" /> {c.meta}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type ExploreCard =
  | { kind: "tour"; id: string; title: string; image: string | null; slug: string; rating?: number }
  | { kind: "guide"; id: string; title: string; image: string | null; slug: string; rating?: number }
  | { kind: "place"; id: string; title: string; image: string | null; slug: string }
  | { kind: "article"; id: string; title: string; image: string | null; slug: string }
  | { kind: "spotlight"; id: string; title: string; image: string | null; href: string };

function mixCards(groups: ExploreCard[][]) {
  const mixed: ExploreCard[] = [];
  const max = Math.max(0, ...groups.map((x) => x.length));
  for (let i = 0; i < max; i++) {
    for (const group of groups) if (group[i]) mixed.push(group[i]);
  }
  return mixed;
}

export const getExploreCards = createServerFn({ method: "GET" }).handler(async () => {
  const supabasePublic = createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        storage: undefined,
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );

  const [tours, guides, places, articles, spotlights] = await Promise.all([
    supabasePublic.from("tours").select("id,title_en,title,cover_url,slug,rating").eq("published", true).limit(4),
    supabasePublic.from("guides").select("id,name,photo_url,slug,rating").eq("verified", true).eq("published", true).limit(4),
    supabasePublic.from("places").select("id,name,photo_url,slug").eq("published", true).limit(4),
    supabasePublic.from("articles").select("id,title,cover_url,slug").eq("published", true).limit(4),
    supabasePublic.from("spotlights").select("id,title_en,image_url,href").eq("is_active", true).limit(4),
  ]);

  const tourCards = ((tours.data ?? []) as Array<{ id: string; title_en: string | null; title: string | null; cover_url: string | null; slug: string; rating: number | null }>).map<ExploreCard>((r) => ({
    kind: "tour",
    id: r.id,
    title: r.title_en || r.title || "Tour",
    image: r.cover_url,
    slug: r.slug,
    rating: r.rating ?? undefined,
  }));
  const guideCards = ((guides.data ?? []) as Array<{ id: string; name: string | null; photo_url: string | null; slug: string; rating: number | null }>).map<ExploreCard>((r) => ({
    kind: "guide",
    id: r.id,
    title: (r.name || "Guide").split(" ")[0],
    image: r.photo_url,
    slug: r.slug,
    rating: r.rating ?? undefined,
  }));
  const placeCards = ((places.data ?? []) as Array<{ id: string; name: string | null; photo_url: string | null; slug: string }>).map<ExploreCard>((r) => ({
    kind: "place",
    id: r.id,
    title: r.name || "Place",
    image: r.photo_url,
    slug: r.slug,
  }));
  const articleCards = ((articles.data ?? []) as Array<{ id: string; title: string | null; cover_url: string | null; slug: string }>).map<ExploreCard>((r) => ({
    kind: "article",
    id: r.id,
    title: r.title || "Article",
    image: r.cover_url,
    slug: r.slug,
  }));
  const spotlightCards = ((spotlights.data ?? []) as Array<{ id: string; title_en: string | null; image_url: string | null; href: string | null }>).map<ExploreCard>((r) => ({
    kind: "spotlight",
    id: r.id,
    title: r.title_en || "Spotlight",
    image: r.image_url,
    href: r.href || "/",
  }));

  return mixCards([tourCards, guideCards, placeCards, articleCards, spotlightCards]);
});
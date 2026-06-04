import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Guide } from "@/data/guides";
import type { CityInfo } from "@/data/cities";
import type { SpotlightRow, SpotlightKind } from "@/lib/spotlights";

export type CityRow = CityInfo & { id: string; slug: string; sort_order: number };

async function fetchCities(): Promise<CityRow[]> {
  const { data, error } = await supabase
    .from("cities")
    .select("id, name, slug, lat, lng, sort_order")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    lat: c.lat,
    lng: c.lng,
    sort_order: c.sort_order,
  }));
}

export function useCities() {
  return useQuery({ queryKey: ["cities"], queryFn: fetchCities });
}

type GuideRow = {
  id: string;
  slug: string;
  name: string;
  city_id: string;
  extra_city_ids: string[] | null;
  photo_url: string | null;
  tagline: string;
  bio: string;
  languages: string[];
  specialties: string[];
  price_per_day: number;
  rating: number;
  reviews: number;
  verified: boolean;
  instant_book: boolean;
  sort_order: number;
  cities: { name: string } | null;
  guide_categories: { categories: { slug: string; name: string; icon: string } | null }[];
};

const PLACEHOLDER_PHOTO =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 3'><rect width='4' height='3' fill='%23e5e7eb'/></svg>";

function mapGuide(row: GuideRow): Guide {
  return {
    id: row.slug,
    dbId: row.id,
    name: row.name,
    city: row.cities?.name ?? "",
    cityId: row.city_id,
    extraCityIds: row.extra_city_ids ?? [],
    photo: row.photo_url || PLACEHOLDER_PHOTO,
    tagline: row.tagline,
    bio: row.bio,
    languages: row.languages,
    specialties: row.specialties,
    pricePerDay: Number(row.price_per_day),
    rating: Number(row.rating),
    reviews: row.reviews,
    verified: row.verified,
    instantBook: row.instant_book,
    categories: (row.guide_categories ?? [])
      .map((gc) => gc.categories)
      .filter((c): c is { slug: string; name: string; icon: string } => !!c),
  };
}

const GUIDE_SELECT =
  "id, slug, name, city_id, extra_city_ids, photo_url, tagline, bio, languages, specialties, price_per_day, rating, reviews, verified, instant_book, sort_order, cities(name), guide_categories(categories(slug, name, icon))";

async function fetchGuides(): Promise<Guide[]> {
  const { data, error } = await supabase
    .from("guides")
    .select(GUIDE_SELECT)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as unknown as GuideRow[]).map(mapGuide);
}

export function useGuides() {
  return useQuery({ queryKey: ["guides"], queryFn: fetchGuides });
}

export type Category = {
  id: string;
  slug: string;
  name: string;
  icon: string;
  description: string;
  sort_order: number;
};

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, slug, name, icon, description, sort_order")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Category[];
    },
  });
}

async function fetchGuideBySlug(slug: string): Promise<Guide | null> {
  const { data, error } = await supabase
    .from("guides")
    .select(GUIDE_SELECT)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data ? mapGuide(data as unknown as GuideRow) : null;
}

export function useGuide(slug: string) {
  return useQuery({
    queryKey: ["guide", slug],
    queryFn: () => fetchGuideBySlug(slug),
    enabled: !!slug,
  });
}

export type GuidePost = {
  id: string;
  platform: "instagram" | "facebook" | "tiktok" | "youtube" | "other";
  url: string;
  thumbnailUrl: string | null;
  caption: string;
  postedAt: string | null;
};

export type LatestPost = GuidePost & { guideId: string; guideSlug: string; guideName: string };

export function useLatestPosts(limit = 12) {
  return useQuery({
    queryKey: ["latest-posts", limit],
    queryFn: async (): Promise<LatestPost[]> => {
      const { data, error } = await supabase
        .from("guide_posts")
        .select("id, platform, url, thumbnail_url, caption, posted_at, guide_id, guides(slug, name)")
        .eq("visible", true)
        .order("posted_at", { ascending: false, nullsFirst: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? [])
        .filter((p: any) => p.guides)
        .map((p: any) => ({
          id: p.id,
          platform: p.platform as GuidePost["platform"],
          url: p.url,
          thumbnailUrl: p.thumbnail_url,
          caption: p.caption ?? "",
          postedAt: p.posted_at,
          guideId: p.guide_id,
          guideSlug: p.guides.slug,
          guideName: p.guides.name,
        }));
    },
  });
}

export type FeaturedReview = {
  id: string;
  rating: number;
  comment: string;
  authorName: string;
  guideName: string | null;
};

export function useFeaturedReviews() {
  return useQuery({
    queryKey: ["featured-reviews"],
    queryFn: async (): Promise<FeaturedReview[]> => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, rating, comment, user_id, guides(name)")
        .eq("rating", 5)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? [])
        .filter((r: any) => (r.comment ?? "").trim().length >= 40)
        .slice(0, 3)
        .map((r: any) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          authorName: "Traveler",
          guideName: r.guides?.name ?? null,
        }));
    },
  });
}

export function useGuidePosts(guideId: string | undefined) {
  return useQuery({
    queryKey: ["guide-posts", guideId],
    enabled: !!guideId,
    queryFn: async (): Promise<GuidePost[]> => {
      const { data, error } = await supabase
        .from("guide_posts")
        .select("id, platform, url, thumbnail_url, caption, posted_at, sort_order")
        .eq("guide_id", guideId!)
        .eq("visible", true)
        .order("sort_order", { ascending: true })
        .order("posted_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []).map((p) => ({
        id: p.id,
        platform: p.platform as GuidePost["platform"],
        url: p.url,
        thumbnailUrl: p.thumbnail_url,
        caption: p.caption ?? "",
        postedAt: p.posted_at,
      }));
    },
  });
}

// Admin: list of all guides with extra admin fields
export type GuideAdminRow = Guide & { sortOrder: number };
export function useGuidesAdmin() {
  return useQuery({
    queryKey: ["guides-admin"],
    queryFn: async (): Promise<GuideAdminRow[]> => {
      const { data, error } = await supabase
        .from("guides")
        .select(GUIDE_SELECT)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return ((data ?? []) as unknown as GuideRow[]).map((r) => ({
        ...mapGuide(r),
        sortOrder: r.sort_order,
      }));
    },
  });
}

export function useIsAdmin() {
  return useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) return false;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userRes.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (error) return false;
      return !!data;
    },
    staleTime: 60_000,
  });
}

// ============ Spotlights ============
export function useSpotlights() {
  return useQuery({
    queryKey: ["spotlights"],
    queryFn: async (): Promise<SpotlightRow[]> => {
      const { data, error } = await (supabase as any)
        .from("spotlights")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as SpotlightRow[];
    },
  });
}

export function useSpotlightsAdmin() {
  return useQuery({
    queryKey: ["spotlights-admin"],
    queryFn: async (): Promise<SpotlightRow[]> => {
      const { data, error } = await (supabase as any)
        .from("spotlights")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SpotlightRow[];
    },
  });
}

// ============ Tours ============
export type TourRow = {
  id: string;
  slug: string;
  title: string;
  short_description: string;
  description_md: string;
  cover_url: string | null;
  city_id: string;
  duration_hours: number;
  price_from: number;
  highlights: string[];
  included: string[];
  not_included: string[];
  published: boolean;
  sort_order: number;
  guide_id: string;
  price_by_language: Record<string, number>;
  transport_included: boolean;
  languages: string[];
  rating: number;
  reviews_count: number;
  cities?: { name: string; slug: string } | null;
  guides?: { id: string; slug: string; name: string; photo_url: string | null; rating: number; reviews: number; languages: string[] } | null;
  tour_categories?: { category_id: string; categories: { slug: string; name: string; icon: string } | null }[];
};

const TOUR_SELECT =
  "id, slug, title, short_description, description_md, cover_url, city_id, duration_hours, price_from, highlights, included, not_included, published, sort_order, guide_id, price_by_language, transport_included, languages, rating, reviews_count, cities(name, slug), guides(id, slug, name, photo_url, rating, reviews, languages), tour_categories(category_id, categories(slug, name, icon))";


function normalizeTour(row: any): TourRow {
  const raw = row.price_by_language ?? {};
  const pbl: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw)) {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) pbl[k] = n;
  }
  return {
    ...row,
    price_by_language: pbl,
    languages: row.languages ?? [],
    transport_included: !!row.transport_included,
    highlights: row.highlights ?? [],
    included: row.included ?? [],
    not_included: row.not_included ?? [],
  };
}

export function useTours(opts?: { citySlug?: string; categorySlug?: string }) {
  return useQuery({
    queryKey: ["tours", opts?.citySlug ?? null, opts?.categorySlug ?? null],
    queryFn: async (): Promise<TourRow[]> => {
      const { data, error } = await (supabase as any)
        .from("tours")
        .select(TOUR_SELECT)
        .eq("published", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      let rows = ((data ?? []) as any[]).map(normalizeTour);
      if (opts?.citySlug) rows = rows.filter((r) => r.cities?.slug === opts.citySlug);
      if (opts?.categorySlug) rows = rows.filter((r) => r.tour_categories?.some((tc) => tc.categories?.slug === opts.categorySlug));
      return rows;
    },
  });
}

export function useToursAdmin() {
  return useQuery({
    queryKey: ["tours-admin"],
    queryFn: async (): Promise<TourRow[]> => {
      const { data, error } = await (supabase as any)
        .from("tours")
        .select(TOUR_SELECT)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return ((data ?? []) as any[]).map(normalizeTour);
    },
  });
}

export function useTour(slug: string) {
  return useQuery({
    queryKey: ["tour", slug],
    enabled: !!slug,
    queryFn: async (): Promise<TourRow | null> => {
      const { data, error } = await (supabase as any)
        .from("tours")
        .select(TOUR_SELECT)
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();
      if (error) throw error;
      return data ? normalizeTour(data) : null;
    },
  });
}

export function useGuideTours(guideId: string | undefined) {
  return useQuery({
    queryKey: ["tours-by-guide", guideId],
    enabled: !!guideId,
    queryFn: async (): Promise<TourRow[]> => {
      const { data, error } = await (supabase as any)
        .from("tours")
        .select(TOUR_SELECT)
        .eq("guide_id", guideId!)
        .eq("published", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return ((data ?? []) as any[]).map(normalizeTour);
    },
  });
}

export const SPOTLIGHT_KINDS: SpotlightKind[] = ["new_guide", "new_route", "news", "new_tour"];

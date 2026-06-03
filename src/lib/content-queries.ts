import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Guide } from "@/data/guides";
import type { CityInfo } from "@/data/cities";

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
  guide_experiences: { title: string; duration: string; price: number; sort_order: number }[];
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
    experiences: [...(row.guide_experiences ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((e) => ({ title: e.title, duration: e.duration, price: Number(e.price) })),
  };
}

const GUIDE_SELECT =
  "id, slug, name, city_id, photo_url, tagline, bio, languages, specialties, price_per_day, rating, reviews, verified, instant_book, sort_order, cities(name), guide_experiences(title, duration, price, sort_order), guide_categories(categories(slug, name, icon))";

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

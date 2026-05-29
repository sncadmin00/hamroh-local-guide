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
    experiences: [...(row.guide_experiences ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((e) => ({ title: e.title, duration: e.duration, price: Number(e.price) })),
  };
}

const GUIDE_SELECT =
  "id, slug, name, city_id, photo_url, tagline, bio, languages, specialties, price_per_day, rating, reviews, verified, instant_book, sort_order, cities(name), guide_experiences(title, duration, price, sort_order)";

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

import { useQuery, useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getSpotlights } from "@/lib/spotlights.functions";
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
  cover_url: string | null;
  intro_video_url: string | null;
  tagline: string;
  bio: string;
  languages: string[];
  verified_languages: Record<string, string> | null;
  specialties: string[];
  price_per_day: number;
  rating: number;
  reviews: number;
  verified: boolean;
  instant_book: boolean;
  sort_order: number;
  identity_verified: boolean | null;
  licensed: boolean | null;
  license_url: string | null;
  intro_video_verified: boolean | null;
  completed_tours_count: number | null;
  avg_response_minutes: number | null;
  has_transport: boolean | null;
  transport_seats: number | null;
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
    coverUrl: row.cover_url || null,
    introVideoUrl: row.intro_video_url,
    tagline: row.tagline,
    bio: row.bio,
    languages: row.languages,
    verifiedLanguages: (row.verified_languages ?? {}) as Record<string, string>,
    specialties: row.specialties,
    pricePerDay: Number(row.price_per_day),
    rating: Number(row.rating),
    reviews: row.reviews,
    verified: row.verified,
    instantBook: row.instant_book,
    identityVerified: !!row.identity_verified,
    licensed: !!row.licensed,
    licenseUrl: row.license_url ?? null,
    introVideoVerified: !!row.intro_video_verified,
    completedToursCount: Number(row.completed_tours_count ?? 0),
    avgResponseMinutes: row.avg_response_minutes === null || row.avg_response_minutes === undefined
      ? null
      : Number(row.avg_response_minutes),
    hasTransport: !!row.has_transport,
    transportSeats: row.transport_seats == null ? null : Number(row.transport_seats),
    categories: (row.guide_categories ?? [])
      .map((gc) => gc.categories)
      .filter((c): c is { slug: string; name: string; icon: string } => !!c),
  };
}

const GUIDE_SELECT =
  "id, slug, name, city_id, extra_city_ids, photo_url, cover_url, intro_video_url, tagline, bio, languages, verified_languages, specialties, price_per_day, rating, reviews, verified, instant_book, sort_order, identity_verified, licensed, license_url, intro_video_verified, completed_tours_count, avg_response_minutes, has_transport, transport_seats, cities(name), guide_categories(categories(slug, name, icon))";

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
      const { data, error } = await (supabase as any)
        .from("guide_posts")
        .select("id, platform, url, thumbnail_url, caption, posted_at, guide_id, media_type, guides(slug, name)")
        .eq("visible", true)
        .eq("media_type", "article")
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

export type ReelItem = {
  id: string;
  source: "guide" | "admin";
  url: string;
  thumbnailUrl: string | null;
  caption: string;
  title: string;
  postedAt: string | null;
  platform: GuidePost["platform"] | null;
  guideId: string | null;
  guideSlug: string | null;
  guideName: string | null;
};

export function useLatestReels(limit = 24) {
  return useQuery({
    queryKey: ["latest-reels", limit],
    queryFn: async (): Promise<ReelItem[]> => {
      const [gp, ar] = await Promise.all([
        (supabase as any)
          .from("guide_posts")
          .select("id, platform, url, thumbnail_url, caption, posted_at, guide_id, guides(slug, name)")
          .eq("visible", true)
          .eq("media_type", "reel")
          .order("posted_at", { ascending: false, nullsFirst: false })
          .limit(limit),
        (supabase as any)
          .from("admin_reels")
          .select("id, title, video_url, thumbnail_url, caption, posted_at")
          .eq("visible", true)
          .order("posted_at", { ascending: false, nullsFirst: false })
          .limit(limit),
      ]);
      if (gp.error) throw gp.error;
      if (ar.error) throw ar.error;

      const fromGuides: ReelItem[] = (gp.data ?? [])
        .filter((p: any) => p.guides)
        .map((p: any) => ({
          id: `g_${p.id}`,
          source: "guide" as const,
          url: p.url,
          thumbnailUrl: p.thumbnail_url,
          caption: p.caption ?? "",
          title: p.guides.name,
          postedAt: p.posted_at,
          platform: p.platform,
          guideId: p.guide_id,
          guideSlug: p.guides.slug,
          guideName: p.guides.name,
        }));

      const fromAdmin: ReelItem[] = (ar.data ?? []).map((r: any) => ({
        id: `a_${r.id}`,
        source: "admin" as const,
        url: r.video_url,
        thumbnailUrl: r.thumbnail_url,
        caption: r.caption ?? "",
        title: r.title ?? "",
        postedAt: r.posted_at,
        platform: null,
        guideId: null,
        guideSlug: null,
        guideName: null,
      }));

      return [...fromGuides, ...fromAdmin]
        .sort((a, b) => {
          const da = a.postedAt ? new Date(a.postedAt).getTime() : 0;
          const db = b.postedAt ? new Date(b.postedAt).getTime() : 0;
          return db - da;
        })
        .slice(0, limit);
    },
  });
}

export type ArticleItem = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverUrl: string | null;
  publishedAt: string | null;
};

export function useLatestArticles(limit = 12) {
  return useQuery({
    queryKey: ["latest-articles", limit],
    queryFn: async (): Promise<ArticleItem[]> => {
      const { data, error } = await supabase
        .from("articles")
        .select("id, slug, title, excerpt, cover_url, published_at, sort_order")
        .eq("published", true)
        .order("sort_order", { ascending: true })
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []).map((a: any) => ({
        id: a.id,
        slug: a.slug,
        title: a.title,
        excerpt: a.excerpt ?? "",
        coverUrl: a.cover_url,
        publishedAt: a.published_at,
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
export const spotlightsQueryOptions = queryOptions({
  queryKey: ["spotlights"],
  queryFn: async (): Promise<SpotlightRow[]> => getSpotlights(),
});

export function useSpotlights() {
  return useSuspenseQuery(spotlightsQueryOptions);
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
export type PricingMode = "fixed" | "per_person" | "by_group";
export type GroupCategory = "private" | "small" | "group" | "large"; // legacy
export type GroupTier = { min: number; max: number; price: number };

export const GROUP_CATEGORY_MAX: Record<GroupCategory, number> = {
  private: 2,
  small: 6,
  group: 12,
  large: 25,
};

export const GROUP_CATEGORY_LABEL: Record<GroupCategory, string> = {
  private: "Private (up to 2)",
  small: "Small group (up to 6)",
  group: "Group (up to 12)",
  large: "Large group (up to 25)",
};

export type TourRow = {
  id: string;
  slug: string;
  title: string;
  short_description: string;
  description_md: string;
  title_ru: string;
  title_uz: string;
  title_en: string;
  short_description_ru: string;
  short_description_uz: string;
  short_description_en: string;
  description_md_ru: string;
  description_md_uz: string;
  description_md_en: string;
  cover_url: string | null;
  city_id: string;
  duration_hours: number;
  price_from: number;
  highlights: string[];
  highlights_ru: string[];
  highlights_uz: string[];
  highlights_en: string[];
  included: string[];
  included_ru: string[];
  included_uz: string[];
  included_en: string[];
  not_included: string[];
  not_included_ru: string[];
  not_included_uz: string[];
  not_included_en: string[];
  published: boolean;
  sort_order: number;
  guide_id: string;
  price_by_language: Record<string, number>;
  pricing_mode: "fixed" | "by_group"; // legacy column
  base_language: string;
  language_multipliers: Record<string, number>;
  group_prices: Partial<Record<GroupCategory | "fixed", number>>; // legacy column
  // New flexible pricing model
  pricing_modes: PricingMode[];
  fixed_price: number | null;
  fixed_max_guests: number | null;
  per_person_price: number | null;
  group_tiers: GroupTier[];
  max_guests: number | null;
  children_free_under: number;
  transport_included: boolean;
  languages: string[];
  rating: number;
  reviews_count: number;
  cities?: { name: string; slug: string } | null;
  guides?: { id: string; slug: string; name: string; photo_url: string | null; rating: number; reviews: number; languages: string[]; user_id: string | null } | null;
  tour_categories?: { category_id: string; categories: { slug: string; name: string; icon: string } | null }[];
};

const TOUR_SELECT =
  "id, slug, title, short_description, description_md, title_ru, title_uz, title_en, short_description_ru, short_description_uz, short_description_en, description_md_ru, description_md_uz, description_md_en, cover_url, city_id, duration_hours, price_from, highlights, highlights_ru, highlights_uz, highlights_en, included, included_ru, included_uz, included_en, not_included, not_included_ru, not_included_uz, not_included_en, published, sort_order, guide_id, price_by_language, pricing_mode, base_language, language_multipliers, group_prices, pricing_modes, fixed_price, fixed_max_guests, per_person_price, group_tiers, max_guests, children_free_under, transport_included, languages, rating, reviews_count, cities(name, slug), guides(id, slug, name, photo_url, rating, reviews, languages, user_id), tour_categories(category_id, categories(slug, name, icon))";



function normalizeTour(row: any): TourRow {
  const raw = row.price_by_language ?? {};
  const pbl: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw)) {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) pbl[k] = n;
  }
  const mults: Record<string, number> = {};
  for (const [k, v] of Object.entries((row.language_multipliers ?? {}) as Record<string, unknown>)) {
    const n = Number(v);
    if (Number.isFinite(n)) mults[k] = n;
  }
  const gp: Record<string, number> = {};
  for (const [k, v] of Object.entries((row.group_prices ?? {}) as Record<string, unknown>)) {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) gp[k] = n;
  }
  const listOrFallback = (value: unknown, fallback: unknown): string[] => {
    if (Array.isArray(value) && value.length > 0) return value;
    return Array.isArray(fallback) ? fallback : [];
  };

  // Parse new pricing columns
  const declaredModes = Array.isArray(row.pricing_modes) ? row.pricing_modes : [];
  const pricingModes: PricingMode[] = declaredModes.filter(
    (m: any): m is PricingMode => m === "fixed" || m === "per_person" || m === "by_group",
  );
  const rawTiers = Array.isArray(row.group_tiers) ? row.group_tiers : [];
  const groupTiers: GroupTier[] = rawTiers
    .map((t: any) => ({
      min: Number(t?.min),
      max: Number(t?.max),
      price: Number(t?.price),
    }))
    .filter((t: GroupTier) => Number.isFinite(t.min) && Number.isFinite(t.max) && Number.isFinite(t.price));

  return {
    ...row,
    price_by_language: pbl,
    pricing_mode: (row.pricing_mode === "by_group" ? "by_group" : "fixed") as "fixed" | "by_group",
    base_language: row.base_language ?? "Russian",
    language_multipliers: mults,
    group_prices: gp as TourRow["group_prices"],
    pricing_modes: pricingModes,
    fixed_price: row.fixed_price != null ? Number(row.fixed_price) : null,
    fixed_max_guests: row.fixed_max_guests != null ? Number(row.fixed_max_guests) : null,
    per_person_price: row.per_person_price != null ? Number(row.per_person_price) : null,
    group_tiers: groupTiers,
    max_guests: row.max_guests != null ? Number(row.max_guests) : null,
    children_free_under: Number(row.children_free_under ?? 16),
    languages: row.languages ?? [],
    transport_included: !!row.transport_included,
    highlights: listOrFallback(row.highlights, []),
    highlights_ru: listOrFallback(row.highlights_ru, row.highlights),
    highlights_uz: listOrFallback(row.highlights_uz, row.highlights),
    highlights_en: listOrFallback(row.highlights_en, row.highlights),
    included: listOrFallback(row.included, []),
    included_ru: listOrFallback(row.included_ru, row.included),
    included_uz: listOrFallback(row.included_uz, row.included),
    included_en: listOrFallback(row.included_en, row.included),
    not_included: listOrFallback(row.not_included, []),
    not_included_ru: listOrFallback(row.not_included_ru, row.not_included),
    not_included_uz: listOrFallback(row.not_included_uz, row.not_included),
    not_included_en: listOrFallback(row.not_included_en, row.not_included),
    rating: Number(row.rating ?? 5),
    reviews_count: Number(row.reviews_count ?? 0),
  };
}

const LEGACY_GROUP_MAX: Record<string, number> = {
  private: 2, small: 6, group: 12, large: 25,
};

/**
 * Client-side mirror of readTourPricing (server). Applies legacy backfill so
 * tours that haven't been re-saved still surface a usable pricing model.
 */
export function readTourPricingClient(tour: Pick<TourRow,
  "pricing_modes" | "fixed_price" | "fixed_max_guests" | "per_person_price" | "group_tiers" | "max_guests"
  | "pricing_mode" | "group_prices" | "price_from"
>): {
  available_modes: PricingMode[];
  fixed_price: number | null;
  fixed_max_guests: number | null;
  per_person_price: number | null;
  group_tiers: GroupTier[];
  max_guests: number | null;
} {
  const modes = [...(tour.pricing_modes ?? [])];
  let fixedPrice = tour.fixed_price;
  const fixedMaxGuests = tour.fixed_max_guests;
  const perPerson = tour.per_person_price;
  let tiers: GroupTier[] = [...(tour.group_tiers ?? [])];
  let maxGuests = tour.max_guests;

  if (modes.length === 0) {
    const gp = (tour.group_prices ?? {}) as Record<string, number>;
    if (tour.pricing_mode === "by_group") {
      let prev = 0;
      for (const cat of ["private", "small", "group", "large"] as const) {
        const price = Number(gp[cat] ?? 0);
        if (price > 0) {
          tiers.push({ min: prev + 1, max: LEGACY_GROUP_MAX[cat], price });
          prev = LEGACY_GROUP_MAX[cat];
        }
      }
      if (tiers.length > 0) {
        modes.push("by_group");
        if (maxGuests == null) maxGuests = prev;
      }
    } else {
      const price = Number(gp.fixed ?? tour.price_from ?? 0);
      if (price > 0) {
        modes.push("fixed");
        fixedPrice = price;
      }
    }
  }

  return {
    available_modes: modes,
    fixed_price: fixedPrice,
    fixed_max_guests: fixedMaxGuests,
    per_person_price: perPerson,
    group_tiers: tiers,
    max_guests: maxGuests,
  };
}

export function findTier(tiers: GroupTier[], adults: number): GroupTier | null {
  return tiers.find((t) => adults >= t.min && adults <= t.max) ?? null;
}

/**
 * Compute the base price for a given pricing mode and adult count (no language
 * surcharge, no service fee). Returns null if no price can be resolved.
 */
export function computeBasePriceClient(
  pricing: ReturnType<typeof readTourPricingClient>,
  mode: PricingMode,
  adults: number,
): number | null {
  if (mode === "fixed") {
    if (!pricing.fixed_price || pricing.fixed_price <= 0) return null;
    if (pricing.fixed_max_guests != null && adults > pricing.fixed_max_guests) return null;
    return pricing.fixed_price;
  }
  if (mode === "per_person") {
    if (!pricing.per_person_price || pricing.per_person_price <= 0) return null;
    return Math.round(pricing.per_person_price * adults);
  }
  const tier = findTier(pricing.group_tiers, adults);
  return tier ? tier.price : null;
}


type LocalizableTour = Pick<TourRow, "title" | "title_ru" | "title_uz" | "title_en" | "short_description" | "short_description_ru" | "short_description_uz" | "short_description_en" | "description_md" | "description_md_ru" | "description_md_uz" | "description_md_en">;
type LocalizableTourListKey = "highlights" | "included" | "not_included";

function pickTourList(tour: Partial<TourRow>, key: LocalizableTourListKey, lang: "ru" | "uz" | "en"): string[] {
  const localized = (tour as any)[`${key}_${lang}`];
  if (Array.isArray(localized) && localized.length > 0) return localized;
  const fallback = (tour as any)[key];
  return Array.isArray(fallback) ? fallback : [];
}

export function pickTourTitle(tour: Partial<LocalizableTour>, lang: "ru" | "uz" | "en"): string {
  return (tour as any)[`title_${lang}`] || tour.title_en || tour.title_ru || tour.title_uz || tour.title || "";
}

export function pickTourShortDescription(tour: Partial<LocalizableTour>, lang: "ru" | "uz" | "en"): string {
  return (tour as any)[`short_description_${lang}`] || tour.short_description_en || tour.short_description_ru || tour.short_description_uz || tour.short_description || "";
}

export function pickTourDescriptionMd(tour: Partial<LocalizableTour>, lang: "ru" | "uz" | "en"): string {
  return (tour as any)[`description_md_${lang}`] || tour.description_md_en || tour.description_md_ru || tour.description_md_uz || tour.description_md || "";
}

export function pickTourHighlights(tour: Partial<TourRow>, lang: "ru" | "uz" | "en"): string[] {
  return pickTourList(tour, "highlights", lang);
}

export function pickTourIncluded(tour: Partial<TourRow>, lang: "ru" | "uz" | "en"): string[] {
  return pickTourList(tour, "included", lang);
}

export function pickTourNotIncluded(tour: Partial<TourRow>, lang: "ru" | "uz" | "en"): string[] {
  return pickTourList(tour, "not_included", lang);
}




export function useTours(opts?: { citySlug?: string; categorySlug?: string }) {
  return useQuery({
    queryKey: ["tours", "localized-lists-v2", opts?.citySlug ?? null, opts?.categorySlug ?? null],
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
    queryKey: ["tours-admin", "localized-lists-v2"],
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
    queryKey: ["tour", slug, "localized-lists-v2"],
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
    queryKey: ["tours-by-guide", guideId, "localized-lists-v2"],
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

export type Place = {
  id: string;
  slug: string;
  name: string;
  category: string;
  shortDescription: string;
  cityId: string;
  cityName: string;
  citySlug: string;
  photoUrl: string | null;
  tags: string[];
};

export function usePlaces() {
  return useQuery({
    queryKey: ["places", "public"],
    queryFn: async (): Promise<Place[]> => {
      const { data, error } = await supabase
        .from("places")
        .select("id, slug, name, category, short_description, city_id, photo_url, tags, cities(name, slug)")
        .eq("published", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((p: any) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        category: p.category,
        shortDescription: p.short_description ?? "",
        cityId: p.city_id,
        cityName: p.cities?.name ?? "",
        citySlug: p.cities?.slug ?? "",
        photoUrl: p.photo_url ?? null,
        tags: p.tags ?? [],
      }));
    },
  });
}


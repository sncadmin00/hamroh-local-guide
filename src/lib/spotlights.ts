// Spotlights are now stored in the `spotlights` table and managed via /admin.
// This file keeps shared type definitions only.

export type SpotlightKind = "new_guide" | "new_route" | "news" | "new_tour";
export type SpotlightBadge = "new" | "featured" | "trending" | "limited";

export type SpotlightRow = {
  id: string;
  kind: SpotlightKind;
  badge: SpotlightBadge | null;
  title_en: string;
  title_uz: string;
  title_ru: string;
  description_en: string;
  description_uz: string;
  description_ru: string;
  image_url: string | null;
  href: string;
  is_active: boolean;
  sort_order: number;
  published_at: string;
  expires_at: string | null;
  guide_id: string | null;
  tour_id: string | null;
};

export type SpotlightGuideRef = {
  id: string;
  slug: string;
  name: string;
  photo_url: string | null;
  tagline: string | null;
  rating: number | null;
  reviews: number | null;
};

export type SpotlightTourRef = {
  id: string;
  slug: string;
  title_en: string;
  title_uz: string;
  title_ru: string;
  cover_url: string | null;
  price_from: number | null;
};

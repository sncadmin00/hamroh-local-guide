// Spotlights are now stored in the `spotlights` table and managed via /admin.
// This file keeps shared type definitions only.

export type SpotlightKind = "new_guide" | "new_route" | "news" | "new_tour";

export type SpotlightRow = {
  id: string;
  kind: SpotlightKind;
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
};

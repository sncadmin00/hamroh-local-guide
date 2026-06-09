// Shared types for guides & cities. Data is fetched from the database
// via hooks in `@/lib/content-queries`.

export type City = string;

export interface Guide {
  id: string;          // slug (stable, URL-friendly)
  dbId: string;        // database UUID
  name: string;
  city: City;
  cityId: string;
  extraCityIds: string[];
  photo: string;
  coverUrl: string | null;
  introVideoUrl: string | null;
  tagline: string;
  bio: string;
  languages: string[];
  verifiedLanguages: Record<string, string>;
  specialties: string[];
  pricePerDay: number;
  rating: number;
  reviews: number;
  verified: boolean;
  instantBook: boolean;
  identityVerified: boolean;
  licensed: boolean;
  licenseUrl: string | null;
  introVideoVerified: boolean;
  completedToursCount: number;
  avgResponseMinutes: number | null;
  hasTransport: boolean;
  transportSeats: number | null;
  categories: { slug: string; name: string; icon: string }[];
}

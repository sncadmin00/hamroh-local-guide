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
  tagline: string;
  bio: string;
  languages: string[];
  specialties: string[];
  pricePerDay: number;
  rating: number;
  reviews: number;
  verified: boolean;
  instantBook: boolean;
  categories: { slug: string; name: string; icon: string }[];
}

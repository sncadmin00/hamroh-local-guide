// Shared types for guides & cities. Data is now fetched from the database
// via hooks in `@/lib/content-queries`.

export type City = string;

export interface Guide {
  id: string;          // slug (stable, URL-friendly)
  dbId: string;        // database UUID (for admin operations)
  name: string;
  city: City;
  cityId: string;
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
  experiences: { title: string; duration: string; price: number }[];
}

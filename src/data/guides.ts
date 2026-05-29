import g1 from "@/assets/guide-1.jpg";
import g2 from "@/assets/guide-2.jpg";
import g3 from "@/assets/guide-3.jpg";
import g4 from "@/assets/guide-4.jpg";

export type City = "Tashkent" | "Samarkand" | "Bukhara";

export interface Guide {
  id: string;
  name: string;
  city: City;
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
  experiences: { title: string; duration: string; price: number }[];
}

export const guides: Guide[] = [
  {
    id: "aziz-tashkent",
    name: "Aziz Karimov",
    city: "Tashkent",
    photo: g1,
    tagline: "Tashkent bazaars & Soviet-era stories",
    bio: "Born and raised in Tashkent, I've spent 10 years showing visitors the layered history of Uzbekistan's capital — from Chorsu Bazaar at dawn to the metro's mosaic palaces.",
    languages: ["English", "Russian", "Uzbek"],
    specialties: ["History", "Food", "Architecture"],
    pricePerDay: 85,
    rating: 4.9,
    reviews: 187,
    verified: true,
    instantBook: true,
    experiences: [
      { title: "Chorsu Bazaar food walk", duration: "3 hours", price: 45 },
      { title: "Full-day Tashkent classics", duration: "8 hours", price: 85 },
      { title: "Soviet metro architecture tour", duration: "2 hours", price: 35 },
    ],
  },
  {
    id: "malika-samarkand",
    name: "Malika Yusupova",
    city: "Samarkand",
    photo: g2,
    tagline: "Registan after dark & artisan workshops",
    bio: "Licensed art historian. I take small groups beyond the postcard shots — into silk paper workshops, family-run ceramics studios, and the quiet courtyards locals love.",
    languages: ["English", "French", "Uzbek", "Tajik"],
    specialties: ["Art", "Crafts", "Photography"],
    pricePerDay: 110,
    rating: 5.0,
    reviews: 243,
    verified: true,
    instantBook: true,
    experiences: [
      { title: "Registan Square private tour", duration: "3 hours", price: 55 },
      { title: "Artisan workshop day", duration: "6 hours", price: 95 },
      { title: "Shahi-Zinda sunset photo walk", duration: "2 hours", price: 40 },
    ],
  },
  {
    id: "sherzod-bukhara",
    name: "Sherzod Rakhmonov",
    city: "Bukhara",
    photo: g3,
    tagline: "Silk Road history in the old town",
    bio: "Fifth-generation Bukharan. My family has lived steps from the Lyabi-Hauz for over a century — I share the city's stories the way my grandfather shared them with me.",
    languages: ["English", "German", "Uzbek", "Persian"],
    specialties: ["History", "Silk Road", "Religion"],
    pricePerDay: 90,
    rating: 4.8,
    reviews: 156,
    verified: true,
    instantBook: false,
    experiences: [
      { title: "Old town walking tour", duration: "4 hours", price: 50 },
      { title: "Full-day Bukhara deep dive", duration: "8 hours", price: 90 },
      { title: "Evening tea house & music", duration: "2 hours", price: 35 },
    ],
  },
  {
    id: "nigora-tashkent",
    name: "Nigora Saidova",
    city: "Tashkent",
    photo: g4,
    tagline: "Modern Tashkent, food, and nightlife",
    bio: "Tashkent's contemporary side — third-wave coffee, design studios, and the restaurants locals actually book. Perfect for travelers who've already done the classics.",
    languages: ["English", "Russian", "Korean"],
    specialties: ["Food", "Nightlife", "Modern culture"],
    pricePerDay: 80,
    rating: 4.9,
    reviews: 92,
    verified: true,
    instantBook: true,
    experiences: [
      { title: "Hidden coffee & dessert crawl", duration: "3 hours", price: 40 },
      { title: "Local dinner & live music", duration: "4 hours", price: 65 },
      { title: "Design district walk", duration: "2 hours", price: 30 },
    ],
  },
];

export const getGuide = (id: string) => guides.find((g) => g.id === id);

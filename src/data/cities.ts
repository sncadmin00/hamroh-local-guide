import type { City } from "./guides";

export type CityInfo = { name: City; lat: number; lng: number };

export const CITIES: CityInfo[] = [
  { name: "Tashkent", lat: 41.2995, lng: 69.2401 },
  { name: "Samarkand", lat: 39.6542, lng: 66.9597 },
  { name: "Bukhara", lat: 39.7747, lng: 64.4286 },
];

export const CITY_NAMES = CITIES.map((c) => c.name) as [City, ...City[]];

function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function nearestCities(lat: number, lng: number, n = 4): City[] {
  return [...CITIES]
    .sort((a, b) => haversine({ lat, lng }, a) - haversine({ lat, lng }, b))
    .slice(0, n)
    .map((c) => c.name);
}

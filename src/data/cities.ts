// Distance utility used by CityPicker for "nearest to me" suggestions.
// The actual city list now comes from the database (see useCities()).

export type CityInfo = { name: string; lat: number; lng: number };

export function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function nearestCityNames(
  cities: CityInfo[],
  lat: number,
  lng: number,
  n = 3,
): string[] {
  return [...cities]
    .sort((a, b) => haversine({ lat, lng }, a) - haversine({ lat, lng }, b))
    .slice(0, n)
    .map((c) => c.name);
}

import { useQuery } from "@tanstack/react-query";
import { detectLocation, type DetectedLocation } from "@/lib/geo.functions";

const CACHE_KEY = "hamroh:geo:v1";
const TTL_MS = 1000 * 60 * 60 * 24; // 24h

function readCache(): DetectedLocation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at: number; data: DetectedLocation };
    if (Date.now() - parsed.at > TTL_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCache(data: DetectedLocation) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data }));
  } catch {}
}

export function useDetectedLocation() {
  return useQuery({
    queryKey: ["geo:detect"],
    staleTime: TTL_MS,
    queryFn: async (): Promise<DetectedLocation> => {
      const cached = readCache();
      if (cached) return cached;
      const data = await detectLocation();
      writeCache(data);
      return data;
    },
  });
}

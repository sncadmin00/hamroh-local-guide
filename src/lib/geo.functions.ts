import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";

export type DetectedLocation = {
  ip: string | null;
  country: string | null;
  countryCode: string | null;
  city: string | null;
  region: string | null;
  lat: number | null;
  lng: number | null;
};

function pickIp(): string | null {
  const cf = getRequestHeader("cf-connecting-ip");
  if (cf) return cf;
  const xff = getRequestHeader("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  const real = getRequestHeader("x-real-ip");
  return real ?? null;
}

export const detectLocation = createServerFn({ method: "GET" }).handler(
  async (): Promise<DetectedLocation> => {
    const empty: DetectedLocation = {
      ip: null,
      country: null,
      countryCode: null,
      city: null,
      region: null,
      lat: null,
      lng: null,
    };
    const ip = pickIp();
    if (!ip || ip === "127.0.0.1" || ip === "::1" || ip.startsWith("10.") || ip.startsWith("192.168.")) {
      return { ...empty, ip };
    }
    try {
      const res = await fetch(`https://ipapi.co/${ip}/json/`, {
        headers: { "User-Agent": "hamroh-app/1.0" },
      });
      if (!res.ok) return { ...empty, ip };
      const j: any = await res.json();
      if (j?.error) return { ...empty, ip };
      return {
        ip,
        country: j.country_name ?? null,
        countryCode: j.country_code ?? null,
        city: j.city ?? null,
        region: j.region ?? null,
        lat: typeof j.latitude === "number" ? j.latitude : null,
        lng: typeof j.longitude === "number" ? j.longitude : null,
      };
    } catch {
      return { ...empty, ip };
    }
  },
);

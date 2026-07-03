import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";

export type WeatherPayload = {
  temp: number;
  humidity: number;
  code: number;
  city: string | null;
};

function pickIp(): string | null {
  const cf = getRequestHeader("cf-connecting-ip");
  if (cf) return cf;
  const xff = getRequestHeader("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  const real = getRequestHeader("x-real-ip");
  return real ?? null;
}

function fromCloudflareHeaders(): { lat: number; lon: number; city: string | null } | null {
  const latH = getRequestHeader("cf-iplatitude");
  const lonH = getRequestHeader("cf-iplongitude");
  const cityRaw = getRequestHeader("cf-ipcity");
  if (!latH || !lonH) return null;
  const lat = Number(latH);
  const lon = Number(lonH);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  let city: string | null = null;
  if (cityRaw) {
    try { city = decodeURIComponent(cityRaw); } catch { city = cityRaw; }
  }
  return { lat, lon, city };
}

async function ipLatLon(): Promise<{ lat: number; lon: number; city: string | null } | null> {
  const ip = pickIp();
  if (!ip || ip === "127.0.0.1" || ip === "::1" || ip.startsWith("10.") || ip.startsWith("192.168.")) return null;
  try {
    const r = await fetch(`https://ipapi.co/${ip}/json/`, { headers: { "User-Agent": "hamroh-app/1.0" } });
    if (!r.ok) return null;
    const j: any = await r.json();
    if (j?.error || typeof j.latitude !== "number" || typeof j.longitude !== "number") return null;
    return { lat: j.latitude, lon: j.longitude, city: j.city ?? null };
  } catch {
    return null;
  }
}

export const getWeather = createServerFn({ method: "GET" })
  .inputValidator((data) =>
    z
      .object({
        lat: z.number().optional(),
        lon: z.number().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<WeatherPayload | null> => {
    let lat = data.lat;
    let lon = data.lon;
    let city: string | null = null;

    if (lat === undefined || lon === undefined) {
      const cfGeo = fromCloudflareHeaders();
      if (cfGeo) {
        lat = cfGeo.lat;
        lon = cfGeo.lon;
        city = cfGeo.city;
      } else {
        const geo = await ipLatLon();
        if (geo) {
          lat = geo.lat;
          lon = geo.lon;
          city = geo.city;
        } else {
          // Samarkand fallback
          lat = 39.6547;
          lon = 66.9758;
          city = "Samarkand";
        }
      }
    }

    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code`;
      const r = await fetch(url);
      if (!r.ok) return null;
      const d: any = await r.json();
      const c = d?.current;
      if (!c) return null;

      // Reverse-geocode only if we don't have a city yet
      if (!city) {
        try {
          const rr = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?latitude=${lat}&longitude=${lon}&count=1&language=en`,
          );
          if (rr.ok) {
            const gj: any = await rr.json();
            city = gj?.results?.[0]?.name ?? null;
          }
        } catch { /* ignore */ }
      }

      return {
        temp: Math.round(c.temperature_2m),
        humidity: Math.round(c.relative_humidity_2m),
        code: c.weather_code,
        city,
      };
    } catch {
      return null;
    }
  });

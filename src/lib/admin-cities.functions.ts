import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CreateInput = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().min(2).max(80).optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || `city-${Date.now()}`;
}

async function geocode(name: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      name,
    )}&count=1&language=en&format=json`;
    const r = await fetch(url);
    if (!r.ok) return null;
    const j = (await r.json()) as { results?: Array<{ latitude: number; longitude: number }> };
    const hit = j.results?.[0];
    if (!hit) return null;
    return { lat: hit.latitude, lng: hit.longitude };
  } catch {
    return null;
  }
}

/**
 * Admin-only: create an approved city from a proposed name.
 * Auto-geocodes via open-meteo if lat/lng not supplied.
 */
export const adminCreateCityFromProposal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CreateInput.parse(input))
  .handler(async ({ context, data }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // If a city with the same name already exists, return it.
    const { data: existing } = await supabaseAdmin
      .from("cities")
      .select("id, name, slug, lat, lng, approved")
      .ilike("name", data.name)
      .maybeSingle();
    if (existing) {
      if (!existing.approved) {
        await supabaseAdmin.from("cities").update({ approved: true }).eq("id", existing.id);
      }
      return { ok: true, city: existing, existed: true };
    }

    let lat = data.lat;
    let lng = data.lng;
    if (lat == null || lng == null) {
      const geo = await geocode(data.name);
      if (geo) {
        lat = geo.lat;
        lng = geo.lng;
      }
    }
    if (lat == null || lng == null) throw new Error("Could not geocode this city; please add lat/lng manually.");

    const slug = data.slug ? slugify(data.slug) : slugify(data.name);

    const { data: created, error } = await supabaseAdmin
      .from("cities")
      .insert({ name: data.name, slug, lat, lng, approved: true })
      .select("id, name, slug, lat, lng, approved")
      .single();
    if (error) throw new Error(error.message);

    return { ok: true, city: created, existed: false };
  });

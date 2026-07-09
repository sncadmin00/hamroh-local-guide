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

// ---------- City suggestions (guide-proposed) ----------

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Forbidden");
}

export const listCitySuggestions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("city_suggestions")
      .select("id, user_id, guide_id, name, region, note, status, admin_note, created_city_id, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const guideIds = Array.from(new Set((data ?? []).map((r) => r.guide_id).filter(Boolean))) as string[];
    const userIds = Array.from(new Set((data ?? []).map((r) => r.user_id)));
    const [guidesRes, profilesRes] = await Promise.all([
      guideIds.length
        ? supabaseAdmin.from("guides").select("id, name, slug").in("id", guideIds)
        : Promise.resolve({ data: [] as Array<{ id: string; name: string; slug: string }> }),
      userIds.length
        ? supabaseAdmin.from("profiles").select("id, full_name").in("id", userIds)
        : Promise.resolve({ data: [] as Array<{ id: string; full_name: string | null }> }),
    ]);
    const guides = new Map((guidesRes.data ?? []).map((g: any) => [g.id, g] as const));
    const profiles = new Map((profilesRes.data ?? []).map((p: any) => [p.id, p] as const));

    // Emails via auth admin (best-effort, capped)
    const emailMap = new Map<string, string | null>();
    for (const uid of userIds.slice(0, 50)) {
      try {
        const { data: u } = await supabaseAdmin.auth.admin.getUserById(uid);
        emailMap.set(uid, u?.user?.email ?? null);
      } catch { /* ignore */ }
    }

    return (data ?? []).map((r) => ({
      ...r,
      guide_name: r.guide_id ? guides.get(r.guide_id)?.name ?? null : null,
      guide_slug: r.guide_id ? guides.get(r.guide_id)?.slug ?? null : null,
      submitter_name: profiles.get(r.user_id)?.full_name ?? null,
      submitter_email: emailMap.get(r.user_id) ?? null,
    }));
  });

const ApproveInput = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(2).max(80).optional(),
  slug: z.string().trim().min(2).max(80).optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  admin_note: z.string().trim().max(500).optional(),
});

export const approveCitySuggestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ApproveInput.parse(input))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: suggestion, error: sErr } = await supabaseAdmin
      .from("city_suggestions")
      .select("id, name, region, status, created_city_id")
      .eq("id", data.id)
      .maybeSingle();
    if (sErr) throw new Error(sErr.message);
    if (!suggestion) throw new Error("Suggestion not found");

    const finalName = (data.name ?? suggestion.name).trim();

    let cityId = suggestion.created_city_id as string | null;
    let cityRow: { id: string; name: string; slug: string; lat: number; lng: number; approved: boolean } | null = null;

    if (!cityId) {
      const { data: existing } = await supabaseAdmin
        .from("cities")
        .select("id, name, slug, lat, lng, approved")
        .ilike("name", finalName)
        .maybeSingle();
      if (existing) {
        if (!existing.approved) {
          await supabaseAdmin.from("cities").update({ approved: true }).eq("id", existing.id);
        }
        cityId = existing.id;
        cityRow = existing as any;
      }
    }

    if (!cityId) {
      let lat = data.lat;
      let lng = data.lng;
      if (lat == null || lng == null) {
        const geo = await geocode(finalName);
        if (geo) { lat = geo.lat; lng = geo.lng; }
      }
      if (lat == null || lng == null) {
        throw new Error("Could not geocode this city; please add lat/lng manually.");
      }
      const slug = slugify(data.slug ?? finalName);
      const { data: created, error: cErr } = await supabaseAdmin
        .from("cities")
        .insert({ name: finalName, slug, lat, lng, approved: true })
        .select("id, name, slug, lat, lng, approved")
        .single();
      if (cErr) throw new Error(cErr.message);
      cityId = created.id;
      cityRow = created as any;
    }

    const { error: uErr } = await supabaseAdmin
      .from("city_suggestions")
      .update({
        status: "approved",
        created_city_id: cityId,
        admin_note: data.admin_note ?? null,
      })
      .eq("id", data.id);
    if (uErr) throw new Error(uErr.message);

    return { ok: true, city: cityRow, suggestion_id: data.id };
  });

const RejectInput = z.object({
  id: z.string().uuid(),
  admin_note: z.string().trim().max(500).optional(),
});

export const rejectCitySuggestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RejectInput.parse(input))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("city_suggestions")
      .update({ status: "rejected", admin_note: data.admin_note ?? null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

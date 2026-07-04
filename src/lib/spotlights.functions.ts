import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import type { SpotlightRow, SpotlightGuideRef, SpotlightTourRef } from "./spotlights";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        storage: undefined,
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

export const getSpotlights = createServerFn({ method: "GET" }).handler(async () => {
  const supabasePublic = publicClient();

  const { data, error } = await supabasePublic
    .from("spotlights")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data ?? []) as SpotlightRow[];
});

export const getSpotlightById = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const supabasePublic = publicClient();
    const { data: row, error } = await supabasePublic
      .from("spotlights")
      .select("*")
      .eq("id", data.id)
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw error;
    const spotlight = (row ?? null) as SpotlightRow | null;
    if (!spotlight) return { spotlight: null, guide: null, tour: null };

    let guide: SpotlightGuideRef | null = null;
    let tour: SpotlightTourRef | null = null;

    if (spotlight.guide_id) {
      const { data: g } = await supabasePublic
        .from("guides")
        .select("id, slug, name, photo_url, tagline, rating, reviews")
        .eq("id", spotlight.guide_id)
        .maybeSingle();
      if (g) guide = g as SpotlightGuideRef;
    }
    if (spotlight.tour_id) {
      const { data: t } = await (supabasePublic as any)
        .from("tours")
        .select("id, slug, title_en, title_uz, title_ru, cover_url, price_from")
        .eq("id", spotlight.tour_id)
        .eq("published", true)
        .maybeSingle();
      if (t) tour = t as SpotlightTourRef;
    }

    return { spotlight, guide, tour };
  });

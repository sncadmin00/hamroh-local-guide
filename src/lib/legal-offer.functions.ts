import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Public: returns the current offer (all 3 languages). */
export const getCurrentOffer = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("legal_offers")
    .select("version, content_ru, content_en, content_uz, published_at")
    .eq("is_current", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("No offer published");
  return data as {
    version: string;
    content_ru: string;
    content_en: string;
    content_uz: string;
    published_at: string;
  };
});

/** Guide: has current user accepted the latest offer? Returns null if not a guide. */
export const getMyGuideOfferStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: guide } = await supabase
      .from("guides")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!guide) return { isGuide: false as const };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: current } = await supabaseAdmin
      .from("legal_offers")
      .select("version, published_at")
      .eq("is_current", true)
      .maybeSingle();
    if (!current) return { isGuide: true as const, accepted: true, version: null };

    const { data: acc } = await supabase
      .from("guide_offer_acceptances")
      .select("accepted_at")
      .eq("guide_id", (guide as any).id)
      .eq("version", (current as any).version)
      .maybeSingle();

    return {
      isGuide: true as const,
      accepted: !!acc,
      version: (current as any).version as string,
      acceptedAt: (acc as any)?.accepted_at ?? null,
    };
  });

/** Guide accepts the current offer. */
export const acceptOfferAsGuide = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ version: z.string().min(1).max(40) }).parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: guide, error: gErr } = await supabase
      .from("guides")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (gErr) throw new Error(gErr.message);
    if (!guide) throw new Error("No guide profile");

    // Verify the version is current
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: current } = await supabaseAdmin
      .from("legal_offers")
      .select("version")
      .eq("version", data.version)
      .eq("is_current", true)
      .maybeSingle();
    if (!current) throw new Error("Offer version is not current");

    const { error } = await (supabase.from("guide_offer_acceptances") as any).insert({
      guide_id: (guide as any).id,
      version: data.version,
    });
    // Ignore unique-violation: already accepted
    if (error && !/duplicate key|unique/i.test(error.message)) {
      throw new Error(error.message);
    }
    return { ok: true };
  });

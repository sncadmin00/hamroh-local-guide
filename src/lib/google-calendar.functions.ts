import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { buildAuthUrl, getRedirectUri, signState } from "@/lib/google-calendar.server";

async function getGuideId(supabase: typeof supabaseAdmin, userId: string): Promise<string | null> {
  const { data } = await supabase.from("guides").select("id").eq("user_id", userId).maybeSingle();
  return data?.id ?? null;
}

export const getGoogleCalendarStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const guideId = await getGuideId(supabase, userId);
    if (!guideId) return { connected: false, email: null };
    const { data } = await supabase
      .from("guide_google_calendar")
      .select("google_email, connected_at, updated_at")
      .eq("guide_id", guideId)
      .maybeSingle();
    if (!data) return { connected: false, email: null };
    const row = data as unknown as { google_email: string | null };
    return { connected: true, email: row.google_email };
  });

export const startGoogleOAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ origin: z.string().url() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const guideId = await getGuideId(supabase, userId);
    if (!guideId) throw new Error("Guide profile not found");
    const state = signState({ guideId, ts: String(Date.now()) });
    const redirectUri = getRedirectUri(data.origin);
    return { url: buildAuthUrl({ redirectUri, state }) };
  });

export const disconnectGoogleCalendar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const guideId = await getGuideId(supabase, userId);
    if (!guideId) throw new Error("Guide profile not found");
    const { error } = await supabase
      .from("guide_google_calendar")
      .delete()
      .eq("guide_id", guideId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

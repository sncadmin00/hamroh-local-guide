import { supabase } from "@/integrations/supabase/client";

/**
 * Lightweight event tracker. Fires-and-forgets — never throws.
 * Server-side guards via RLS (anon + authenticated can insert).
 */
export async function trackEvent(event: string, props: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("analytics_events").insert({
      event,
      props: props as never,
      user_id: user?.id ?? null,
    });
  } catch {
    // swallow
  }
}

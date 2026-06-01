import { supabase } from "@/integrations/supabase/client";

const REF_KEY = "hamroh_ref";
const REF_GUIDE_KEY = "hamroh_ref_guide";

/** Read ?ref= from URL, persist, log a click. Call once per app load. */
export async function captureReferral() {
  if (typeof window === "undefined") return;
  try {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("ref")?.toLowerCase().trim();
    if (!code) return;
    // First touch wins
    if (localStorage.getItem(REF_KEY)) return;

    const { data: guide } = await supabase
      .from("guides")
      .select("id")
      .eq("referral_code", code)
      .maybeSingle();
    if (!guide) return;

    localStorage.setItem(REF_KEY, code);
    localStorage.setItem(REF_GUIDE_KEY, guide.id);

    await supabase.from("referral_clicks").insert({
      guide_id: guide.id,
      referral_code: code,
      source: document.referrer || "direct",
      user_agent: navigator.userAgent.slice(0, 500),
    });
  } catch {
    // swallow
  }
}

export function getStoredReferralGuideId(): string | null {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem(REF_GUIDE_KEY); } catch { return null; }
}

import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { MapPin, Calendar, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { CityPicker } from "@/components/CityPicker";

type Prefs = { city?: string; startDate?: string; endDate?: string };

export function PersonalCard() {
  const { t } = useI18n();
  const [name, setName] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(() => {
    try { return JSON.parse(localStorage.getItem("tripPrefs") || "{}"); } catch { return {}; }
  });
  const [aiTip, setAiTip] = useState<string | null>(null);

  useEffect(() => {
    const applyUser = (user: { user_metadata?: Record<string, unknown>; email?: string | null } | null | undefined) => {
      if (!user) { setSignedIn(false); setName(null); return; }
      setSignedIn(true);
      const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
      const full = (meta.full_name as string) || (meta.name as string) || user.email || "";
      setName(full.split(" ")[0] || null);
    };
    supabase.auth.getSession().then(({ data }) => applyUser(data.session?.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => applyUser(s?.user));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!prefs.city) { setAiTip(null); return; }
      const { data } = await supabase
        .from("tours")
        .select("id, title_en, slug")
        .eq("published", true)
        .limit(1);
      const tour = data?.[0];
      if (tour) setAiTip(`${t("home.aiPickToday") || "For you today"}: ${tour.title_en}`);
    };
    load();
  }, [prefs.city, t]);

  const updatePrefs = (next: Prefs) => {
    setPrefs(next);
    try { localStorage.setItem("tripPrefs", JSON.stringify(next)); } catch {}
  };

  return (
    <section className="max-w-[1280px] mx-auto px-4 md:px-8 pt-6">
      <div
        className="relative overflow-hidden rounded-3xl p-6 md:p-10"
        style={{
          background: "linear-gradient(135deg, color-mix(in srgb, #1F9BB4 22%, var(--card)) 0%, var(--card) 100%)",
          border: "1px solid var(--border)",
        }}
      >
        <div
          className="absolute -top-24 -right-24 w-[320px] h-[320px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, color-mix(in srgb, #1F9BB4 20%, transparent), transparent 70%)" }}
        />
        <div className="relative">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] mb-2" style={{ color: "#1F9BB4" }}>
            {signedIn ? t("home.welcomeBack") || "Welcome back" : t("home.welcome") || "Welcome to Hamroh"}
          </p>
          <h1
            className="text-[1.8rem] md:text-[2.6rem] leading-[1.1] tracking-tight mb-4"
            style={{ color: "var(--foreground)", fontFamily: "'DM Serif Display', serif" }}
          >
            {signedIn && name ? `${t("home.hi") || "Hi"}, ${name}!` : t("home.planYourTrip") || "Plan your Uzbekistan trip"}
          </h1>

          <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-4">
            <div
              className="flex items-center gap-2 rounded-full px-3 py-2 text-sm"
              style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" }}
            >
              <MapPin className="h-4 w-4" style={{ color: "#1F9BB4" }} />
              <CityPicker
                value={prefs.city ?? null}
                onChange={(v) => updatePrefs({ ...prefs, city: v ?? undefined })}
              />
            </div>
            <label
              className="flex items-center gap-2 rounded-full px-3 py-2 text-sm cursor-pointer"
              style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" }}
            >
              <Calendar className="h-4 w-4" style={{ color: "#1F9BB4" }} />
              <input
                type="date"
                value={prefs.startDate ?? ""}
                onChange={(e) => updatePrefs({ ...prefs, startDate: e.target.value })}
                className="bg-transparent outline-none text-sm"
                style={{ color: "var(--foreground)" }}
              />
              <span style={{ color: "var(--muted-foreground)" }}>–</span>
              <input
                type="date"
                value={prefs.endDate ?? ""}
                onChange={(e) => updatePrefs({ ...prefs, endDate: e.target.value })}
                className="bg-transparent outline-none text-sm"
                style={{ color: "var(--foreground)" }}
              />
            </label>
          </div>

          {aiTip && (
            <div
              className="flex items-start gap-2 rounded-2xl p-3 mb-4 text-sm"
              style={{ background: "color-mix(in srgb, #1F9BB4 14%, transparent)", color: "var(--foreground)" }}
            >
              <Sparkles className="h-4 w-4 mt-0.5" style={{ color: "#1F9BB4" }} />
              <span>{aiTip}</span>
            </div>
          )}

          {!signedIn && (
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all hover:-translate-y-0.5"
              style={{ background: "#1F9BB4", color: "#fff" }}
            >
              {t("nav.signIn") || "Sign in"} →
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

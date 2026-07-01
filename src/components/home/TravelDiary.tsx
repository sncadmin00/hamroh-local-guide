import { useEffect, useState } from "react";
import { BookOpen, Share2, ArrowRight, MapPin, Camera, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

type Diary = {
  id: string;
  title: string;
  city: string | null;
  start_date: string | null;
  end_date: string | null;
  cover_url: string | null;
  days: unknown[];
  stats: { tours?: number; places?: number; guides?: number; photos?: number } | null;
};

export function TravelDiary() {
  const { t } = useI18n();
  const [diary, setDiary] = useState<Diary | null>(null);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user.id;
      setSignedIn(!!uid);
      if (!uid) return;
      const { data } = await supabase
        .from("travel_diaries")
        .select("id,title,city,start_date,end_date,cover_url,days,stats")
        .eq("user_id", uid)
        .order("updated_at", { ascending: false })
        .limit(1);
      setDiary((data?.[0] as Diary) ?? null);
    })();
  }, []);

  if (!signedIn) return null;

  return (
    <section className="max-w-[1280px] mx-auto px-4 md:px-8 pt-10">
      <div className="rounded-3xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="relative aspect-[16/6] bg-secondary">
          {diary?.cover_url ? (
            <img src={diary.cover_url} alt={diary.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, color-mix(in srgb, #1F9BB4 20%, var(--card)), var(--card))" }}>
              <BookOpen className="h-12 w-12 opacity-40" style={{ color: "#1F9BB4" }} />
            </div>
          )}
        </div>
        <div className="p-5 md:p-6">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="h-4 w-4" style={{ color: "#1F9BB4" }} />
            <span className="text-[0.72rem] font-semibold uppercase tracking-[0.14em]" style={{ color: "#1F9BB4" }}>
              {t("home.travelDiary") || "Travel diary"}
            </span>
          </div>
          <h3 className="text-xl md:text-2xl tracking-tight mb-2" style={{ color: "var(--foreground)", fontFamily: "'DM Serif Display', serif" }}>
            {diary?.title || (t("diary.empty") || "Start your first diary")}
          </h3>
          <p className="text-sm mb-4" style={{ color: "var(--muted-foreground)" }}>
            {diary
              ? `${diary.city ?? ""} · ${diary.start_date ?? ""} — ${diary.end_date ?? ""}`
              : t("diary.emptyHint") || "Log tours, places and photos from your trip."}
          </p>

          {diary && (
            <div className="flex flex-wrap gap-4 mb-5 text-xs" style={{ color: "var(--muted-foreground)" }}>
              <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {diary.stats?.places ?? 0} places</span>
              <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {diary.stats?.guides ?? 0} guides</span>
              <span className="inline-flex items-center gap-1"><Camera className="h-3 w-3" /> {diary.stats?.photos ?? 0} photos</span>
            </div>
          )}

          <div className="flex gap-2">
            <button
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold"
              style={{ background: "#1F9BB4", color: "#fff" }}
            >
              {diary ? (t("common.open") || "Open") : (t("diary.create") || "Create diary")} <ArrowRight className="h-4 w-4" />
            </button>
            {diary && (
              <button
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold"
                style={{ background: "var(--background)", color: "var(--foreground)", border: "1px solid var(--border)" }}
              >
                <Share2 className="h-4 w-4" /> {t("common.share") || "Share"}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

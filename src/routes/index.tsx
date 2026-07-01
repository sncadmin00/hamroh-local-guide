import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { NotificationBanner } from "@/components/home/NotificationBanner";
import { WeatherBanner } from "@/components/home/WeatherBanner";
import { PersonalCard } from "@/components/home/PersonalCard";
import { AISearchBar } from "@/components/home/AISearchBar";
import { ExploreCarousel } from "@/components/home/ExploreCarousel";
import { PopularCategoriesCarousel } from "@/components/home/PopularCategoriesCarousel";
import { SpotlightTourCarousel } from "@/components/home/SpotlightTourCarousel";
import { SpotlightGuideCarousel } from "@/components/home/SpotlightGuideCarousel";
import { ReelsRow } from "@/components/home/ReelsRow";
import { BudgetCalculator } from "@/components/home/BudgetCalculator";
import { TravelDiary } from "@/components/home/TravelDiary";
import { MobileTabBar } from "@/components/home/MobileTabBar";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";


import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hamroh — Find your verified local guide with AI" },
      { name: "description", content: "Chat with Hamroh AI to find a verified local guide in Uzbekistan and beyond. Tell us your trip, get matched in seconds, book and chat directly." },
      { property: "og:title", content: "Hamroh — Find your verified local guide with AI" },
      { property: "og:description", content: "Chat with Hamroh AI to find a verified local guide. Tell us your trip, get matched in seconds." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://hamroh-local-guide.lovable.app/" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Hamroh — Find your verified local guide with AI" },
      { name: "twitter:description", content: "Tell us your trip, get matched with a verified local guide in seconds." },
    ],
    links: [{ rel: "canonical", href: "https://hamroh-local-guide.lovable.app/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Hamroh",
          url: "https://hamroh-local-guide.lovable.app/",
          potentialAction: {
            "@type": "SearchAction",
            target: "https://hamroh-local-guide.lovable.app/guides?q={query}",
            "query-input": "required name=query",
          },
        }),
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { t } = useI18n();
  const [isGuide, setIsGuide] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user.id;
      if (!uid) return;
      supabase.from("guides").select("id").eq("user_id", uid).maybeSingle().then(({ data: g }) => setIsGuide(!!g));
    });
  }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--background)", color: "var(--foreground)" }}>
      <SiteHeader />

      <main className="flex-1">
        <NotificationBanner />
        <PersonalCard />
        <AISearchBar />
        <ExploreCarousel />
        <PopularCategoriesCarousel />
        <SpotlightTourCarousel />
        <SpotlightGuideCarousel />
        <ReelsRow />
        <BudgetCalculator />
        <TravelDiary />


        {/* Become a guide banner */}
        <section className="px-6 md:px-12 py-14 md:py-[72px]">
          <Link
            to={isGuide ? "/guide" : "/become-a-guide"}
            className="relative max-w-[1280px] mx-auto rounded-3xl overflow-hidden flex items-center justify-between gap-6 px-6 py-6 md:px-10 md:py-8 transition-transform hover:-translate-y-0.5"
            style={{
              background: "linear-gradient(135deg, #C9A84C 0%, #B39038 100%)",
              color: "#0F1F5C",
            }}
          >
            <div className="flex-1 min-w-0">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] mb-2 opacity-80">
                {t("nav.becomeGuide")}
              </p>
              <h2 className="text-[1.4rem] md:text-[2rem] leading-[1.15] tracking-tight" style={{ fontFamily: "'DM Serif Display', serif" }}>
                {t("banner.guide.title")}
              </h2>
              <p className="mt-2 text-sm md:text-base opacity-80">
                {t("banner.guide.subtitle") || "Earn from your local knowledge."}
              </p>
            </div>
            <span className="text-3xl md:text-4xl shrink-0">→</span>
          </Link>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

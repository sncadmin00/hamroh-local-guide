import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { HeroSearch } from "@/components/home/HeroSearch";
import { BrowseByInterest } from "@/components/home/BrowseByInterest";
import { SpotlightGuideCarousel } from "@/components/home/SpotlightGuideCarousel";
import { PopularCategoriesCarousel } from "@/components/home/PopularCategoriesCarousel";
import { SpotlightTourCarousel } from "@/components/home/SpotlightTourCarousel";
import { BookingCtaBlock } from "@/components/home/BookingCtaBlock";
import { FeaturedReviews } from "@/components/home/FeaturedReviews";

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
    links: [
      { rel: "canonical", href: "https://hamroh-local-guide.lovable.app/" },
    ],
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
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Hamroh",
          url: "https://hamroh-local-guide.lovable.app/",
          description: "AI-powered marketplace for verified local guides.",
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
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />

      <main className="flex-1">
        <HeroSearch />
        <BrowseByInterest />
        <PopularCategoriesCarousel />
        <SpotlightGuideCarousel />
        <SpotlightTourCarousel />
        <BookingCtaBlock />
        <FeaturedReviews />

        {/* Become a guide banner */}
        <section className="px-6 py-10 md:py-14">
          <div className="max-w-5xl mx-auto">
            <div className="relative overflow-hidden rounded-3xl p-8 md:p-12 text-center text-white shadow-[var(--shadow-elegant)]"
              style={{ background: "linear-gradient(135deg, #8BB5A9 0%, #62A1B1 55%, #D5A08D 100%)" }}
            >
              <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-30 blur-3xl bg-white" />
              <div className="relative">
                <h2 className="font-display text-2xl md:text-3xl font-semibold whitespace-pre-line">{t("banner.guide.title")}</h2>
                <div className="mt-4 text-base md:text-lg opacity-90 max-w-md mx-auto whitespace-pre-line">
                  {t("banner.guide.points")}
                </div>
                <Link
                  to={isGuide ? "/guide" : "/become-a-guide"}
                  className="mt-6 inline-flex items-center gap-2 h-11 px-6 rounded-full bg-white text-foreground text-sm font-semibold hover:bg-white/90 transition-colors"
                >
                  {isGuide ? t("nav.guideDashboard") : t("banner.guide.button")}
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

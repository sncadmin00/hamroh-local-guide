import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { EditorialHero } from "@/components/home/EditorialHero";
import { ExploreTabs } from "@/components/home/ExploreTabs";
import { SpotlightBanner } from "@/components/home/SpotlightBanner";

import { WhyHamroh } from "@/components/home/WhyHamroh";
import { BookTourBanner } from "@/components/home/BookTourBanner";
import { TrustBar } from "@/components/home/TrustBar";
import { FeaturedReviews } from "@/components/home/FeaturedReviews";
import { DownloadAppBanner } from "@/components/home/DownloadAppBanner";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { spotlightsQueryOptions } from "@/lib/content-queries";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hamroh — Verified local guides & tours across Uzbekistan" },
      { name: "description", content: "Book verified local guides and curated tours in Samarkand, Bukhara, Khiva and Tashkent. AI-matched, transparent pricing, direct chat with your guide." },
      { property: "og:title", content: "Hamroh — Verified local guides & tours across Uzbekistan" },
      { property: "og:description", content: "Book verified local guides and curated tours in Samarkand, Bukhara, Khiva and Tashkent." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://hamroh-local-guide.lovable.app/" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Hamroh — Verified local guides & tours across Uzbekistan" },
      { name: "twitter:description", content: "AI-matched local guides and tours in Uzbekistan." },
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
  errorComponent: ({ error }) => <div className="p-8 text-sm text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8 text-sm">Not found.</div>,
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
      <SiteHeader transparent />

      <main className="flex-1">
        <EditorialHero />
        <TrustBar />
        <section className="px-6 pt-8 md:pt-12">
          <div className="max-w-6xl mx-auto flex justify-center">
            <SpotlightBanner />
          </div>
        </section>
        <ExploreTabs />
        <WhyHamroh />
        <BookTourBanner />

        <FeaturedReviews />
        <DownloadAppBanner />

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
            </div>
            <span className="text-3xl md:text-4xl shrink-0">→</span>
          </Link>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

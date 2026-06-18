import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { HeroSearch } from "@/components/home/HeroSearch";
import { TrustBar } from "@/components/home/TrustBar";

import { SpotlightGuideCarousel } from "@/components/home/SpotlightGuideCarousel";
import { PopularCategoriesCarousel } from "@/components/home/PopularCategoriesCarousel";
import { SpotlightTourCarousel } from "@/components/home/SpotlightTourCarousel";

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
    <div className="min-h-screen flex flex-col" style={{ background: "#0a0f1e", color: "#F0EBE0" }}>
      <SiteHeader transparent sticky={false} />

      <main className="flex-1">
        <div className="-mt-16">
          <HeroSearch />
        </div>

        <TrustBar />

        <PopularCategoriesCarousel />
        <div className="gold-divider" />
        <SpotlightGuideCarousel />
        <div className="gold-divider" />
        <SpotlightTourCarousel />

        <FeaturedReviews />

        {/* Become a guide banner */}
        <section className="px-6 md:px-12 pb-16 md:pb-[72px]">
          <div
            className="relative max-w-[1280px] mx-auto rounded-3xl overflow-hidden flex flex-col md:flex-row items-center gap-10 px-8 py-10 md:px-16 md:py-14"
            style={{
              background: "linear-gradient(135deg, #1a2236 0%, #111827 100%)",
              border: "1px solid var(--gold-glow)",
            }}
          >
            <div
              className="absolute -top-20 -right-20 w-[300px] h-[300px] rounded-full pointer-events-none"
              style={{ background: "radial-gradient(circle, color-mix(in srgb, var(--gold) 8%, transparent) 0%, transparent 70%)" }}
            />
            <div
              className="absolute -bottom-16 left-[200px] w-[200px] h-[200px] rounded-full pointer-events-none"
              style={{ background: "radial-gradient(circle, color-mix(in srgb, var(--gold) 5%, transparent) 0%, transparent 70%)" }}
            />

            <div className="relative max-w-[500px] flex-1">
              <p
                className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] mb-4"
                style={{ color: "var(--gold)" }}
              >
                {t("nav.becomeGuide")}
              </p>
              <h2
                className="text-[1.6rem] md:text-[2.4rem] leading-[1.15] tracking-tight mb-5 whitespace-pre-line"
                style={{ color: "#F0EBE0", fontFamily: "'DM Serif Display', serif" }}
              >
                {t("banner.guide.title")}
              </h2>
              <p className="text-[0.95rem] leading-relaxed mb-8 whitespace-pre-line" style={{ color: "#94A3B8" }}>
                {t("banner.guide.points")}
              </p>
              <Link
                to={isGuide ? "/guide" : "/become-a-guide"}
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-sm font-semibold transition-all hover:-translate-y-0.5"
                style={{ background: "var(--gold)", color: "#0a0f1e" }}
              >
                {isGuide ? t("nav.guideDashboard") : t("banner.guide.button")} →
              </Link>
            </div>

            <div
              className="relative rounded-[20px] p-7 min-w-[240px] flex-shrink-0 md:rotate-2 w-full md:w-auto"
              style={{
                background: "rgba(26,34,54,0.8)",
                backdropFilter: "blur(12px)",
                border: "1px solid var(--gold-glow)",
                boxShadow: "0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
              }}
            >
              <div
                className="w-16 h-16 rounded-full mx-auto mb-3.5 flex items-center justify-center text-3xl border-2"
                style={{
                  background: "linear-gradient(135deg, #2a3a5c, #1a2236)",
                  borderColor: "color-mix(in srgb, var(--gold) 30%, transparent)",
                }}
              >
                🧑‍💼
              </div>
              <p className="font-semibold text-[0.95rem] text-center mb-1" style={{ color: "#F0EBE0" }}>
                {t("nav.becomeGuide")}
              </p>
              <p className="text-[0.78rem] text-center mb-3.5" style={{ color: "#4A6080" }}>
                Uzbekistan
              </p>
              <div className="flex justify-center gap-1 mb-3.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} style={{ color: "var(--gold)" }}>★</span>
                ))}
              </div>
              <div
                className="inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-[0.72rem] font-semibold tracking-wider w-full"
                style={{
                  background: "color-mix(in srgb, var(--gold) 10%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--gold) 25%, transparent)",
                  color: "var(--gold)",
                }}
              >
                ✓ Verified Guide
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

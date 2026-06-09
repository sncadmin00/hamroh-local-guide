import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, Mic } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { TrustBar } from "@/components/home/TrustBar";
import { SpotlightBanner } from "@/components/home/SpotlightBanner";
import { HeroSearch } from "@/components/home/HeroSearch";


import { ExploreTabs } from "@/components/home/ExploreTabs";
import { WhyHamroh } from "@/components/home/WhyHamroh";
import { HomeFaq } from "@/components/home/HomeFaq";

import { FeaturedReviews } from "@/components/home/FeaturedReviews";

import { supabase } from "@/integrations/supabase/client";

import { createThread } from "@/lib/ai-threads.functions";
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
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            { q: "How does Hamroh work?", a: "Describe your trip in your own words. Our AI matches you with verified local guides who fit your language, budget and interests. Chat with them and book in one place." },
            { q: "Are the guides really verified?", a: "Yes. Each guide submits ID, references and sample tours. Our team reviews every application manually before approval." },
            { q: "How do I pay?", a: "Pay securely online by card. We hold your payment and release it to the guide after your trip is completed." },
            { q: "Can I cancel a booking?", a: "Yes — cancel free of charge up to 24 hours before the tour starts. Later cancellations may not be refundable." },
            { q: "What languages do guides speak?", a: "English, Russian and Uzbek are most common. Many guides also speak French, German, Korean, Japanese and more." },
            { q: "Do I need to sign up to chat with AI?", a: "No — try Hamroh AI for free without signup. You'll only need an account when you're ready to book or message a guide." },
          ].map(({ q, a }) => ({
            "@type": "Question",
            name: q,
            acceptedAnswer: { "@type": "Answer", text: a },
          })),
        }),
      },

    ],
  }),
  component: Home,
});



function Home() {
  const navigate = useNavigate();
  const create = useServerFn(createThread);
  const { t } = useI18n();
  const [isGuide, setIsGuide] = useState(false);


  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [listening, setListening] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  const toggleMic = () => {
    const SR: any =
      (typeof window !== "undefined" &&
        ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)) ||
      null;
    if (!SR) {
      alert("Voice input is not supported in this browser.");
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const rec = new SR();
    rec.lang = navigator.language || "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    let base = input ? input + " " : "";
    rec.onresult = (e: any) => {
      let transcript = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript;
      }
      setInput(base + transcript);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  };

  useEffect(() => {
    taRef.current?.focus();
    const pending = sessionStorage.getItem("pendingAiPrompt");
    if (pending) {
      sessionStorage.removeItem("pendingAiPrompt");
      setInput(pending);
    }
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user.id;
      if (!uid) return;
      supabase.from("guides").select("id").eq("user_id", uid).maybeSingle().then(({ data: g }) => setIsGuide(!!g));
    });
  }, []);

  const submit = async (text: string) => {
    const t = text.trim();
    if (!t || submitting) return;
    setSubmitting(true);
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        sessionStorage.setItem("pendingAiPrompt", t);
        navigate({ to: "/login" });
        return;
      }
      const thread = await create();
      if (thread?.id) {
        sessionStorage.setItem(`initialPrompt:${thread.id}`, t);
        navigate({ to: "/ai/$threadId", params: { threadId: thread.id } });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />

      <main>
        {/* Classic-search style hero (AI under the hood) */}
        <HeroSearch />

        {/* Spotlight carousel */}
        <div className="container mx-auto px-6 mt-8 md:mt-10">
          <SpotlightBanner />
        </div>

        {/* Trust badges */}
        <div className="text-center mt-8 md:mt-10 px-6">
          <TrustBar />
        </div>
      </main>



      {/* Promo banner */}
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

      <ExploreTabs />
      <WhyHamroh />

      
      <FeaturedReviews />
      <HomeFaq />


      <SiteFooter />

    </div>
  );
}

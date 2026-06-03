import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, Mic } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { TrustBar } from "@/components/home/TrustBar";
import { SpotlightBanner } from "@/components/home/SpotlightBanner";

import { ExploreTabs } from "@/components/home/ExploreTabs";
import { LatestPosts } from "@/components/home/LatestPosts";
import { FeaturedReviews } from "@/components/home/FeaturedReviews";
import { BecomeGuideCTA } from "@/components/home/BecomeGuideCTA";
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
    ],
  }),
  component: Home,
});



function Home() {
  const navigate = useNavigate();
  const create = useServerFn(createThread);
  const { t } = useI18n();


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

      <main className="flex items-center justify-center px-6 py-6 md:py-16">
        <div className="w-full max-w-3xl mx-auto flex flex-col items-center">
          {/* Spotlight carousel */}
          <SpotlightBanner />

          {/* H1 + subtitle */}
          <div className="text-center mt-2 mb-6 md:mb-8">
            <h1 className="font-display text-3xl md:text-5xl font-semibold tracking-tight text-foreground leading-[1.1]">
              {t("hero.h1")}
            </h1>
            <p className="mt-3 md:mt-4 text-sm md:text-lg text-slate-500 max-w-xl mx-auto">
              {t("hero.h1sub")}
            </p>
          </div>



          {/* AI Input with hover glow */}
          <form
            onSubmit={(e) => { e.preventDefault(); submit(input); }}
            className="w-full max-w-2xl relative group"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-[#62A1B1]/40 to-[#D5A08D]/40 rounded-[2.5rem] blur-md opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition duration-1000 group-hover:duration-200" />
            <div className="relative flex items-end gap-2 bg-white border border-slate-100 shadow-[0_15px_40px_-15px_rgba(0,0,0,0.08)] rounded-[2rem] p-2 pl-5 md:pl-6">
              <textarea
                ref={taRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submit(input);
                  }
                }}
                rows={1}
                placeholder={t("hero.placeholder")}
                className="flex-1 resize-none bg-transparent py-4 text-base md:text-lg text-slate-800 placeholder:text-slate-300 outline-none max-h-40"
                disabled={submitting}
              />
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={toggleMic}
                  disabled={submitting}
                  aria-label={listening ? "Stop voice input" : "Start voice input"}
                  className={`h-11 w-11 inline-flex items-center justify-center rounded-full transition-colors ${
                    listening
                      ? "bg-destructive text-destructive-foreground animate-pulse"
                      : "text-slate-400 hover:text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Mic className="h-5 w-5" />
                </button>
                <button
                  type="submit"
                  disabled={submitting || !input.trim()}
                  aria-label="Send"
                  className="h-11 w-11 inline-flex items-center justify-center rounded-full bg-[#8BB5A9] hover:bg-[#7aa297] text-white shadow-md shadow-slate-900/10 transition-all active:scale-95 disabled:opacity-40 disabled:hover:bg-[#8BB5A9]"
                >
                  <ArrowUp className="h-5 w-5" strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </form>

          {/* Tagline under input */}
          <p className="mt-3 text-xs text-slate-400">{t("hero.tagline")}</p>

          {/* How it works moved above input */}



        </div>
      </main>


      <ExploreTabs />

      <LatestPosts />
      <FeaturedReviews />
      <BecomeGuideCTA />

      <SiteFooter />
    </div>
  );
}

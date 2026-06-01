import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, Mic, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CategoryIcon } from "@/components/CategoryIcon";
import { supabase } from "@/integrations/supabase/client";
import { createThread } from "@/lib/ai-threads.functions";
import { useCategories } from "@/lib/content-queries";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hamroh — What's up? with AI" },
      { name: "description", content: "Chat with Hamroh AI to find a verified local guide. Tell us your trip, get matched in seconds." },
    ],
  }),
  component: Home,
});

const SUGGESTIONS = [
  "Korean-speaking food guide",
  "Sunset photography tour",
  "Family-friendly history walk",
  "Half-day artisan workshop",
];

function Home() {
  const navigate = useNavigate();
  const create = useServerFn(createThread);
  const { t } = useI18n();
  const { data: categories = [] } = useCategories();
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

      <main className="flex-1 flex items-center justify-center px-6 py-16 md:py-24">
        <div className="w-full max-w-3xl mx-auto flex flex-col items-center">
          {/* Brand icon with ambient glow */}
          <div className="relative mb-10 md:mb-12">
            <div className="absolute inset-0 blur-2xl opacity-30 bg-gradient-to-br from-[#62A1B1] to-[#D5A08D] scale-150 rounded-full" />
            <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-[2rem] bg-gradient-to-br from-[#62A1B1] via-[#8BB5A9] to-[#D5A08D] flex items-center justify-center shadow-2xl shadow-slate-900/10 ring-1 ring-white/40">
              <Sparkles className="w-9 h-9 md:w-10 md:h-10 text-white" strokeWidth={1.5} />
            </div>
          </div>

          {/* Headline */}
          <div className="text-center space-y-5 md:space-y-6 mb-12 md:mb-16">
            <h1 className="font-display md:text-7xl font-semibold tracking-tight text-slate-900 leading-[1.05] text-3xl">
              {t("hero.title")}
            </h1>
            <p className="text-base md:text-lg text-slate-500 max-w-lg mx-auto leading-relaxed font-light">
              {t("hero.subtitle")}
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
                placeholder="e.g. English-speaking food guide for two days…"
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

          {/* Suggestions */}
          <div className="flex flex-wrap justify-center gap-2.5 mt-8 max-w-2xl">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => submit(s)}
                disabled={submitting}
                className="px-4 py-2 rounded-full border border-slate-200/70 bg-white/50 text-sm text-slate-500 hover:border-slate-300 hover:text-slate-800 hover:bg-white transition-all"
              >
                {s}
              </button>
            ))}
          </div>

          {/* Secondary action */}
          <Link
            to="/guides"
            className="mt-12 text-sm text-slate-400 hover:text-slate-900 transition-colors border-b border-slate-200 hover:border-slate-400 pb-0.5"
          >
            {t("hero.browse")}
          </Link>
        </div>
      </main>

      {/* Browse by interest */}
      {categories.length > 0 && (
        <section className="px-6 pb-20 md:pb-28">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="font-display text-2xl md:text-3xl font-semibold text-slate-900">Browse by interest</h2>
              <p className="mt-2 text-sm text-slate-500">Find a guide for what you love</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
              {categories.map((c) => (
                <Link
                  key={c.id}
                  to="/guides"
                  search={{ category: c.slug }}
                  className="group flex flex-col items-center text-center p-5 rounded-2xl bg-white border border-slate-100 hover:border-slate-200 hover:shadow-lg hover:-translate-y-0.5 transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#62A1B1]/15 to-[#D5A08D]/15 flex items-center justify-center text-slate-700 group-hover:scale-110 transition-transform">
                    <CategoryIcon name={c.icon} className="h-6 w-6" strokeWidth={1.75} />
                  </div>
                  <div className="mt-3 text-sm font-medium text-slate-800">{c.name}</div>
                  {c.description && (
                    <div className="mt-1 text-xs text-slate-400 line-clamp-2">{c.description}</div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <SiteFooter />
    </div>
  );
}

import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Sparkles, Search, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { createThread } from "@/lib/ai-threads.functions";
import { supabase } from "@/integrations/supabase/client";
import heroDesktopAsset from "@/assets/hero-samarkand-v3-desktop.jpg.asset.json";
import heroMobileAsset from "@/assets/hero-samarkand-v3-mobile.jpg.asset.json";

export function HeroSearch() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const create = useServerFn(createThread);

  const [describe, setDescribe] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [animating, setAnimating] = useState(false);

  const phrases = [
    t("hero.search.placeholder1"),
    t("hero.search.placeholder2"),
    t("hero.search.placeholder3"),
  ];

  useEffect(() => {
    if (describe) return;
    const id = setInterval(() => {
      setAnimating(true);
      setTimeout(() => {
        setPhraseIdx((i) => (i + 1) % phrases.length);
        setAnimating(false);
      }, 250);
    }, 3000);
    return () => clearInterval(id);
  }, [describe, phrases.length]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = describe.trim();
    if (!q || submitting) return;
    setSubmitting(true);
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        sessionStorage.setItem("pendingAiPrompt", q);
        navigate({ to: "/login" });
        return;
      }
      const thread = await create();
      if (thread?.id) {
        sessionStorage.setItem(`initialPrompt:${thread.id}`, q);
        navigate({ to: "/ai/$threadId", params: { threadId: thread.id } });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="relative min-h-[460px] md:min-h-[520px] flex flex-col justify-end md:max-w-[calc(72rem-2rem)] md:mx-auto">
      {/* Background image */}
      <div className="absolute inset-0 z-0 overflow-hidden lg:rounded-2xl">
        <picture>
          <source media="(min-width: 768px)" srcSet={heroDesktopAsset.url} />
          <img
            src={heroMobileAsset.url}
            alt="Local Uzbek companion exploring Samarkand with a traveler at golden hour"
            className="h-full w-full object-cover object-center"
            loading="eager"
          />
        </picture>

        {/* Left fade into background */}
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-1/3"
          style={{
            background:
              "linear-gradient(90deg, var(--background) 0%, color-mix(in oklab, var(--background) 60%, transparent) 40%, transparent 100%)",
          }}
        />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 pt-8 pb-0 md:pt-12 md:pb-0 w-full translate-y-12 md:translate-y-0">
        <div className="max-w-2xl">
          {/* Search pill */}
          <form
            onSubmit={onSubmit}
            className="bg-card border border-border rounded-2xl md:rounded-full shadow-[var(--shadow-card)] p-2 flex flex-col md:flex-row items-stretch gap-2 md:translate-y-1/2 md:relative md:z-20"
          >
            <label className="group flex-1 flex items-center gap-3 px-4 py-3 md:py-4 rounded-xl md:rounded-full hover:bg-muted/60 transition-colors cursor-text min-w-0 relative">
              <Sparkles className="h-5 w-5 text-accent shrink-0" />
              <div className="relative flex-1 min-w-0">
                <input
                  type="text"
                  value={describe}
                  onChange={(e) => setDescribe(e.target.value)}
                  placeholder=""
                  className="w-full bg-transparent text-lg text-foreground outline-none min-w-0"
                  autoComplete="off"
                  disabled={submitting}
                />
                {!describe && (
                  <span
                    key={phraseIdx}
                    aria-hidden="true"
                    className={`pointer-events-none absolute inset-0 flex items-center text-base sm:text-lg text-muted-foreground truncate transition-all duration-300 ${
                      animating ? "opacity-0 -translate-y-1" : "opacity-100 translate-y-0 animate-fade-in"
                    }`}
                  >
                    {phrases[phraseIdx]}
                  </span>
                )}
              </div>
            </label>


            <button
              type="submit"
              disabled={submitting || !describe.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-xl md:rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {t("hero.search.button")}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Sparkles, Search, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { createThread } from "@/lib/ai-threads.functions";
import { supabase } from "@/integrations/supabase/client";
import heroDesktopAsset from "@/assets/hero-bukhara-people.jpg.asset.json";
import heroMobileAsset from "@/assets/hero-bukhara-people-mobile.jpg.asset.json";

export function HeroSearch() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const create = useServerFn(createThread);

  const [describe, setDescribe] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
            alt="Chashma-Ayub mausoleum, Bukhara"
            className="h-full w-full object-cover object-center md:object-top"
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
          <h1 className="font-display text-3xl md:text-5xl font-bold text-white whitespace-pre-line leading-tight [text-shadow:0_2px_12px_rgba(0,0,0,0.45)]">
            {t("hero.search.title")}
          </h1>
          <p className="mt-3 md:mt-4 text-sm md:text-lg text-white/95 max-w-xl [text-shadow:0_1px_8px_rgba(0,0,0,0.45)]">
            {t("hero.search.subtitle")}
          </p>
          {/* Search pill */}
          <form
            onSubmit={onSubmit}
            className="mt-6 md:mt-8 bg-card border border-border rounded-2xl md:rounded-full shadow-[var(--shadow-card)] p-2 flex flex-col md:flex-row items-stretch gap-2 md:translate-y-1/2 md:relative md:z-20"
          >
            <label className="group flex-1 flex items-center gap-3 px-4 py-3 md:py-4 rounded-xl md:rounded-full hover:bg-muted/60 transition-colors cursor-text min-w-0">
              <Sparkles className="h-5 w-5 text-accent shrink-0" />
              <input
                type="text"
                value={describe}
                onChange={(e) => setDescribe(e.target.value)}
                placeholder={t("hero.search.describe")}
                className="flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground outline-none min-w-0"
                autoComplete="off"
                disabled={submitting}
              />
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

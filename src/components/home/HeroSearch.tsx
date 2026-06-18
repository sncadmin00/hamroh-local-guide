import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Search, Loader2, ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { createThread } from "@/lib/ai-threads.functions";
import { supabase } from "@/integrations/supabase/client";
import heroDesktopAsset from "@/assets/hero-samarkand-v3-desktop.jpg.asset.json";
import heroMobileAsset from "@/assets/hero-samarkand-v3-mobile.jpg.asset.json";

const GOLD = "var(--gold)";
const AMBER = "var(--gold-hover)";
const BG = "var(--background)";

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

  // Split localized title into two lines: last word goes on its own gold-underlined line.
  const title = t("hero.search.title");
  const parts = title.trim().split(/\s+/);
  const lastWord = parts.length > 1 ? parts.pop()! : title;
  const firstLine = parts.join(" ") || t("common.find") || "Find your";

  return (
    <section
      className="hero relative flex flex-col items-center justify-start text-center overflow-hidden"
      style={{
        backgroundColor: BG,
        minHeight: "100vh",
        padding: "0 24px 80px",
        color: "var(--foreground)",
      }}
    >
      {/* Background image */}
      <div className="absolute inset-0 z-0">
        <picture>
          <source media="(min-width: 768px)" srcSet={heroDesktopAsset.url} />
          <img
            src={heroMobileAsset.url}
            alt="Local Uzbek companion exploring Samarkand with a traveler at golden hour"
            className="h-full w-full object-cover object-[center_20%] md:object-[72%_center] lg:object-[center_8%]"
            style={{ filter: "brightness(0.7) saturate(1.1)" }}
            loading="eager"
          />
        </picture>
      </div>

      {/* Top gradient for navbar readability */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, rgba(10,15,30,0.65) 0%, rgba(10,15,30,0) 20%)",
        }}
      />

      {/* Gradient overlay */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, rgba(10,15,30,0.55) 0%, rgba(10,15,30,0) 35%, rgba(10,15,30,0.72) 65%, rgba(10,15,30,1) 100%)",
        }}
      />

      {/* Ambient gold glow */}
      <div
        className="absolute z-0 pointer-events-none"
        style={{
          bottom: -60,
          left: "50%",
          transform: "translateX(-50%)",
          width: 600,
          height: 300,
          background: "radial-gradient(ellipse, color-mix(in srgb, var(--gold) 12%, transparent) 0%, transparent 70%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 w-full pt-24 md:pt-[120px] lg:pt-[80px]" style={{ maxWidth: 760 }}>
        {/* Eyebrow */}
        <div
          className="inline-flex items-center gap-2 mb-6 animate-fade-in"
          style={{
            fontSize: "0.75rem",
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: GOLD,
            opacity: 1,
            textShadow: "0 1px 6px rgba(0,0,0,0.6)",
          }}
        >
          <span style={{ width: 28, height: 1, background: GOLD, opacity: 0.6, display: "inline-block" }} />
          {t("hero.eyebrow")}
        </div>

        {/* H1 */}
        <h1
          className="animate-fade-in"
          style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: "clamp(2.6rem, 7vw, 4.8rem)",
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            color: "var(--foreground)",
            marginBottom: 32,
            animationDelay: "0.12s",
          }}
        >
          <span style={{ display: "block" }}>{firstLine}</span>
          <span style={{ display: "block", position: "relative", width: "fit-content", margin: "0 auto" }}>
            <span style={{ position: "relative", display: "inline-block" }}>
              {lastWord}
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  bottom: -4,
                  left: 0,
                  right: 0,
                  height: 3,
                  background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
                  borderRadius: 2,
                }}
              />
            </span>
          </span>
        </h1>

        {/* Search bar */}
        <form
          onSubmit={onSubmit}
          className="mx-auto mb-8 animate-fade-in w-full md:max-w-[580px] lg:mt-[300px]"
          style={{
            animationDelay: "0.25s",
            display: "flex",
            alignItems: "center",
            background: "rgba(26, 34, 54, 0.85)",
            border: "1px solid color-mix(in srgb, var(--gold) 30%, transparent)",
            borderRadius: 14,
            padding: "6px 6px 6px 20px",
            gap: 12,
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
          }}
        >
          <Search className="h-5 w-5 shrink-0" style={{ color: "var(--muted-foreground)" }} />
          <div className="relative flex-1 min-w-0">
            <input
              type="text"
              value={describe}
              onChange={(e) => setDescribe(e.target.value)}
              className="w-full bg-transparent outline-none"
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: "1rem",
                color: "var(--foreground)",
                padding: "12px 0",
                border: "none",
              }}
              autoComplete="off"
              disabled={submitting}
            />
            {!describe && (
              <span
                key={phraseIdx}
                aria-hidden="true"
                className={`pointer-events-none absolute inset-0 flex items-center truncate transition-all duration-300 ${
                  animating ? "opacity-0 -translate-y-1" : "opacity-100 translate-y-0"
                }`}
                style={{ color: "var(--muted-foreground)", fontSize: "1rem" }}
              >
                {phrases[phraseIdx]}
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={submitting || !describe.trim()}
            className="flex items-center justify-center transition-all active:scale-[0.97] disabled:opacity-60"
            style={{
              background: GOLD,
              border: "none",
              borderRadius: 10,
              width: 48,
              height: 48,
              cursor: "pointer",
              flexShrink: 0,
              color: BG,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = AMBER;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = GOLD;
            }}
            aria-label={t("hero.search.button")}
          >
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
          </button>
        </form>

        {/* Trust badges */}
        <div
          className="flex flex-row items-center justify-center gap-2 flex-wrap animate-fade-in"
          style={{ animationDelay: "0.38s" }}
        >
          {[
            t("hero.badge.identity"),
            t("hero.badge.language"),
            t("hero.badge.chat"),
            t("hero.badge.booking"),
            t("hero.badge.reviews"),
          ].map((label) => (
            <span
              key={label}
              className="inline-flex items-center gap-1.5 whitespace-nowrap transition-colors"
              style={{
                background: "rgba(26, 34, 54, 0.7)",
                border: "1px solid var(--border)",
                borderRadius: 999,
                padding: "5px 10px",
                fontSize: "0.7rem",
                fontWeight: 500,
                color: "var(--muted-foreground)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
              }}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  background: GOLD,
                  borderRadius: "50%",
                  boxShadow: "0 0 4px color-mix(in srgb, var(--gold) 60%, transparent)",
                  flexShrink: 0,
                }}
              />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Scroll hint */}
      <div
        className="absolute flex flex-col items-center gap-1.5 animate-fade-in"
        style={{ bottom: 32, left: "50%", transform: "translateX(-50%)", animationDelay: "0.8s" }}
      >
        <span
          style={{
            fontSize: "0.7rem",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--muted-foreground)",
          }}
        >
          {t("hero.scroll")}
        </span>
        <span
          style={{
            width: 1,
            height: 36,
            background: `linear-gradient(to bottom, ${GOLD}, transparent)`,
            display: "block",
          }}
        />
      </div>
    </section>
  );
}

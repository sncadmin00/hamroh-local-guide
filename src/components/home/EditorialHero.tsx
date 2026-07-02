import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Loader2, ArrowRight, Sun, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { createThread } from "@/lib/ai-threads.functions";
import { supabase } from "@/integrations/supabase/client";

/**
 * Desktop editorial hero based on selected "Editorial glass grid" direction.
 * 12-col grid: headline + AI search on col-8, weather + welcome glass cards on col-4.
 * Mobile: single column stack.
 */
export function EditorialHero() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const create = useServerFn(createThread);

  const [describe, setDescribe] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [userName, setUserName] = useState<string | null>(null);

  const phrases = [
    t("hero.search.placeholder1"),
    t("hero.search.placeholder2"),
    t("hero.search.placeholder3"),
  ];

  useEffect(() => {
    if (describe) return;
    const id = setInterval(() => setPhraseIdx((i) => (i + 1) % phrases.length), 3200);
    return () => clearInterval(id);
  }, [describe, phrases.length]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      if (!u) return;
      const name = (u.user_metadata?.full_name as string | undefined)
        ?? (u.user_metadata?.name as string | undefined)
        ?? u.email?.split("@")[0]
        ?? null;
      setUserName(name);
    });
  }, []);

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

  // Split title so last word is italic serif accent
  const title = t("hero.search.title");
  const parts = title.trim().split(/\s+/);
  const lastWord = parts.length > 1 ? parts.pop()! : title;
  const firstLine = parts.join(" ") || t("common.find") || "Find your";

  return (
    <section
      className="relative overflow-hidden"
      style={{
        background: "var(--background)",
        color: "var(--foreground)",
        paddingTop: "clamp(96px, 12vw, 160px)",
        paddingBottom: "clamp(48px, 8vw, 112px)",
      }}
    >
      {/* Ambient gold glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: "-10%",
          right: "-10%",
          width: 720,
          height: 720,
          background:
            "radial-gradient(ellipse at center, color-mix(in srgb, var(--gold) 14%, transparent) 0%, transparent 65%)",
          filter: "blur(20px)",
        }}
      />

      <div className="relative max-w-[1280px] mx-auto px-6 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-end">
          {/* Left: headline + search */}
          <div className="lg:col-span-8 space-y-8">
            <div
              className="inline-flex items-center gap-3 uppercase"
              style={{
                color: "var(--gold)",
                fontWeight: 600,
                letterSpacing: "0.18em",
                fontSize: "0.72rem",
              }}
            >
              <span
                aria-hidden
                style={{
                  display: "inline-block",
                  height: 1,
                  width: 32,
                  background: "var(--gold)",
                }}
              />
              {t("hero.eyebrow")}
            </div>

            <h1
              className="animate-fade-in"
              style={{
                fontFamily: "'DM Serif Display', serif",
                fontSize: "clamp(2.6rem, 7.2vw, 6rem)",
                lineHeight: 1.02,
                letterSpacing: "-0.02em",
                fontWeight: 400,
                margin: 0,
              }}
            >
              <span style={{ display: "block", color: "var(--foreground)" }}>
                {firstLine}{" "}
                <span
                  style={{
                    fontStyle: "italic",
                    color: "color-mix(in srgb, var(--gold) 78%, #F5E6AD)",
                  }}
                >
                  {lastWord}
                </span>
              </span>
            </h1>

            {/* Search bar with glow */}
            <form onSubmit={onSubmit} className="relative group max-w-2xl">
              <div
                aria-hidden
                className="absolute -inset-1 rounded-2xl blur opacity-30 group-focus-within:opacity-70 transition duration-700 pointer-events-none"
                style={{
                  background:
                    "linear-gradient(90deg, color-mix(in srgb, var(--gold) 40%, transparent), transparent)",
                }}
              />
              <div
                className="relative flex items-center rounded-2xl p-2 shadow-2xl"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  backdropFilter: "blur(20px) saturate(140%)",
                }}
              >
                <input
                  type="text"
                  value={describe}
                  onChange={(e) => setDescribe(e.target.value)}
                  placeholder={phrases[phraseIdx]}
                  className="flex-1 bg-transparent px-6 py-4 outline-none text-lg min-w-0"
                  style={{ color: "var(--foreground)" }}
                  autoComplete="off"
                  disabled={submitting}
                />
                <button
                  type="submit"
                  disabled={submitting || !describe.trim()}
                  className="inline-flex items-center gap-2 px-6 md:px-8 py-4 rounded-xl font-bold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
                  style={{
                    background: "var(--gold)",
                    color: "#0A0F1E",
                  }}
                >
                  {submitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span className="hidden sm:inline">{t("hero.search.button") || "AI Search"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Trust badges — kept minimal */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 pt-2">
              {[
                t("hero.badge.identity"),
                t("hero.badge.language"),
                t("hero.badge.chat"),
                t("hero.badge.booking"),
                t("hero.badge.reviews"),
              ].map((label) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "var(--muted-foreground)",
                  }}
                >
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: "var(--gold)",
                      boxShadow: "0 0 6px color-mix(in srgb, var(--gold) 70%, transparent)",
                    }}
                  />
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Right: sidecar (weather + welcome) */}
          <aside className="lg:col-span-4 flex flex-col gap-5">
            {/* Weather glass card */}
            <div
              className="rounded-3xl p-6 flex items-center justify-between"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.10)",
                backdropFilter: "blur(20px)",
              }}
            >
              <div className="flex items-center gap-4 min-w-0">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    background: "color-mix(in srgb, var(--gold) 18%, transparent)",
                    color: "var(--gold)",
                  }}
                >
                  <Sun className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <p
                    className="text-[0.65rem] uppercase truncate"
                    style={{ color: "var(--muted-foreground)", letterSpacing: "0.18em" }}
                  >
                    Samarkand
                  </p>
                  <p className="text-xl font-medium truncate" style={{ color: "var(--foreground)" }}>
                    28°C · {t("weather.sunny")}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[0.65rem]" style={{ color: "var(--muted-foreground)" }}>
                  {t("weather.humidity")}
                </p>
                <p className="text-sm" style={{ color: "var(--foreground)" }}>
                  22%
                </p>
              </div>
            </div>

            {/* Welcome / personal card */}
            <div
              className="rounded-3xl p-6 flex items-center gap-4"
              style={{
                background: "linear-gradient(135deg, var(--gold) 0%, #B8962E 100%)",
                color: "#0A0F1E",
              }}
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center shrink-0 text-lg font-bold"
                style={{
                  background: "rgba(0,0,0,0.12)",
                  border: "1px solid rgba(0,0,0,0.08)",
                }}
              >
                {userName ? userName.slice(0, 1).toUpperCase() : "H"}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-lg truncate">
                  {userName ? `${t("hero.welcome") || "Welcome"}, ${userName}` : t("hero.welcome.guest") || "Welcome, traveller"}
                </p>
                <p className="text-sm opacity-75 italic truncate">
                  {t("hero.welcome.sub") || "Your Silk Road begins here"}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

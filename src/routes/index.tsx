import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, Mic, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { supabase } from "@/integrations/supabase/client";
import { createThread } from "@/lib/ai-threads.functions";
import { useI18n } from "@/lib/i18n";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}


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

      <main className="flex-1 flex items-center justify-center px-4 py-12 md:py-20">
        <div className="w-full max-w-2xl mx-auto">
          <div className="text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-primary-foreground mb-6 shadow-[var(--shadow-elegant)]">
              <Sparkles className="h-7 w-7" />
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-semibold leading-tight">
              {t("hero.title")}
            </h1>
            <p className="mt-3 text-muted-foreground text-base md:text-lg">
              {t("hero.subtitle")}
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(input);
            }}
            className="mt-8"
          >
            <div className="flex items-end gap-2 rounded-2xl bg-card ring-1 ring-border/60 focus-within:ring-primary/40 p-2 shadow-[var(--shadow-elegant)]">
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
                rows={2}
                placeholder="e.g. English-speaking food guide for two days, mid-range budget…"
                className="flex-1 resize-none bg-transparent px-3 py-2 text-base outline-none max-h-48"
                disabled={submitting}
              />
              <button
                type="button"
                onClick={toggleMic}
                disabled={submitting}
                className={`h-10 w-10 shrink-0 inline-flex items-center justify-center rounded-xl ring-1 ring-border/60 hover:bg-secondary transition-colors ${listening ? "bg-destructive text-destructive-foreground animate-pulse" : "bg-background text-muted-foreground"}`}
                aria-label={listening ? "Stop voice input" : "Start voice input"}
              >
                <Mic className="h-4 w-4" />
              </button>
              <button
                type="submit"
                disabled={submitting || !input.trim()}
                className="h-10 w-10 shrink-0 inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40 hover:opacity-90"
                aria-label="Send"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            </div>
          </form>

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => submit(s)}
                disabled={submitting}
                className="rounded-full bg-secondary/60 hover:bg-secondary px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {s}
              </button>
            ))}
          </div>

          <p className="mt-8 text-center text-sm">
            <Link to="/guides" className="text-muted-foreground hover:text-foreground underline underline-offset-4">
              {t("hero.browse")}
            </Link>
          </p>

          <div className="mt-5 flex flex-col items-center justify-center gap-2">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{t("common.findUs")}</span>
            <div className="flex items-center gap-3">
              <a
                href="https://wa.me/1234567890"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Chat on WhatsApp"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 transition-colors"
              >
                <WhatsAppIcon className="h-5 w-5" />
              </a>
              <a
                href="https://t.me/yourtelegram"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Join Telegram"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#229ED9]/10 text-[#229ED9] hover:bg-[#229ED9]/20 transition-colors"
              >
                <TelegramIcon className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

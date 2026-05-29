import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, Mic, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { supabase } from "@/integrations/supabase/client";
import { createThread } from "@/lib/ai-threads.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hamroh — Find your local guide with AI" },
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
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

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
              Find your local guide
            </h1>
            <p className="mt-3 text-muted-foreground text-base md:text-lg">
              Describe the trip you want. Hamroh AI matches you with a verified local guide.
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
              Prefer to browse? Find a guide manually →
            </Link>
          </p>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

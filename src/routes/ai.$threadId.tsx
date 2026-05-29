import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getThreadMessages } from "@/lib/ai-threads.functions";
import { guides, type Guide } from "@/data/guides";
import { Sparkles, ArrowUp, Star, BadgeCheck, Zap, MapPin } from "lucide-react";

export const Route = createFileRoute("/ai/$threadId")({
  component: ThreadPage,
});

const SUGGESTIONS = [
  "Korean-speaking guide in Tashkent for food tours",
  "Photography tour in Samarkand at sunset",
  "Family-friendly history guide in Bukhara",
  "Half-day artisan workshop with English-speaking guide",
];

function ThreadPage() {
  const { threadId } = useParams({ from: "/ai/$threadId" });
  const get = useServerFn(getThreadMessages);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setToken(data.session?.access_token ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setToken(s?.access_token ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const history = useQuery({
    queryKey: ["ai-messages", threadId],
    queryFn: () => get({ data: { threadId } }),
  });

  if (history.isLoading || !token) {
    return <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  }

  return <ChatWindow key={threadId} threadId={threadId} initial={history.data ?? []} token={token} />;
}

function ChatWindow({ threadId, initial, token }: { threadId: string; initial: { id: string; role: "user" | "assistant" | "system"; parts: Array<{ type: string; text?: string }> }[]; token: string }) {
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        headers: { Authorization: `Bearer ${token}` },
        body: { threadId },
      }),
    [token, threadId],
  );

  const initialMessages = useMemo<UIMessage[]>(
    () =>
      initial.map((m) => ({
        id: m.id,
        role: m.role,
        parts: (m.parts ?? []) as UIMessage["parts"],
      })),
    [initial],
  );

  const { messages, sendMessage, status } = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
  });

  const [input, setInput] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    taRef.current?.focus();
  }, [threadId]);

  useEffect(() => {
    const key = `initialPrompt:${threadId}`;
    const pending = typeof window !== "undefined" ? sessionStorage.getItem(key) : null;
    if (pending && initial.length === 0) {
      sessionStorage.removeItem(key);
      sendMessage({ text: pending });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);


  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  const submit = async (text: string) => {
    const t = text.trim();
    if (!t) return;
    setInput("");
    await sendMessage({ text: t });
    requestAnimationFrame(() => taRef.current?.focus());
  };

  const isLoading = status === "submitted" || status === "streaming";
  const isEmpty = messages.length === 0;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
          {isEmpty ? (
            <div className="text-center py-12">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-primary-foreground mb-6 shadow-[var(--shadow-elegant)]">
                <Sparkles className="h-7 w-7" />
              </div>
              <h1 className="font-display text-3xl md:text-4xl font-semibold">Find your perfect guide</h1>
              <p className="mt-3 text-muted-foreground">Describe the trip you want — language, city, vibe, budget.</p>
              <div className="mt-8 grid gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => submit(s)}
                    className="text-left rounded-2xl bg-card ring-1 ring-border/60 p-4 text-sm hover:ring-primary/40 hover:bg-secondary/60 transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((m) => (
                <MessageBubble key={m.id} message={m} />
              ))}
              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse" />
                  Thinking…
                </div>
              )}
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      <div className="border-t border-border/60 bg-background/80 backdrop-blur">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(input);
          }}
          className="max-w-3xl mx-auto px-4 py-4"
        >
          <div className="flex items-end gap-2 rounded-2xl bg-card ring-1 ring-border/60 focus-within:ring-primary/40 p-2 shadow-[var(--shadow-card)]">
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
              placeholder="Ask about guides, cities, languages…"
              className="flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none max-h-40"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40 hover:opacity-90"
              aria-label="Send"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground text-center">Hamroh AI · Recommendations from our verified guide catalog</p>
        </form>
      </div>
    </div>
  );
}

const GUIDES_LINE = /^GUIDES:\s*([a-z0-9-,\s]+)$/im;

function extractGuides(text: string): { clean: string; ids: string[] } {
  const m = text.match(GUIDES_LINE);
  if (!m) return { clean: text, ids: [] };
  const ids = m[1].split(",").map((s) => s.trim()).filter(Boolean);
  const clean = text.replace(GUIDES_LINE, "").trim();
  return { clean, ids };
}

function renderMarkdown(text: string) {
  // light formatting: bold, line breaks, bullets
  const lines = text.split("\n");
  return lines.map((line, i) => {
    const bolded = line.split(/(\*\*[^*]+\*\*)/g).map((seg, j) =>
      seg.startsWith("**") && seg.endsWith("**") ? <strong key={j}>{seg.slice(2, -2)}</strong> : <span key={j}>{seg}</span>,
    );
    if (/^\s*[-*]\s+/.test(line)) {
      return (
        <li key={i} className="ml-5 list-disc">
          {bolded}
        </li>
      );
    }
    return (
      <p key={i} className={line.trim() === "" ? "h-2" : "leading-relaxed"}>
        {bolded}
      </p>
    );
  });
}

function MessageBubble({ message }: { message: UIMessage }) {
  const text = message.parts
    .map((p) => (p.type === "text" ? (p as { type: "text"; text: string }).text : ""))
    .join("");

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl bg-primary text-primary-foreground px-4 py-2.5 text-sm">
          {text}
        </div>
      </div>
    );
  }

  const { clean, ids } = extractGuides(text);
  const recommended: Guide[] = ids.map((id) => guides.find((g) => g.id === id)).filter((g): g is Guide => !!g);

  return (
    <div className="space-y-3">
      <div className="text-[15px] text-foreground space-y-2">{renderMarkdown(clean)}</div>
      {recommended.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 pt-2">
          {recommended.map((g) => (
            <Link
              key={g.id}
              to="/guides/$guideId"
              params={{ guideId: g.id }}
              className="group rounded-2xl bg-card ring-1 ring-border/60 hover:ring-primary/40 overflow-hidden transition-all"
            >
              <div className="aspect-[16/10] overflow-hidden">
                <img src={g.photo} alt={g.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-medium truncate">{g.name}</h4>
                  <span className="inline-flex items-center gap-1 text-xs"><Star className="h-3 w-3 fill-accent text-accent" /> {g.rating}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground truncate">{g.tagline}</p>
                <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-secondary px-2 py-0.5"><MapPin className="h-3 w-3" />{g.city}</span>
                  {g.verified && <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 text-primary px-2 py-0.5"><BadgeCheck className="h-3 w-3" />Verified</span>}
                  {g.instantBook && <span className="inline-flex items-center gap-0.5 rounded-full bg-accent/15 text-accent px-2 py-0.5"><Zap className="h-3 w-3" />Instant</span>}
                  <span className="ml-auto font-semibold text-foreground">${g.pricePerDay}/day</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

import { createFileRoute, useParams, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getThreadMessages } from "@/lib/ai-threads.functions";
import { useGuides, useCities, useTours } from "@/lib/content-queries";
import { TourCard } from "@/components/TourCard";

import { parseSearchQuery } from "@/lib/parse-query";
import { useI18n } from "@/lib/i18n";
import type { Guide } from "@/data/guides";
import { Sparkles, ArrowUp, Star, BadgeCheck, Zap, MapPin } from "lucide-react";
import { ModeSwitcher } from "@/components/SearchModeSwitcher";

export const Route = createFileRoute("/ai/$threadId")({
  component: ThreadPage,
});

const SUGGESTION_KEYS = [
  "ai.suggestion.1",
  "ai.suggestion.2",
  "ai.suggestion.3",
  "ai.suggestion.4",
] as const;

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
    return <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">…</div>;
  }

  return <ChatWindow key={threadId} threadId={threadId} initial={history.data ?? []} token={token} />;
}

function ChatWindow({ threadId, initial, token }: { threadId: string; initial: { id: string; role: "user" | "assistant" | "system"; parts: Array<{ type: string; text?: string }> }[]; token: string }) {
  const { lang } = useI18n();
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        headers: { Authorization: `Bearer ${token}` },
        body: { threadId, lang },
      }),
    [token, threadId, lang],
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

  const { t } = useI18n();
  const navigate = useNavigate();

  const { data: cities = [] } = useCities();

  const goManual = () => {
    const userTexts = messages
      .filter((m) => m.role === "user")
      .map((m) =>
        m.parts.map((p) => (p.type === "text" ? (p as { type: "text"; text: string }).text : "")).join(""),
      );
    const combined = userTexts.join(" ").trim();
    const parsed = parseSearchQuery(combined, cities.map((c) => c.name));
    const search: Record<string, string> = {};
    if (combined) search.q = combined;
    if (parsed.city) search.city = parsed.city;
    if (parsed.from) search.from = parsed.from;
    if (parsed.to) search.to = parsed.to;
    navigate({ to: "/search", search });
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="sticky top-0 z-10 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="max-w-3xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          <ModeSwitcher
            active="ai"
            onAi={() => {}}
            onManual={goManual}
            aiLabel={t("search.mode.ai")}
            manualLabel={t("search.mode.manual")}
          />
          <p className="hidden md:block text-xs text-muted-foreground truncate">{t("search.mode.hint")}</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">

          {isEmpty ? (
            <div className="text-center py-12">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-primary-foreground mb-6 shadow-[var(--shadow-elegant)]">
                <Sparkles className="h-7 w-7" />
              </div>
              <h1 className="font-display text-3xl md:text-4xl font-semibold">{t("ai.findGuide")}</h1>
              <p className="mt-3 text-muted-foreground">{t("ai.describeTrip")}</p>
              <div className="mt-8 grid gap-2 sm:grid-cols-2">
                {SUGGESTION_KEYS.map((key) => {
                  const label = t(key);
                  return (
                    <button
                      key={key}
                      onClick={() => submit(label)}
                      className="text-left rounded-2xl bg-card ring-1 ring-border/60 p-4 text-sm hover:ring-primary/40 hover:bg-secondary/60 transition-all"
                    >
                      {label}
                    </button>
                  );
                })}
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
const TOURS_LINE = /^TOURS:\s*([a-z0-9-,\s]+)$/im;
const PLACES_LINE = /^PLACES:\s*([a-z0-9-,\s]+)$/im;

function extractRecs(text: string): { clean: string; guideIds: string[]; tourSlugs: string[] } {
  const pick = (re: RegExp) => {
    const m = text.match(re);
    return m ? m[1].split(",").map((s) => s.trim()).filter(Boolean) : [];
  };
  const guideIds = pick(GUIDES_LINE);
  const tourSlugs = pick(TOURS_LINE);
  // strip PLACES line if any leftover (places are now linked inline as Google Maps URLs)
  const clean = text.replace(GUIDES_LINE, "").replace(TOURS_LINE, "").replace(PLACES_LINE, "").trim();
  return { clean, guideIds, tourSlugs };
}


function renderInline(text: string, keyPrefix: string) {
  // Tokenize markdown links [label](url) and **bold** in one pass.
  const tokens: Array<{ type: "text" | "bold" | "link"; text: string; href?: string }> = [];
  const re = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) tokens.push({ type: "text", text: text.slice(last, m.index) });
    if (m[1] && m[2]) tokens.push({ type: "link", text: m[1], href: m[2] });
    else if (m[3]) tokens.push({ type: "bold", text: m[3] });
    last = m.index + m[0].length;
  }
  if (last < text.length) tokens.push({ type: "text", text: text.slice(last) });
  return tokens.map((tok, j) => {
    if (tok.type === "bold") return <strong key={`${keyPrefix}-${j}`}>{tok.text}</strong>;
    if (tok.type === "link") {
      const external = tok.href!.startsWith("http");
      return (
        <a
          key={`${keyPrefix}-${j}`}
          href={tok.href}
          target={external ? "_blank" : undefined}
          rel={external ? "noopener noreferrer" : undefined}
          className="text-primary underline underline-offset-2 hover:text-primary/80"
        >
          {tok.text}
        </a>
      );
    }
    return <span key={`${keyPrefix}-${j}`}>{tok.text}</span>;
  });
}

function renderMarkdown(text: string) {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    const inline = renderInline(line.replace(/^\s*[-*]\s+/, ""), `i${i}`);
    if (/^\s*[-*]\s+/.test(line)) {
      return <li key={i} className="ml-5 list-disc">{inline}</li>;
    }
    return (
      <p key={i} className={line.trim() === "" ? "h-2" : "leading-relaxed"}>
        {renderInline(line, `i${i}`)}
      </p>
    );
  });
}

function MessageBubble({ message }: { message: UIMessage }) {
  const { data: guides = [] } = useGuides();
  const { data: tours = [] } = useTours();
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

  const { clean, guideIds, tourSlugs } = extractRecs(text);
  const recGuides: Guide[] = guideIds.map((id) => guides.find((g) => g.id === id)).filter((g): g is Guide => !!g);
  const recTours = tourSlugs.map((s) => tours.find((t) => t.slug === s)).filter((t): t is NonNullable<typeof t> => !!t);

  return (
    <div className="space-y-3">
      <div className="text-[15px] text-foreground space-y-2">{renderMarkdown(clean)}</div>
      {recGuides.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 pt-2">
          {recGuides.map((g) => (
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
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
      {recTours.length > 0 && (
        <div className="grid gap-3 grid-cols-2 pt-2">
          {recTours.map((t) => <TourCard key={t.id} tour={t} />)}
        </div>
      )}
    </div>
  );
}


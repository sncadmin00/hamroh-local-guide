import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, ArrowUp, Loader2, Wrench, Trash2, Mic, MicOff } from "lucide-react";
import ReactMarkdown from "react-markdown";

const STORAGE_KEY = "guide-ai-history-v1";

export function GuideAIPanel() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setToken(data.session?.access_token ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setToken(s?.access_token ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!token) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading assistant…
      </div>
    );
  }

  return <AIChat token={token} />;
}

function AIChat({ token }: { token: string }) {
  const initialMessages = useMemo<UIMessage[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as UIMessage[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, []);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/guide-ai",
        headers: { Authorization: `Bearer ${token}` },
      }),
    [token],
  );

  const { messages, sendMessage, status, setMessages } = useChat({
    id: "guide-ai-single",
    messages: initialMessages,
    transport,
  });

  const [input, setInput] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Persist messages to localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // ignore
    }
  }, [messages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  useEffect(() => {
    taRef.current?.focus();
  }, []);

  const submit = async () => {
    const t = input.trim();
    if (!t || status === "submitted" || status === "streaming") return;
    setInput("");
    await sendMessage({ text: t });
    requestAnimationFrame(() => taRef.current?.focus());
  };

  const clear = () => {
    setMessages([]);
    if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY);
  };

  const isBusy = status === "submitted" || status === "streaming";

  const suggestions = [
    "Что у меня сегодня?",
    "Заблокируй завтра с 14:00 до 18:00 — личное",
    "Напомни в пятницу 09:00 встретить туристов в аэропорту",
    "Сколько я заработал в этом месяце?",
  ];

  return (
    <div className="flex flex-col h-[calc(100dvh-180px)] min-h-[500px]">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Hamroh AI</h3>
          <span className="text-xs text-muted-foreground">— твой ассистент</span>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clear}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <Trash2 className="h-3 w-3" /> Очистить
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto rounded-lg border bg-muted/20 p-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Sparkles className="h-8 w-8 text-primary mx-auto mb-3" />
            <p className="text-sm font-medium mb-1">Чем могу помочь?</p>
            <p className="text-xs text-muted-foreground mb-4">
              Управляй календарём, напоминаниями и доходом голосом или текстом.
            </p>
            <div className="grid gap-2 max-w-md mx-auto">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setInput(s);
                    requestAnimationFrame(() => taRef.current?.focus());
                  }}
                  className="text-left text-xs px-3 py-2 rounded-md border bg-background hover:bg-muted transition"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}

        {isBusy && (
          <div className="text-xs text-muted-foreground flex items-center gap-2 px-2">
            <Loader2 className="h-3 w-3 animate-spin" /> Думаю…
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="mt-3 flex items-end gap-2"
      >
        <textarea
          ref={taRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          rows={1}
          placeholder="Напиши сообщение…"
          className="flex-1 resize-none rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px] max-h-32"
          disabled={isBusy}
        />
        <button
          type="submit"
          disabled={!input.trim() || isBusy}
          className="h-11 w-11 flex items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-40"
          aria-label="Send"
        >
          {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );
}

function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  const textParts = message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
  const toolParts = message.parts.filter((p) => p.type.startsWith("tool-")) as Array<{
    type: string;
    toolName?: string;
    state?: string;
    input?: unknown;
    output?: unknown;
  }>;

  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div
        className={
          isUser
            ? "max-w-[85%] rounded-2xl bg-primary text-primary-foreground px-3 py-2 text-sm"
            : "max-w-[90%] text-sm space-y-2"
        }
      >
        {toolParts.length > 0 && (
          <div className="space-y-1">
            {toolParts.map((tp, i) => (
              <details key={i} className="rounded-md border bg-background/60 px-2 py-1 text-xs">
                <summary className="cursor-pointer flex items-center gap-1 text-muted-foreground">
                  <Wrench className="h-3 w-3" />
                  {tp.type.replace(/^tool-/, "")}{" "}
                  <span className="ml-1 opacity-60">{tp.state ?? ""}</span>
                </summary>
                {tp.input != null && (
                  <pre className="mt-1 overflow-x-auto text-[10px] text-muted-foreground">
                    {JSON.stringify(tp.input, null, 2)}
                  </pre>
                )}
                {tp.output != null && (
                  <pre className="mt-1 overflow-x-auto text-[10px] text-muted-foreground">
                    {JSON.stringify(tp.output, null, 2)}
                  </pre>
                )}
              </details>
            ))}
          </div>
        )}
        {textParts && (
          <div className={isUser ? "" : "prose prose-sm dark:prose-invert max-w-none"}>
            {isUser ? textParts : <ReactMarkdown>{textParts}</ReactMarkdown>}
          </div>
        )}
      </div>
    </div>
  );
}

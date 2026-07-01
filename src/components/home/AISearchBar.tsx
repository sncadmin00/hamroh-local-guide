import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const CHIPS = [
  { emoji: "🏛️", label: "Ancient cities" },
  { emoji: "📸", label: "Photo tour" },
  { emoji: "👨‍👩‍👧", label: "With kids" },
  { emoji: "🍽️", label: "Gastro" },
  { emoji: "🌅", label: "Sunset" },
  { emoji: "🚌", label: "With transport" },
];

export function AISearchBar() {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const go = (query: string) => {
    if (!query.trim()) return;
    setBusy(true);
    setTimeout(() => {
      navigate({ to: "/ai", search: { q: query } as never }).catch(() => navigate({ to: "/ai" }));
      setBusy(false);
    }, 250);
  };

  return (
    <section className="max-w-[1280px] mx-auto px-4 md:px-8 pt-5">
      <form
        onSubmit={(e) => { e.preventDefault(); go(q); }}
        className="flex items-center gap-2 rounded-full pl-5 pr-2 py-2"
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          boxShadow: "0 4px 20px color-mix(in srgb, var(--foreground) 6%, transparent)",
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("home.aiPlaceholder") || "I want a tour with kids in Bukhara…"}
          className="flex-1 bg-transparent outline-none text-sm md:text-base py-1"
          style={{ color: "var(--foreground)" }}
        />
        <button
          type="submit"
          disabled={busy}
          aria-label="Ask AI"
          className="h-10 w-10 rounded-full inline-flex items-center justify-center shrink-0 transition-transform hover:scale-105"
          style={{ background: "#C9A84C", color: "#fff", opacity: busy ? 0.7 : 1 }}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="text-lg">✦</span>}
        </button>
      </form>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto pt-3 pb-1 scrollbar-none" style={{ scrollbarWidth: "none" }}>
        {CHIPS.map((c) => (
          <button
            key={c.label}
            onClick={() => go(c.label)}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all hover:-translate-y-0.5"
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
            }}
          >
            <span>{c.emoji}</span>
            <span>{c.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

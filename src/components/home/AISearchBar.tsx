import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Sparkles, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function AISearchBar() {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    setBusy(true);
    // small delay to show AI-processing state, then route to AI chat
    setTimeout(() => {
      navigate({ to: "/ai", search: { q } as never }).catch(() => navigate({ to: "/ai" }));
      setBusy(false);
    }, 350);
  };

  return (
    <section className="max-w-[1280px] mx-auto px-4 md:px-8 pt-5">
      <form
        onSubmit={submit}
        className="flex items-center gap-2 rounded-full px-4 py-2.5"
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        }}
      >
        <Sparkles className="h-5 w-5 shrink-0" style={{ color: "#1F9BB4" }} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("home.aiPlaceholder") || "Ask Hamroh AI: 3 days in Samarkand, food & culture…"}
          className="flex-1 bg-transparent outline-none text-sm md:text-base"
          style={{ color: "var(--foreground)" }}
        />
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold shrink-0"
          style={{ background: "#1F9BB4", color: "#fff", opacity: busy ? 0.7 : 1 }}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : (t("common.search") || "Ask")}
        </button>
      </form>
    </section>
  );
}

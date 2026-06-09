import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { MapPin, Calendar, Users, Search } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { createThread } from "@/lib/ai-threads.functions";
import { supabase } from "@/integrations/supabase/client";
import heroImg from "@/assets/hero-samarkand.jpg";

export function HeroSearch() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const create = useServerFn(createThread);

  const [where, setWhere] = useState("");
  const [when, setWhen] = useState("");
  const [guests, setGuests] = useState<number | "">("");
  const [submitting, setSubmitting] = useState(false);

  const buildPrompt = () => {
    const parts: string[] = [];
    const langName = lang === "ru" ? "русскоговорящего" : lang === "uz" ? "o'zbek tilida" : "English-speaking";
    if (lang === "ru") {
      parts.push(`Ищу ${langName} местного гида`);
      if (where) parts.push(`в городе ${where}`);
      if (when) parts.push(`на ${when}`);
      if (guests) parts.push(`для ${guests} ${guests === 1 ? "гостя" : "гостей"}`);
    } else if (lang === "uz") {
      parts.push(`Mahalliy ${langName} hamroh kerak`);
      if (where) parts.push(`${where} shahrida`);
      if (when) parts.push(`${when} sanasida`);
      if (guests) parts.push(`${guests} mehmon uchun`);
    } else {
      parts.push(`Looking for a ${langName} local guide`);
      if (where) parts.push(`in ${where}`);
      if (when) parts.push(`on ${when}`);
      if (guests) parts.push(`for ${guests} ${guests === 1 ? "guest" : "guests"}`);
    }
    return parts.join(" ") + ".";
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const prompt = buildPrompt();
    setSubmitting(true);
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        sessionStorage.setItem("pendingAiPrompt", prompt);
        navigate({ to: "/login" });
        return;
      }
      const thread = await create();
      if (thread?.id) {
        sessionStorage.setItem(`initialPrompt:${thread.id}`, prompt);
        navigate({ to: "/ai/$threadId", params: { threadId: thread.id } });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const todayISO = new Date().toISOString().slice(0, 10);

  return (
    <section className="relative overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0 -z-10">
        <img
          src={heroImg}
          alt="Samarkand Registan at sunset"
          className="h-full w-full object-cover"
          loading="eager"
        />
        {/* Cream gradient overlay — fades image into background on the left for text legibility */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, var(--background) 0%, var(--background) 28%, color-mix(in oklab, var(--background) 70%, transparent) 50%, transparent 75%)",
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-32 md:h-40"
          style={{
            background:
              "linear-gradient(180deg, transparent 0%, var(--background) 100%)",
          }}
        />
      </div>

      <div className="max-w-6xl mx-auto px-6 pt-12 pb-20 md:pt-20 md:pb-28">
        <div className="max-w-2xl">


          {/* Search pill */}
          <form
            onSubmit={onSubmit}
            className="mt-8 md:mt-10 bg-card border border-border rounded-2xl md:rounded-full shadow-[var(--shadow-card)] p-2 flex flex-col md:flex-row items-stretch gap-2"
          >
            {/* Where */}
            <label className="group flex-1 flex items-center gap-3 px-4 py-3 rounded-xl md:rounded-full hover:bg-muted/60 transition-colors cursor-text">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                type="text"
                value={where}
                onChange={(e) => setWhere(e.target.value)}
                placeholder={t("hero.search.where")}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none min-w-0"
              />
            </label>

            <div className="hidden md:block w-px bg-border my-2" />

            {/* When */}
            <label className="group flex-1 flex items-center gap-3 px-4 py-3 rounded-xl md:rounded-full hover:bg-muted/60 transition-colors cursor-text">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                type="date"
                value={when}
                min={todayISO}
                onChange={(e) => setWhen(e.target.value)}
                placeholder={t("hero.search.when")}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none min-w-0"
              />
            </label>

            <div className="hidden md:block w-px bg-border my-2" />

            {/* Guests */}
            <label className="group flex items-center gap-3 px-4 py-3 rounded-xl md:rounded-full hover:bg-muted/60 transition-colors cursor-text md:w-40">
              <Users className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                type="number"
                min={1}
                max={20}
                value={guests}
                onChange={(e) => setGuests(e.target.value ? Number(e.target.value) : "")}
                placeholder={t("hero.search.guests")}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none min-w-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl md:rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              <Search className="h-4 w-4" />
              {t("hero.search.button")}
            </button>
          </form>

          <p className="mt-3 text-xs text-muted-foreground/80">
            {t("hero.search.aiHint")}
          </p>
        </div>
      </div>
    </section>
  );
}

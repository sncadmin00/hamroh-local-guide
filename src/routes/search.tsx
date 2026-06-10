import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Calendar, Users } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { GuideCard } from "@/components/GuideCard";
import { CityPicker } from "@/components/CityPicker";
import { CategoryIcon } from "@/components/CategoryIcon";
import { ModeSwitcher } from "@/components/SearchModeSwitcher";
import { useGuides, useCategories, useTours, useCities } from "@/lib/content-queries";
import { TourCard } from "@/components/TourCard";

import { useI18n } from "@/lib/i18n";
import { createThread } from "@/lib/ai-threads.functions";
import { supabase } from "@/integrations/supabase/client";

type SearchParams = {
  q?: string;
  city?: string;
  category?: string;
  lang?: string;
  from?: string;
  to?: string;
  guests?: number;
  instant?: boolean;
};

export const Route = createFileRoute("/search")({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    q: typeof search.q === "string" ? search.q : undefined,
    city: typeof search.city === "string" ? search.city : undefined,
    category: typeof search.category === "string" ? search.category : undefined,
    lang: typeof search.lang === "string" ? search.lang : undefined,
    from: typeof search.from === "string" ? search.from : undefined,
    to: typeof search.to === "string" ? search.to : undefined,
    guests: typeof search.guests === "number" ? search.guests : undefined,
    instant: typeof search.instant === "boolean" ? search.instant : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Search guides — Hamroh" },
      { name: "description", content: "Search verified local guides by city, dates, categories and language." },
      { property: "og:title", content: "Search guides — Hamroh" },
      { property: "og:description", content: "Find the perfect local guide for your trip." },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { t, tCategory, tLanguage } = useI18n();
  const navigate = useNavigate({ from: "/search" });
  const create = useServerFn(createThread);
  const params = Route.useSearch();

  const { data: guides = [], isLoading } = useGuides();
  const { data: categories = [] } = useCategories();
  const { data: tours = [] } = useTours();
  const { data: places = [] } = usePlaces();
  const { data: cities = [] } = useCities();

  const [askingAi, setAskingAi] = useState(false);


  const city = params.city ?? "All";
  const category = params.category ?? "All";
  const lang = params.lang ?? "All";
  const instant = params.instant ?? false;
  const from = params.from ?? "";
  const to = params.to ?? "";
  const guests = params.guests ?? 0;
  const q = params.q ?? "";

  const todayISO = new Date().toISOString().slice(0, 10);
  const allLangs = Array.from(new Set(guides.flatMap((g) => g.languages))).sort();

  const update = (next: Partial<SearchParams>) => {
    navigate({
      search: (prev: SearchParams) => {
        const merged: Record<string, unknown> = { ...prev, ...next };
        for (const k of Object.keys(merged)) {
          const v = merged[k];
          if (v === undefined || v === "" || v === "All" || v === false || v === 0) delete merged[k];
        }
        return merged as SearchParams;
      },
    });
  };

  const filtered = guides.filter(
    (g) =>
      (city === "All" || g.city === city) &&
      (lang === "All" || g.languages.includes(lang)) &&
      (!instant || g.instantBook) &&
      (category === "All" || g.categories.some((c) => c.slug === category)),
  );

  const buildAiPrompt = () => {
    const parts: string[] = [];
    if (q) parts.push(q);
    if (city !== "All") parts.push(`City: ${city}.`);
    if (category !== "All") parts.push(`Category: ${category}.`);
    if (lang !== "All") parts.push(`Language: ${lang}.`);
    if (from && to) parts.push(`Dates: ${from} to ${to}.`);
    else if (from) parts.push(`From ${from}.`);
    else if (to) parts.push(`Until ${to}.`);
    if (guests > 0) parts.push(`Guests: ${guests}.`);
    if (instant) parts.push("Instant booking preferred.");
    const text = parts.join(" ").trim();
    return text || "Looking for a local guide.";
  };

  const askAi = async () => {
    if (askingAi) return;
    setAskingAi(true);
    try {
      const prompt = buildAiPrompt();
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
      setAskingAi(false);
    }
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <section className="border-b border-border/60 bg-secondary/30">
        <div className="container mx-auto px-4 py-10 md:py-12">

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <ModeSwitcher
              active="manual"
              onAi={askAi}
              onManual={() => {}}
              aiLabel={t("search.mode.ai")}
              manualLabel={t("search.mode.manual")}
            />
            {q && (
              <div className="text-sm text-muted-foreground break-words sm:text-right sm:max-w-md">
                <span className="font-medium text-foreground">{t("search.yourRequest")}:</span> {q}
              </div>
            )}
          </div>
          {askingAi && (
            <p className="mt-2 text-xs text-muted-foreground">…</p>
          )}
        </div>
      </section>

      <section className="container mx-auto px-4 py-8">
        {/* Filters */}
        <div className="flex flex-col gap-4 rounded-2xl bg-card p-4 ring-1 ring-border/60 shadow-[var(--shadow-card)] md:p-5">
          <div className="flex flex-wrap items-center gap-3">
            <CityPicker value={city} onChange={(v) => update({ city: v === "All" ? undefined : v })} />

            {/* Dates */}
            <label className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 h-10 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <input
                type="date"
                value={from}
                min={todayISO}
                onChange={(e) => {
                  const v = e.target.value;
                  update({ from: v || undefined, to: to && v && to < v ? v : to || undefined });
                }}
                aria-label={t("hero.search.from")}
                className="bg-transparent text-sm outline-none"
              />
              <span className="text-muted-foreground">—</span>
              <input
                type="date"
                value={to}
                min={from || todayISO}
                onChange={(e) => update({ to: e.target.value || undefined })}
                aria-label={t("hero.search.to")}
                className="bg-transparent text-sm outline-none"
              />
            </label>

            {/* Guests */}
            <label className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 h-10 text-sm font-medium">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>{t("search.filters.guests")}</span>
              <input
                type="number"
                min={0}
                max={50}
                value={guests || ""}
                onChange={(e) => update({ guests: Number(e.target.value) || undefined })}
                className="w-12 bg-transparent text-sm outline-none"
                placeholder="0"
              />
            </label>

            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-secondary px-4 h-10 text-sm font-medium md:ml-auto">
              <input
                type="checkbox"
                checked={instant}
                onChange={(e) => update({ instant: e.target.checked || undefined })}
                className="accent-primary"
              />
              {t("search.filters.instant")}
            </label>
          </div>
        </div>

        {/* Categories */}
        {categories.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => update({ category: undefined })}
              className={`inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-sm font-medium ring-1 transition ${
                category === "All"
                  ? "bg-primary text-primary-foreground ring-primary"
                  : "bg-card ring-border/60 text-muted-foreground hover:bg-secondary/60"
              }`}
            >
              {t("search.filters.allCategories")}
            </button>
            {categories.map((c) => {
              const on = category === c.slug;
              return (
                <button
                  key={c.id}
                  onClick={() => update({ category: c.slug })}
                  className={`inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-sm font-medium ring-1 transition ${
                    on
                      ? "bg-primary text-primary-foreground ring-primary"
                      : "bg-card ring-border/60 text-muted-foreground hover:bg-secondary/60"
                  }`}
                >
                  <CategoryIcon name={c.icon} className="h-4 w-4" />
                  {tCategory(c.slug, c.name)}
                </button>
              );
            })}
          </div>
        )}

        {/* Languages */}
        {allLangs.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              onClick={() => update({ lang: undefined })}
              className={`inline-flex items-center h-9 px-4 rounded-full text-sm font-medium ring-1 transition ${
                lang === "All"
                  ? "bg-primary text-primary-foreground ring-primary"
                  : "bg-card ring-border/60 text-muted-foreground hover:bg-secondary/60"
              }`}
            >
              {t("search.filters.allLanguages")}
            </button>
            {allLangs.map((l) => (
              <button
                key={l}
                onClick={() => update({ lang: l })}
                className={`inline-flex items-center h-9 px-4 rounded-full text-sm font-medium ring-1 transition ${
                  lang === l
                    ? "bg-primary text-primary-foreground ring-primary"
                    : "bg-card ring-border/60 text-muted-foreground hover:bg-secondary/60"
                }`}
              >
                {tLanguage(l)}
              </button>
            ))}
          </div>
        )}

        {/* Guides */}
        <h2 className="mt-10 mb-4 font-display text-xl font-semibold">{t("nav.guides")}</h2>
        {isLoading ? (
          <div className="text-center text-muted-foreground py-8">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">{t("search.noResults")}</div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((g) => <GuideCard key={g.id} guide={g} />)}
          </div>
        )}

        {/* Tours */}
        {(() => {
          const citySlug = city === "All" ? null : cities.find((c) => c.name === city)?.slug ?? null;
          const filteredTours = tours.filter((tr) => {
            if (citySlug && tr.cities?.slug !== citySlug) return false;
            if (category !== "All" && !tr.tour_categories?.some((tc) => tc.categories?.slug === category)) return false;
            if (lang !== "All" && !(tr.languages ?? []).includes(lang)) return false;
            return true;
          });
          if (filteredTours.length === 0) return null;
          return (
            <>
              <h2 className="mt-12 mb-4 font-display text-xl font-semibold">{t("nav.tours")}</h2>
              <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                {filteredTours.map((tr) => <TourCard key={tr.id} tour={tr} />)}
              </div>
            </>
          );
        })()}

        {/* Places */}
        {(() => {
          const filteredPlaces = places.filter((p) => city === "All" || p.cityName === city);
          if (filteredPlaces.length === 0) return null;
          return (
            <>
              <h2 className="mt-12 mb-4 font-display text-xl font-semibold">{t("search.places") || "Places"}</h2>
              <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                {filteredPlaces.map((p) => <PlaceCard key={p.id} place={p} />)}
              </div>
            </>
          );
        })()}

      </section>

      <SiteFooter />
    </div>
  );
}

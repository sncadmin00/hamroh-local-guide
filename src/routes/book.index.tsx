import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Clock, Compass, Globe2, MapPin, Sparkles, X } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { GuideCard } from "@/components/GuideCard";
import { CategoryIcon } from "@/components/CategoryIcon";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useCategories, useCities, useGuides, useTours } from "@/lib/content-queries";
import { useDetectedLocation } from "@/hooks/useDetectedLocation";
import { nearestCityNames } from "@/data/cities";
import { useI18n } from "@/lib/i18n";

type Tab = "all" | "guides" | "tours";

export const Route = createFileRoute("/book/")({
  validateSearch: (s: Record<string, unknown>): { country?: string; city?: string; category?: string; tab?: Tab } => ({
    country: typeof s.country === "string" ? s.country : undefined,
    city: typeof s.city === "string" ? s.city : undefined,
    category: typeof s.category === "string" ? s.category : undefined,
    tab: s.tab === "guides" || s.tab === "tours" || s.tab === "all" ? s.tab : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Book an experience — Hamroh" },
      { name: "description", content: "Pick a country, city or interest and book a verified local guide or tour in seconds." },
      { property: "og:title", content: "Book an experience — Hamroh" },
      { property: "og:description", content: "Pick a country, city or interest and book a verified local guide or tour in seconds." },
    ],
  }),
  component: BookPage,
});

const PLACEHOLDER =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 3'><rect width='4' height='3' fill='%23e5e7eb'/></svg>";

// For now the platform operates in Uzbekistan only — but the wizard
// is structured so adding more countries later is a one-line change.
const COUNTRIES = [{ code: "uz", name: "Uzbekistan" }];

function BookPage() {
  const { t, tCategory } = useI18n();
  const navigate = useNavigate({ from: "/book" });
  const search = Route.useSearch();

  const { data: cities = [] } = useCities();
  const { data: categories = [] } = useCategories();
  const { data: guides = [], isLoading: gLoading } = useGuides();
  const { data: tours = [], isLoading: tLoading } = useTours();
  const { data: geo } = useDetectedLocation();

  const [country, setCountry] = useState<string>(search.country ?? "uz");
  const [citySlug, setCitySlug] = useState<string>(search.city ?? "");
  const [categorySlug, setCategorySlug] = useState<string>(search.category ?? "");
  const [tab, setTab] = useState<Tab>(search.tab ?? "all");
  const [autoApplied, setAutoApplied] = useState(false);

  // Auto-prefill city from IP geolocation (once, only if user has not picked one).
  useEffect(() => {
    if (autoApplied) return;
    if (citySlug) return;
    if (!geo || cities.length === 0) return;
    if (geo.lat == null || geo.lng == null) return;
    const [nearest] = nearestCityNames(cities, geo.lat, geo.lng, 1);
    if (!nearest) return;
    const match = cities.find((c) => c.name === nearest);
    if (match) {
      setCitySlug(match.slug);
      setAutoApplied(true);
    }
  }, [geo, cities, citySlug, autoApplied]);

  // Keep URL in sync.
  useEffect(() => {
    navigate({
      search: {
        country: country || undefined,
        city: citySlug || undefined,
        category: categorySlug || undefined,
        tab: tab === "all" ? undefined : tab,
      },
      replace: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country, citySlug, categorySlug, tab]);

  const cityName = useMemo(
    () => cities.find((c) => c.slug === citySlug)?.name ?? "",
    [cities, citySlug],
  );
  const categoryName = useMemo(
    () => categories.find((c) => c.slug === categorySlug),
    [categories, categorySlug],
  );

  const filteredGuides = useMemo(() => {
    return guides.filter((g) => {
      if (cityName && g.city !== cityName) return false;
      if (categorySlug && !g.categories.some((c) => c.slug === categorySlug)) return false;
      return true;
    });
  }, [guides, cityName, categorySlug]);

  const filteredTours = useMemo(() => {
    return tours.filter((tr) => {
      if (citySlug && tr.cities?.slug !== citySlug) return false;
      if (categorySlug && !(tr.tour_categories ?? []).some((tc) => tc.categories?.slug === categorySlug)) return false;
      return true;
    });
  }, [tours, citySlug, categorySlug]);

  const totalCount = filteredGuides.length + filteredTours.length;
  const loading = gLoading || tLoading;

  const showGuides = tab === "all" || tab === "guides";
  const showTours = tab === "all" || tab === "tours";

  const clearAll = () => {
    setCitySlug("");
    setCategorySlug("");
    setAutoApplied(true); // prevent auto re-fill after manual clear
  };

  const nearYouHint = autoApplied && citySlug && cityName ? cityName : null;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-8 md:py-12">
        {/* Title */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
            <Compass className="h-3.5 w-3.5" /> {t("book.eyebrow")}
          </div>
          <h1 className="mt-3 font-display text-3xl sm:text-4xl md:text-5xl font-semibold">
            {t("book.title")}
          </h1>
          <p className="mt-2 text-muted-foreground">{t("book.subtitle")}</p>
          {nearYouHint && (
            <p className="mt-2 text-xs text-muted-foreground">
              <MapPin className="inline h-3 w-3 mr-1" />
              {t("book.autoDetected")}: <span className="font-medium text-foreground">{nearYouHint}</span> ·{" "}
              <button onClick={clearAll} className="underline hover:text-foreground">
                {t("book.change")}
              </button>
            </p>
          )}
        </div>

        {/* 3 selector cards */}
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {/* Country */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="group flex items-center justify-between gap-3 rounded-2xl bg-card ring-1 ring-border/60 p-4 text-left hover:ring-primary/40 hover:shadow-sm transition">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 shrink-0 rounded-xl bg-[#62A1B1]/10 text-[#62A1B1] inline-flex items-center justify-center">
                    <Globe2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{t("book.country")}</div>
                    <div className="truncate font-semibold text-foreground">
                      {COUNTRIES.find((c) => c.code === country)?.name ?? t("book.anyCountry")}
                    </div>
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[260px] p-0" align="start">
              <Command>
                <CommandList>
                  <CommandGroup>
                    {COUNTRIES.map((c) => (
                      <CommandItem key={c.code} value={c.name} onSelect={() => setCountry(c.code)}>
                        {c.name}
                        {country === c.code && <Check className="ml-auto h-4 w-4" />}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* City */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="group flex items-center justify-between gap-3 rounded-2xl bg-card ring-1 ring-border/60 p-4 text-left hover:ring-primary/40 hover:shadow-sm transition">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 shrink-0 rounded-xl bg-[#D5A08D]/15 text-[#b87863] inline-flex items-center justify-center">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{t("book.city")}</div>
                    <div className="truncate font-semibold text-foreground">
                      {cityName || t("book.anyCity")}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {citySlug && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setCitySlug("");
                        setAutoApplied(true);
                      }}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"
                      aria-label="Clear city"
                    >
                      <X className="h-3.5 w-3.5" />
                    </span>
                  )}
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </div>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[260px] p-0" align="start">
              <Command>
                <CommandInput placeholder={t("book.searchCity")} />
                <CommandList>
                  <CommandEmpty>{t("book.noCity")}</CommandEmpty>
                  <CommandGroup>
                    <CommandItem value={t("book.anyCity")} onSelect={() => setCitySlug("")}>
                      {t("book.anyCity")}
                      {!citySlug && <Check className="ml-auto h-4 w-4" />}
                    </CommandItem>
                    {cities.map((c) => (
                      <CommandItem key={c.id} value={c.name} onSelect={() => setCitySlug(c.slug)}>
                        {c.name}
                        {citySlug === c.slug && <Check className="ml-auto h-4 w-4" />}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Interest */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="group flex items-center justify-between gap-3 rounded-2xl bg-card ring-1 ring-border/60 p-4 text-left hover:ring-primary/40 hover:shadow-sm transition">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 shrink-0 rounded-xl bg-[#8BB5A9]/15 text-[#5e8a7e] inline-flex items-center justify-center">
                    {categoryName ? <CategoryIcon name={categoryName.icon} className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{t("book.interest")}</div>
                    <div className="truncate font-semibold text-foreground">
                      {categoryName ? tCategory(categoryName.slug, categoryName.name) : t("book.anyInterest")}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {categorySlug && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setCategorySlug("");
                      }}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"
                      aria-label="Clear interest"
                    >
                      <X className="h-3.5 w-3.5" />
                    </span>
                  )}
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </div>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[260px] p-0" align="start">
              <Command>
                <CommandInput placeholder={t("book.searchInterest")} />
                <CommandList>
                  <CommandEmpty>{t("book.noInterest")}</CommandEmpty>
                  <CommandGroup>
                    <CommandItem value={t("book.anyInterest")} onSelect={() => setCategorySlug("")}>
                      {t("book.anyInterest")}
                      {!categorySlug && <Check className="ml-auto h-4 w-4" />}
                    </CommandItem>
                    {categories.map((c) => (
                      <CommandItem key={c.id} value={c.name} onSelect={() => setCategorySlug(c.slug)}>
                        <CategoryIcon name={c.icon} className="mr-2 h-4 w-4 opacity-70" />
                        {tCategory(c.slug, c.name)}
                        {categorySlug === c.slug && <Check className="ml-auto h-4 w-4" />}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Tabs + count */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div className="flex items-center gap-1 rounded-full bg-secondary p-1">
            {(["all", "guides", "tours"] as Tab[]).map((k) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`h-8 px-4 rounded-full text-sm font-medium transition ${
                  tab === k ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t(`book.tab.${k}` as any)}
                {k === "guides" && (
                  <span className="ml-1 text-xs opacity-60">· {filteredGuides.length}</span>
                )}
                {k === "tours" && (
                  <span className="ml-1 text-xs opacity-60">· {filteredTours.length}</span>
                )}
                {k === "all" && (
                  <span className="ml-1 text-xs opacity-60">· {totalCount}</span>
                )}
              </button>
            ))}
          </div>
          {(citySlug || categorySlug) && (
            <button
              onClick={clearAll}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              {t("book.clearAll")}
            </button>
          )}
        </div>

        {/* Results */}
        {loading ? (
          <p className="mt-10 text-sm text-muted-foreground">Loading…</p>
        ) : totalCount === 0 ? (
          <div className="mt-16 text-center text-muted-foreground">
            <p>{t("book.noResults")}</p>
            <button onClick={clearAll} className="mt-3 text-sm underline hover:text-foreground">
              {t("book.clearAll")}
            </button>
          </div>
        ) : (
          <div className="mt-8 space-y-10">
            {showGuides && filteredGuides.length > 0 && (
              <section>
                {tab === "all" && (
                  <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("book.tab.guides")} · {filteredGuides.length}
                  </h2>
                )}
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredGuides.map((g) => (
                    <GuideCard key={g.id} guide={g} />
                  ))}
                </div>
              </section>
            )}

            {showTours && filteredTours.length > 0 && (
              <section>
                {tab === "all" && (
                  <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("book.tab.tours")} · {filteredTours.length}
                  </h2>
                )}
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredTours.map((tr) => (
                    <Link
                      key={tr.id}
                      to="/tours/$slug"
                      params={{ slug: tr.slug }}
                      className="group overflow-hidden rounded-2xl bg-card ring-1 ring-border/60 hover:shadow-lg transition-shadow"
                    >
                      <div className="aspect-[4/3] w-full overflow-hidden bg-secondary">
                        <img
                          src={tr.cover_url || PLACEHOLDER}
                          alt={tr.title}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                          loading="lazy"
                        />
                      </div>
                      <div className="p-4">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {tr.cities?.name && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {tr.cities.name}
                            </span>
                          )}
                          {tr.duration_hours > 0 && (
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {tr.duration_hours}
                              {t("tours.hours")}
                            </span>
                          )}
                        </div>
                        <h3 className="mt-1 font-semibold leading-snug">{tr.title}</h3>
                        {tr.short_description && (
                          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{tr.short_description}</p>
                        )}
                        <div className="mt-3 text-sm">
                          <span className="text-muted-foreground">{t("tours.priceFrom")} </span>
                          <span className="font-semibold">${Number(tr.price_from).toFixed(0)}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Compass, Trash2, Plus, Upload, ImageIcon, Video, Mail } from "lucide-react";
import { CategoryIcon } from "@/components/CategoryIcon";
import { inviteGuideToPortal } from "@/lib/admin-portal.functions";
import { listAppUsers, setAdminRole, inviteAdminUser, deleteAppUser } from "@/lib/admin-users.functions";
import { notifyGuideApplicationStatus } from "@/lib/lifecycle-emails.functions";
import { finalizeApprovedGuide } from "@/lib/guide-approval.functions";
import { reindexArticle, reindexAllArticles } from "@/lib/articles-rag.functions";

import { SpotlightsPanel } from "@/components/admin/SpotlightsPanel";
import { AdminReelsPanel } from "@/components/admin/AdminReelsPanel";
import { ToursPanel } from "@/components/admin/ToursPanel";
import { VerificationsPanel } from "@/components/admin/VerificationsPanel";
import { GuideInvitationsPanel } from "@/components/admin/GuideInvitationsPanel";
import { StatementsAdminPanel } from "@/components/admin/StatementsAdminPanel";

import { useAdminI18n } from "@/lib/admin-i18n";
import hamrohLogo from "@/assets/hamroh-logo.png";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Hamroh" }] }),
  component: AdminPage,
});

type City = {
  id: string;
  name: string;
  slug: string;
  lat: number;
  lng: number;
  sort_order: number;
};

type Guide = {
  id: string;
  name: string;
  slug: string;
  city_id: string;
  tagline: string;
  bio: string;
  price_per_day: number;
  rating: number;
  reviews: number;
  verified: boolean;
  instant_book: boolean;
  photo_url: string | null;
  specialties: string[];
  languages: string[];
  verified_languages: Record<string, string> | null;
  user_id: string | null;
};


type Article = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  cover_url: string | null;
  body_md: string;
  published: boolean;
  published_at: string | null;
  sort_order: number;
};

type Embed = {
  id: string;
  platform: "instagram" | "tiktok" | "youtube" | "x";
  url: string;
  caption: string;
  sort_order: number;
  visible: boolean;
};

type Booking = {
  id: string;
  guide_id: string;
  user_id: string | null;
  experience: string;
  date: string;
  guests: number;
  customer_name: string;
  customer_email: string | null;
  notes: string;
  total: number;
  status: string;
  source: string;
  created_at: string;
  guides?: { name: string; slug: string } | null;
};

type GuideApplication = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  telegram: string;
  city: string;
  languages: string[];
  specialization: string;
  experience_years: number;
  about: string;
  status: string;
  created_at: string;
  portrait_url: string | null;
  video_url: string | null;
  photo_urls: string[] | null;
  id_document_url: string | null;
  has_certificate: boolean;
  certificate_url: string | null;
  certificate_confirmed: boolean;
  tax_id: string | null;
  has_transport: boolean | null;
  transport_seats: number | null;
  language_tests: Array<{ language: string; level: string; transcript?: string; feedback?: string; skipped?: boolean }> | null;
  user_id: string | null;
};

async function toSignedUrl(rawUrl: string | null | undefined, defaultBucket?: string): Promise<string | null> {
  if (!rawUrl) return null;
  let bucket: string | null = null;
  let path: string | null = null;
  const m = rawUrl.match(/\/object\/(?:public|sign)\/([^/]+)\/([^?]+)/);
  if (m) {
    bucket = m[1];
    path = decodeURIComponent(m[2]);
  } else if (defaultBucket && !/^https?:\/\//i.test(rawUrl)) {
    // Mobile app stores bare storage paths (e.g. "applications/xxx.jpg")
    bucket = defaultBucket;
    path = rawUrl.replace(/^\/+/, "");
  } else {
    return rawUrl;
  }
  try {
    const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
    return data?.signedUrl ?? rawUrl;
  } catch {
    return rawUrl;
  }
}

async function signApplicationMedia(apps: GuideApplication[]): Promise<GuideApplication[]> {
  return Promise.all(apps.map(async (a) => ({
    ...a,
    portrait_url: await toSignedUrl(a.portrait_url, "guide-application-photos"),
    video_url: await toSignedUrl(a.video_url, "guide-application-videos"),
    id_document_url: await toSignedUrl(a.id_document_url, "guide-application-photos"),
    certificate_url: await toSignedUrl(a.certificate_url, "guide-application-photos"),
    photo_urls: a.photo_urls ? await Promise.all(a.photo_urls.map((u) => toSignedUrl(u, "guide-application-photos").then((s) => s ?? u))) : a.photo_urls,
  })));
}



type Category = {
  id: string;
  slug: string;
  name: string;
  icon: string;
  description: string;
  sort_order: number;
};

type GuideCategoryLink = { guide_id: string; category_id: string };

type Place = {
  id: string;
  city_id: string;
  category: string;
  slug: string;
  name: string;
  short_description: string;
  body_md: string;
  address: string;
  lat: number | null;
  lng: number | null;
  photo_url: string | null;
  tags: string[];
  published: boolean;
  sort_order: number;
};

type PlaceGuideLink = { place_id: string; guide_id: string };

type Language = {
  id: string;
  name: string;
  code: string | null;
  sort_order: number;
  is_active: boolean;
};

type PlaceSuggestion = {
  id: string;
  city_id: string | null;
  city_name: string;
  category: string;
  name: string;
  description: string;
  source_url: string;
  raw_query: string;
  status: string;
  created_at: string;
  source?: string | null;
  contact_email?: string | null;
  guide_id?: string | null;
};

const PLACE_CATEGORIES = [
  { value: "food", label: "Food" },
  { value: "attraction", label: "Attraction" },
  { value: "activity", label: "Activity" },
  { value: "shopping", label: "Shopping" },
  { value: "route", label: "Route" },
  { value: "nightlife", label: "Nightlife" },
] as const;

const SOURCES = ["web", "instagram", "facebook", "telegram", "whatsapp", "other"] as const;
type SourceKey = (typeof SOURCES)[number];

function sourceBadgeClass(s: string): string {
  const base = "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize";
  switch (s) {
    case "instagram": return `${base} bg-pink-100 text-pink-700`;
    case "facebook": return `${base} bg-blue-100 text-blue-700`;
    case "telegram": return `${base} bg-sky-100 text-sky-700`;
    case "whatsapp": return `${base} bg-green-100 text-green-700`;
    case "web": return `${base} bg-secondary text-muted-foreground`;
    default: return `${base} border border-border text-muted-foreground`;
  }
}

function AdminPage() {
  const { ta } = useAdminI18n();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState<"bookings" | "applications" | "verifications" | "cities" | "guides" | "tours" | "spotlights" | "reels" | "categories" | "languages" | "places" | "suggestions" | "articles" | "social" | "users" | "invitations" | "statements">("bookings");
  const [cities, setCities] = useState<City[]>([]);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [embeds, setEmbeds] = useState<Embed[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [applications, setApplications] = useState<GuideApplication[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [guideCategories, setGuideCategories] = useState<GuideCategoryLink[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [placeGuides, setPlaceGuides] = useState<PlaceGuideLink[]>([]);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);

  const loadData = useCallback(async () => {
    const [c, g, a, e, b, ap, cat, gc, p, pg, ps, lg] = await Promise.all([
      supabase.from("cities").select("*").order("sort_order"),
      supabase.from("guides").select("*").order("sort_order"),
      supabase.from("articles").select("*").order("sort_order").order("created_at", { ascending: false }),
      supabase.from("social_embeds").select("*").order("sort_order"),
      supabase.from("bookings").select("*, guides(name, slug)").order("created_at", { ascending: false }),
      supabase.from("guide_applications").select("*").order("created_at", { ascending: false }),
      supabase.from("categories").select("*").order("sort_order"),
      supabase.from("guide_categories").select("guide_id, category_id"),
      supabase.from("places").select("*").order("sort_order").order("created_at", { ascending: false }),
      supabase.from("place_guides").select("place_id, guide_id"),
      supabase.from("place_suggestions").select("*").eq("status", "pending").order("created_at", { ascending: false }),
      supabase.from("languages").select("*").order("sort_order"),
    ]);
    if (c.data) setCities(c.data as City[]);
    if (g.data) setGuides(g.data as Guide[]);
    if (a.data) setArticles(a.data as Article[]);
    if (e.data) setEmbeds(e.data as Embed[]);
    if (b.data) setBookings(b.data as Booking[]);
    if (ap.data) setApplications(await signApplicationMedia(ap.data as GuideApplication[]));
    if (cat.data) setCategories(cat.data as Category[]);
    if (gc.data) setGuideCategories(gc.data as GuideCategoryLink[]);
    if (p.data) setPlaces(p.data as Place[]);
    if (pg.data) setPlaceGuides(pg.data as PlaceGuideLink[]);
    if (ps.data) setSuggestions(ps.data as PlaceSuggestion[]);
    if (lg.data) setLanguages(lg.data as Language[]);
  }, []);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        navigate({ to: "/login", replace: true });
        return;
      }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id);
      const isAdmin = (roles ?? []).some((r) => r.role === "admin");
      if (!isAdmin) {
        toast.error(ta("page.accessRequired"));
        navigate({ to: "/", replace: true });
        return;
      }
      await loadData();
      setChecking(false);
    })();
  }, [navigate, loadData]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        {ta("common.loading")}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/30 px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <Link to="/" className="flex items-center gap-2 mb-6">
          <img src={hamrohLogo} alt="Hamroh" className="h-12 w-auto object-contain" />
        </Link>

        <h1 className="font-display text-3xl font-semibold">{ta("page.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{ta("page.subtitle")}</p>

        <div className="mt-6 inline-flex flex-wrap rounded-full bg-card p-1 ring-1 ring-border/60">
          <button
            onClick={() => setTab("bookings")}
            className={`px-4 h-9 rounded-full text-sm font-medium ${tab === "bookings" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            {ta("tab.orders", { n: bookings.length })}
          </button>
          <button
            onClick={() => setTab("applications")}
            className={`px-4 h-9 rounded-full text-sm font-medium ${tab === "applications" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            {ta("tab.applications", { n: applications.filter((a) => a.status === "pending").length })}
          </button>
          <button
            onClick={() => setTab("cities")}
            className={`px-4 h-9 rounded-full text-sm font-medium ${tab === "cities" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            {ta("tab.cities", { n: cities.length })}
          </button>
          <button
            onClick={() => setTab("guides")}
            className={`px-4 h-9 rounded-full text-sm font-medium ${tab === "guides" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            {ta("tab.guides", { n: guides.length })}
          </button>
          <button
            onClick={() => setTab("tours")}
            className={`px-4 h-9 rounded-full text-sm font-medium ${tab === "tours" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            {ta("tab.tours")}
          </button>
          <button
            onClick={() => setTab("spotlights")}
            className={`px-4 h-9 rounded-full text-sm font-medium ${tab === "spotlights" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            {ta("tab.spotlights")}
          </button>
          <button
            onClick={() => setTab("reels")}
            className={`px-4 h-9 rounded-full text-sm font-medium ${tab === "reels" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            Reels
          </button>
          <button
            onClick={() => setTab("categories")}
            className={`px-4 h-9 rounded-full text-sm font-medium ${tab === "categories" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            {ta("tab.categories", { n: categories.length })}
          </button>
          <button
            onClick={() => setTab("languages")}
            className={`px-4 h-9 rounded-full text-sm font-medium ${tab === "languages" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            {ta("tab.languages", { n: languages.length })}
          </button>
          <button
            onClick={() => setTab("places")}
            className={`px-4 h-9 rounded-full text-sm font-medium ${tab === "places" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            {ta("tab.places", { n: places.length })}
          </button>
          <button
            onClick={() => setTab("suggestions")}
            className={`px-4 h-9 rounded-full text-sm font-medium ${tab === "suggestions" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            {ta("tab.suggestions", { n: suggestions.length })}
          </button>
          <button
            onClick={() => setTab("articles")}
            className={`px-4 h-9 rounded-full text-sm font-medium ${tab === "articles" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            {ta("tab.articles", { n: articles.length })}
          </button>
          <button
            onClick={() => setTab("social")}
            className={`px-4 h-9 rounded-full text-sm font-medium ${tab === "social" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            {ta("tab.social", { n: embeds.length })}
          </button>
          <button
            onClick={() => setTab("users")}
            className={`px-4 h-9 rounded-full text-sm font-medium ${tab === "users" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            {ta("tab.users")}
          </button>
          <button
            onClick={() => setTab("verifications")}
            className={`px-4 h-9 rounded-full text-sm font-medium ${tab === "verifications" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            {ta("tab.verifications")}
          </button>
          <button
            onClick={() => setTab("invitations")}
            className={`px-4 h-9 rounded-full text-sm font-medium ${tab === "invitations" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            Приглашения
          </button>
          <button
            onClick={() => setTab("statements")}
            className={`px-4 h-9 rounded-full text-sm font-medium ${tab === "statements" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            Statements
          </button>
        </div>

        {tab === "bookings" && <BookingsPanel bookings={bookings} reload={loadData} />}
        {tab === "applications" && <ApplicationsPanel applications={applications} reload={loadData} />}
        {tab === "cities" && <CitiesPanel cities={cities} reload={loadData} />}
        {tab === "guides" && <GuidesPanel guides={guides} cities={cities} categories={categories} guideCategories={guideCategories} languages={languages} reload={loadData} />}
        {tab === "tours" && <ToursPanel />}
        {tab === "spotlights" && <SpotlightsPanel />}
        {tab === "reels" && <AdminReelsPanel />}
        {tab === "categories" && <CategoriesPanel categories={categories} reload={loadData} />}
        {tab === "languages" && <LanguagesPanel languages={languages} reload={loadData} />}
        {tab === "places" && <PlacesPanel places={places} cities={cities} guides={guides} placeGuides={placeGuides} reload={loadData} />}
        {tab === "suggestions" && <SuggestionsPanel suggestions={suggestions} cities={cities} reload={loadData} />}
        {tab === "articles" && <ArticlesPanel articles={articles} cities={cities} reload={loadData} />}
        {tab === "social" && <SocialPanel embeds={embeds} cities={cities} reload={loadData} />}
        {tab === "users" && <UsersPanel />}
        {tab === "verifications" && <VerificationsPanel />}
        {tab === "invitations" && <GuideInvitationsPanel />}
        {tab === "statements" && <StatementsAdminPanel />}

      </div>
    </div>
  );
}

function CitiesPanel({ cities, reload }: { cities: City[]; reload: () => Promise<void> }) {
  const { ta } = useAdminI18n();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [saving, setSaving] = useState(false);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !slug || !lat || !lng) {
      toast.error(ta("common.fillFields"));
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("cities").insert({
      name,
      slug,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      sort_order: cities.length,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(ta("cities.added"));
    setName("");
    setSlug("");
    setLat("");
    setLng("");
    await reload();
  };

  const remove = async (id: string) => {
    if (!confirm(ta("cities.confirmDelete"))) return;
    const { error } = await supabase.from("cities").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(ta("common.deleted"));
      await reload();
    }
  };

  return (
    <div className="mt-6 grid gap-6 md:grid-cols-2">
      <form onSubmit={add} className="rounded-3xl bg-card p-6 ring-1 ring-border/60 h-fit">
        <h2 className="font-display text-lg font-semibold">{ta("cities.add")}</h2>
        <div className="mt-4 space-y-3">
          <Field label="Name" value={name} onChange={setName} placeholder="Samarkand" />
          <Field
            label="Slug"
            value={slug}
            onChange={setSlug}
            placeholder="samarkand"
          />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Latitude" value={lat} onChange={setLat} placeholder="39.6542" />
            <Field label="Longitude" value={lng} onChange={setLng} placeholder="66.9597" />
          </div>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="mt-5 inline-flex items-center gap-2 h-11 px-6 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
        >
          <Plus className="h-4 w-4" /> {saving ? ta("common.saving") : ta("cities.addBtn")}
        </button>
      </form>

      <div className="rounded-3xl bg-card p-6 ring-1 ring-border/60">
        <h2 className="font-display text-lg font-semibold">{ta("cities.title")}</h2>
        <ul className="mt-4 divide-y divide-border/60">
          {cities.length === 0 && (
            <li className="py-4 text-sm text-muted-foreground">{ta("cities.empty")}</li>
          )}
          {cities.map((c) => (
            <li key={c.id} className="py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium truncate">{c.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  /{c.slug} · {c.lat.toFixed(3)}, {c.lng.toFixed(3)}
                </p>
              </div>
              <button
                onClick={() => remove(c.id)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                aria-label={ta("common.delete")}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}


function GuidesPanel({
  guides,
  cities,
  categories,
  guideCategories,
  languages: languageList,
  reload,
}: {
  guides: Guide[];
  cities: City[];
  categories: Category[];
  guideCategories: GuideCategoryLink[];
  languages: Language[];
  reload: () => Promise<void>;
}) {
  const { ta } = useAdminI18n();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [cityId, setCityId] = useState("");
  const [tagline, setTagline] = useState("");
  const [bio, setBio] = useState("");
  const [price, setPrice] = useState("");
  const [photo, setPhoto] = useState("");
  const [specialties, setSpecialties] = useState("");
  const [selectedLangs, setSelectedLangs] = useState<string[]>([]);
  const [verified, setVerified] = useState(true);
  const [instantBook, setInstantBook] = useState(false);
  const [saving, setSaving] = useState(false);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !slug || !cityId) {
      toast.error(ta("guides.needFields"));
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("guides").insert({
      name,
      slug,
      city_id: cityId,
      tagline,
      bio,
      price_per_day: price ? parseFloat(price) : 0,
      photo_url: photo || null,
      specialties: specialties
        ? specialties.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      languages: selectedLangs,
      verified,
      instant_book: instantBook,
      sort_order: guides.length,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(ta("guides.added"));
    setName("");
    setSlug("");
    setTagline("");
    setBio("");
    setPrice("");
    setPhoto("");
    setSpecialties("");
    setSelectedLangs([]);
    await reload();
  };

  const remove = async (id: string) => {
    if (!confirm(ta("guides.confirmDelete"))) return;
    const { error } = await supabase.from("guides").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(ta("common.deleted"));
      await reload();
    }
  };

  if (cities.length === 0) {
    return (
      <div className="mt-6 rounded-3xl bg-card p-6 ring-1 ring-border/60 text-sm text-muted-foreground">
        {ta("guides.needCityFirst")}
      </div>
    );
  }


  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <form onSubmit={add} className="rounded-3xl bg-card p-6 ring-1 ring-border/60 h-fit">
        <h2 className="font-display text-lg font-semibold">{ta("guides.add")}</h2>
        <div className="mt-4 space-y-3">
          <Field label="Name" value={name} onChange={setName} placeholder="Aziz Karimov" />
          <Field label="Slug" value={slug} onChange={setSlug} placeholder="aziz-karimov" />
          <div>
            <label className="text-xs font-medium text-muted-foreground">City</label>
            <select
              value={cityId}
              onChange={(e) => setCityId(e.target.value)}
              className="mt-1 w-full h-11 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">{ta("common.selectCity")}</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <Field label="Tagline" value={tagline} onChange={setTagline} placeholder="Food & history specialist" />
          <div>
            <label className="text-xs font-medium text-muted-foreground">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Price / day (USD)" value={price} onChange={setPrice} placeholder="80" />
            <Field label="Photo URL" value={photo} onChange={setPhoto} placeholder="https://…" />
          </div>
          <Field
            label="Specialties (comma separated)"
            value={specialties}
            onChange={setSpecialties}
            placeholder="Food, History, Architecture"
          />
          <div>
            <label className="text-xs font-medium text-muted-foreground">Languages</label>
            {languageList.length === 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">{ta("guides.noLanguagesYet")}</p>
            ) : (
              <div className="mt-1 flex flex-wrap gap-2">
                {languageList.map((lng) => {
                  const on = selectedLangs.includes(lng.name);
                  return (
                    <button
                      key={lng.id}
                      type="button"
                      onClick={() =>
                        setSelectedLangs((s) =>
                          s.includes(lng.name) ? s.filter((x) => x !== lng.name) : [...s, lng.name],
                        )
                      }
                      className={`px-3 h-8 rounded-full text-xs font-medium ring-1 transition ${
                        on
                          ? "bg-primary text-primary-foreground ring-primary"
                          : "bg-card ring-border/60 text-muted-foreground hover:bg-secondary/60"
                      }`}
                    >
                      {lng.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="flex items-center gap-6 pt-1">
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} />
              Verified
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={instantBook} onChange={(e) => setInstantBook(e.target.checked)} />
              Instant book
            </label>
          </div>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="mt-5 inline-flex items-center gap-2 h-11 px-6 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
        >
          <Plus className="h-4 w-4" /> {saving ? ta("common.saving") : ta("guides.addBtn")}
        </button>
      </form>

      <div className="rounded-3xl bg-card p-6 ring-1 ring-border/60">
        <h2 className="font-display text-lg font-semibold">{ta("guides.title")}</h2>
        <ul className="mt-4 divide-y divide-border/60">
          {guides.length === 0 && (
            <li className="py-4 text-sm text-muted-foreground">{ta("guides.empty")}</li>
          )}
          {guides.map((g) => {
            const city = cities.find((c) => c.id === g.city_id);
            const selectedCatIds = new Set(
              guideCategories.filter((gc) => gc.guide_id === g.id).map((gc) => gc.category_id),
            );
            return (
              <li key={g.id} className="py-3 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{g.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {city?.name ?? "—"} · ${Number(g.price_per_day).toFixed(0)}/day {g.user_id && <span className="ml-1 text-emerald-600">· {ta("guides.portalLinked")}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <InvitePortalButton guide={g} reload={reload} />
                    <button
                      onClick={() => remove(g.id)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label={ta("common.delete")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {categories.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {categories.map((cat) => {
                      const on = selectedCatIds.has(cat.id);
                      return (
                        <button
                          key={cat.id}
                          onClick={async () => {
                            if (on) {
                              const { error } = await supabase
                                .from("guide_categories")
                                .delete()
                                .eq("guide_id", g.id)
                                .eq("category_id", cat.id);
                              if (error) toast.error(error.message);
                              else await reload();
                            } else {
                              const { error } = await supabase
                                .from("guide_categories")
                                .insert({ guide_id: g.id, category_id: cat.id });
                              if (error) toast.error(error.message);
                              else await reload();
                            }
                          }}
                          className={`inline-flex items-center gap-1 px-2.5 h-7 rounded-full text-xs font-medium ring-1 transition ${
                            on
                              ? "bg-primary text-primary-foreground ring-primary"
                              : "bg-card ring-border/60 text-muted-foreground hover:bg-secondary/60"
                          }`}
                        >
                          <CategoryIcon name={cat.icon} className="h-3 w-3" />
                          {cat.name}
                        </button>
                      );
                    })}
                  </div>
                )}
                {languageList.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {languageList.map((lng) => {
                      const on = (g.languages ?? []).includes(lng.name);
                      return (
                        <button
                          key={lng.id}
                          onClick={async () => {
                            const next = on
                              ? (g.languages ?? []).filter((x) => x !== lng.name)
                              : [...(g.languages ?? []), lng.name];
                            const { error } = await supabase
                              .from("guides")
                              .update({ languages: next })
                              .eq("id", g.id);
                            if (error) toast.error(error.message);
                            else await reload();
                          }}
                          className={`inline-flex items-center px-2.5 h-7 rounded-full text-xs font-medium ring-1 transition ${
                            on
                              ? "bg-primary text-primary-foreground ring-primary"
                              : "bg-card ring-border/60 text-muted-foreground hover:bg-secondary/60"
                          }`}
                        >
                          {lng.name}
                        </button>
                      );
                    })}
                  </div>
                )}
                {(g.languages ?? []).length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-border/40">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mr-1">
                      {ta("guides.verifiedShort")}
                    </span>
                    {(g.languages ?? []).map((lname) => {
                      const lvl = (g.verified_languages ?? {})[lname] ?? "";
                      return (
                        <label
                          key={`vl-${g.id}-${lname}`}
                          className="inline-flex items-center gap-1 rounded-full bg-card ring-1 ring-border/60 px-2 h-7 text-xs"
                        >
                          <span className="text-muted-foreground">{lname}</span>
                          <select
                            value={lvl}
                            onChange={async (e) => {
                              const v = e.target.value;
                              const next: Record<string, string> = { ...(g.verified_languages ?? {}) };
                              if (v) next[lname] = v;
                              else delete next[lname];
                              const { error } = await supabase
                                .from("guides")
                                .update({ verified_languages: next })
                                .eq("id", g.id);
                              if (error) toast.error(error.message);
                              else await reload();
                            }}
                            className="bg-transparent border-0 outline-none text-xs font-semibold text-primary"
                          >
                            <option value="">—</option>
                            <option value="A1">A1</option>
                            <option value="A2">A2</option>
                            <option value="B1">B1</option>
                            <option value="B2">B2</option>
                            <option value="C1">C1</option>
                            <option value="C2">C2</option>
                          </select>
                        </label>
                      );
                    })}
                  </div>
                )}
              </li>
            );
          })}

        </ul>
      </div>
    </div>
  );
}

function LanguagesPanel({
  languages,
  reload,
}: {
  languages: Language[];
  reload: () => Promise<void>;
}) {
  const { ta } = useAdminI18n();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [suggested, setSuggested] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("guide_applications").select("languages");
      if (!data) return;
      const known = new Set(languages.map((l) => l.name.toLowerCase()));
      const seen = new Map<string, string>();
      for (const row of data) {
        for (const raw of (row.languages ?? []) as string[]) {
          const v = (raw ?? "").trim();
          if (!v) continue;
          const key = v.toLowerCase();
          if (known.has(key) || seen.has(key)) continue;
          seen.set(key, v);
        }
      }
      setSuggested(Array.from(seen.values()).sort());
    })();
  }, [languages]);

  const quickAdd = async (n: string) => {
    const { error } = await supabase.from("languages").insert({
      name: n,
      sort_order: languages.length,
    });
    if (error) toast.error(error.message);
    else {
      toast.success(`${n} ${ta("common.add").toLowerCase()}`);
      await reload();
    }
  };


  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(ta("common.nameRequired"));
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("languages").insert({
      name: name.trim(),
      code: code.trim() || null,
      sort_order: languages.length,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(ta("languages.added"));
    setName("");
    setCode("");
    await reload();
  };

  const remove = async (id: string) => {
    if (!confirm(ta("languages.confirmDelete"))) return;
    const { error } = await supabase.from("languages").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(ta("common.deleted"));
      await reload();
    }
  };


  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <form onSubmit={add} className="rounded-3xl bg-card p-6 ring-1 ring-border/60 h-fit">
        <h2 className="font-display text-lg font-semibold">{ta("languages.add")}</h2>
        <div className="mt-4 space-y-3">
          <Field label="Name" value={name} onChange={setName} placeholder="French" />
          <Field label="Code (optional)" value={code} onChange={setCode} placeholder="fr" />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="mt-5 inline-flex items-center gap-2 h-11 px-6 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
        >
          <Plus className="h-4 w-4" /> {saving ? ta("common.saving") : ta("languages.addBtn")}
        </button>

        {suggested.length > 0 && (
          <div className="mt-6 pt-5 border-t border-border/60">
            <h3 className="text-sm font-semibold">{ta("languages.suggested")}</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {ta("languages.suggestedHint")}
            </p>
            <ul className="mt-3 space-y-2">
              {suggested.map((s) => (
                <li key={s} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate">{s}</span>
                  <button
                    type="button"
                    onClick={() => quickAdd(s)}
                    className="inline-flex items-center gap-1 h-8 px-3 rounded-full bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20"
                  >
                    <Plus className="h-3 w-3" /> {ta("common.add")}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </form>


      <div className="rounded-3xl bg-card p-6 ring-1 ring-border/60">
        <h2 className="font-display text-lg font-semibold">{ta("languages.title")}</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {ta("languages.subtitle")}
        </p>
        <ul className="mt-4 divide-y divide-border/60">
          {languages.length === 0 && (
            <li className="py-4 text-sm text-muted-foreground">{ta("languages.empty")}</li>
          )}
          {languages.map((l) => (
            <li key={l.id} className="py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium truncate">{l.name}</p>
                <p className="text-xs text-muted-foreground truncate">{l.code ?? "—"}</p>
              </div>
              <button
                onClick={() => remove(l.id)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                aria-label={ta("common.delete")}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}


function CategoriesPanel({ categories, reload }: { categories: Category[]; reload: () => Promise<void> }) {
  const { ta } = useAdminI18n();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [icon, setIcon] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !slug) {
      toast.error(ta("categories.needFields"));
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("categories").insert({
      name,
      slug,
      icon: icon || "tag",
      description,
      sort_order: categories.length,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(ta("categories.added"));
    setName("");
    setSlug("");
    setIcon("");
    setDescription("");
    await reload();
  };

  const remove = async (id: string) => {
    if (!confirm(ta("categories.confirmDelete"))) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(ta("common.deleted"));
      await reload();
    }
  };

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <form onSubmit={add} className="rounded-3xl bg-card p-6 ring-1 ring-border/60 h-fit">
        <h2 className="font-display text-lg font-semibold">{ta("categories.add")}</h2>
        <div className="mt-4 space-y-3">
          <Field label="Name" value={name} onChange={setName} placeholder="City Tours" />
          <Field label="Slug" value={slug} onChange={setSlug} placeholder="city-tours" />
          <Field
            label="Icon (lucide name, e.g. landmark, utensils, mountain)"
            value={icon}
            onChange={setIcon}
            placeholder="landmark"
          />
          <div>
            <label className="text-xs font-medium text-muted-foreground">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {icon && (
            <div className="text-xs text-muted-foreground inline-flex items-center gap-2">
              {ta("common.preview")}: <CategoryIcon name={icon} className="h-5 w-5 text-foreground" />
            </div>
          )}
        </div>
        <button
          type="submit"
          disabled={saving}
          className="mt-5 inline-flex items-center gap-2 h-11 px-6 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
        >
          <Plus className="h-4 w-4" /> {saving ? ta("common.saving") : ta("categories.addBtn")}
        </button>
      </form>

      <div className="rounded-3xl bg-card p-6 ring-1 ring-border/60">
        <h2 className="font-display text-lg font-semibold">{ta("categories.title")}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{ta("categories.subtitle")}</p>
        <ul className="mt-4 divide-y divide-border/60">
          {categories.length === 0 && (
            <li className="py-4 text-sm text-muted-foreground">{ta("categories.empty")}</li>
          )}
          {categories.map((c) => (
            <li key={c.id} className="py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                  <CategoryIcon name={c.icon} className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground truncate">/{c.slug} · {c.icon || "tag"}</p>
                </div>
              </div>
              <button
                onClick={() => remove(c.id)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                aria-label={ta("common.delete")}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function InvitePortalButton({ guide, reload }: { guide: Guide; reload: () => void }) {
  const { ta } = useAdminI18n();
  const invite = useServerFn(inviteGuideToPortal);
  const [busy, setBusy] = useState(false);
  const onClick = async () => {
    const email = window.prompt(ta("guides.invitePrompt", { name: guide.name }));
    if (!email) return;
    setBusy(true);
    try {
      const res = await invite({ data: { guide_id: guide.id, email } });
      toast.success(res.existed ? ta("guides.userLinked") : ta("guides.inviteSent"));
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <button
      onClick={onClick}
      disabled={busy}
      title={guide.user_id ? ta("guides.resendInvite") : ta("guides.invitePortal")}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-accent/10 hover:text-accent disabled:opacity-50"
    >
      <Mail className="h-4 w-4" />
    </button>
  );
}


function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full h-11 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}

function CityMultiSelect({
  cities,
  selected,
  onChange,
}: {
  cities: City[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  if (cities.length === 0) return null;
  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">Cities (leave empty = show everywhere)</label>
      <div className="mt-1 flex flex-wrap gap-2">
        {cities.map((c) => {
          const on = selected.includes(c.id);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => toggle(c.id)}
              className={`px-3 h-8 rounded-full text-xs font-medium ring-1 transition ${
                on
                  ? "bg-primary text-primary-foreground ring-primary"
                  : "bg-card ring-border/60 text-muted-foreground hover:bg-secondary/60"
              }`}
            >
              {c.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ArticlesPanel({
  articles,
  cities,
  reload,
}: {
  articles: Article[];
  cities: City[];
  reload: () => Promise<void>;
}) {
  const { ta } = useAdminI18n();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [cover, setCover] = useState("");
  const [body, setBody] = useState("");
  const [published, setPublished] = useState(true);
  const [cityIds, setCityIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !slug) {
      toast.error(ta("articles.needFields"));
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from("articles")
      .insert({
        title,
        slug,
        excerpt,
        cover_url: cover || null,
        body_md: body,
        published,
        published_at: published ? new Date().toISOString() : null,
        sort_order: articles.length,
      })
      .select("id")
      .single();
    if (error || !data) { setSaving(false); toast.error(error?.message ?? ta("common.failed")); return; }
    if (cityIds.length > 0) {
      const { error: linkErr } = await supabase
        .from("article_cities")
        .insert(cityIds.map((city_id) => ({ article_id: data.id, city_id })));
      if (linkErr) toast.error(linkErr.message);
    }
    // Index for AI search
    try {
      const res = await reindexArticle({ data: { articleId: data.id } });
      toast.success(`${ta("articles.added")} · ${res.chunks} chunks`);
    } catch (err) {
      toast.success(ta("articles.added"));
      console.error(err);
    }
    setSaving(false);
    setTitle(""); setSlug(""); setExcerpt(""); setCover(""); setBody(""); setCityIds([]);
    await reload();
  };


  const togglePublished = async (a: Article) => {
    const next = !a.published;
    const { error } = await supabase
      .from("articles")
      .update({ published: next, published_at: next ? new Date().toISOString() : null })
      .eq("id", a.id);
    if (error) toast.error(error.message);
    else { toast.success(next ? ta("articles.published") : ta("articles.unpublished")); await reload(); }
  };

  const remove = async (id: string) => {
    if (!confirm(ta("articles.confirmDelete"))) return;
    const { error } = await supabase.from("articles").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success(ta("common.deleted")); await reload(); }
  };

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <form onSubmit={add} className="rounded-3xl bg-card p-6 ring-1 ring-border/60 h-fit">
        <h2 className="font-display text-lg font-semibold">{ta("articles.add")}</h2>
        <div className="mt-4 space-y-3">
          <Field label="Title" value={title} onChange={setTitle} placeholder="A weekend in Bukhara" />
          <Field label="Slug" value={slug} onChange={setSlug} placeholder="weekend-in-bukhara" />
          <Field label="Excerpt" value={excerpt} onChange={setExcerpt} placeholder="Short summary…" />
          <Field label="Cover image URL" value={cover} onChange={setCover} placeholder="https://…" />
          <div>
            <label className="text-xs font-medium text-muted-foreground">Body (markdown)</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <CityMultiSelect cities={cities} selected={cityIds} onChange={setCityIds} />
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
            {ta("articles.publishImmediately")}
          </label>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="mt-5 inline-flex items-center gap-2 h-11 px-6 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
        >
          <Plus className="h-4 w-4" /> {saving ? ta("common.saving") : ta("articles.addBtn")}
        </button>
      </form>

      <div className="rounded-3xl bg-card p-6 ring-1 ring-border/60">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold">{ta("articles.title")}</h2>
          <button
            onClick={async () => {
              const t = toast.loading(ta("common.loading"));
              try {
                const res = await reindexAllArticles();
                toast.success(`Indexed ${res.chunks} chunks across ${res.articles} articles`, { id: t });
              } catch (e) {
                toast.error((e as Error).message, { id: t });
              }
            }}
            className="h-9 px-3 rounded-full text-xs font-medium ring-1 ring-border/60 hover:bg-secondary/60"
          >
            {ta("articles.reindexAll")}
          </button>
        </div>
        <ul className="mt-4 divide-y divide-border/60">
          {articles.length === 0 && <li className="py-4 text-sm text-muted-foreground">{ta("articles.empty")}</li>}
          {articles.map((a) => (
            <li key={a.id} className="py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium truncate">{a.title}</p>
                <p className="text-xs text-muted-foreground truncate">/{a.slug} · {a.published ? ta("common.published") : ta("common.draft")}</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={async () => {
                    const t = toast.loading(ta("common.loading"));
                    try {
                      const res = await reindexArticle({ data: { articleId: a.id } });
                      toast.success(`Indexed ${res.chunks} chunks`, { id: t });
                    } catch (e) {
                      toast.error((e as Error).message, { id: t });
                    }
                  }}
                  className="h-9 px-3 rounded-full text-xs font-medium ring-1 ring-border/60 hover:bg-secondary/60"
                >
                  {ta("articles.reindex")}
                </button>
                <button
                  onClick={() => togglePublished(a)}
                  className="h-9 px-3 rounded-full text-xs font-medium ring-1 ring-border/60 hover:bg-secondary/60"
                >
                  {a.published ? ta("common.unpublish") : ta("common.publish")}
                </button>
                <button
                  onClick={() => remove(a.id)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label={ta("common.delete")}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}



function SocialPanel({
  embeds,
  cities,
  reload,
}: {
  embeds: Embed[];
  cities: City[];
  reload: () => Promise<void>;
}) {
  const { ta } = useAdminI18n();
  const [platform, setPlatform] = useState<Embed["platform"]>("instagram");
  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [cityIds, setCityIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) { toast.error(ta("common.urlRequired")); return; }
    setSaving(true);
    const { data, error } = await supabase
      .from("social_embeds")
      .insert({ platform, url, caption, sort_order: embeds.length, visible: true })
      .select("id")
      .single();
    if (error || !data) { setSaving(false); toast.error(error?.message ?? ta("common.failed")); return; }
    if (cityIds.length > 0) {
      const { error: linkErr } = await supabase
        .from("social_embed_cities")
        .insert(cityIds.map((city_id) => ({ embed_id: data.id, city_id })));
      if (linkErr) toast.error(linkErr.message);
    }
    setSaving(false);
    toast.success(ta("social.added"));
    setUrl(""); setCaption(""); setCityIds([]);
    await reload();
  };

  const toggleVisible = async (em: Embed) => {
    const { error } = await supabase.from("social_embeds").update({ visible: !em.visible }).eq("id", em.id);
    if (error) toast.error(error.message);
    else await reload();
  };

  const remove = async (id: string) => {
    if (!confirm(ta("social.confirmDelete"))) return;
    const { error } = await supabase.from("social_embeds").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success(ta("common.deleted")); await reload(); }
  };

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <form onSubmit={add} className="rounded-3xl bg-card p-6 ring-1 ring-border/60 h-fit">
        <h2 className="font-display text-lg font-semibold">{ta("social.title")}</h2>
        <div className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Platform</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as Embed["platform"])}
              className="mt-1 w-full h-11 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="instagram">Instagram</option>
              <option value="tiktok">TikTok</option>
              <option value="youtube">YouTube</option>
              <option value="x">X (Twitter)</option>
            </select>
          </div>
          <Field label="Post URL" value={url} onChange={setUrl} placeholder="https://…" />
          <Field label="Caption (optional)" value={caption} onChange={setCaption} placeholder="Behind the scenes in Samarkand" />
          <CityMultiSelect cities={cities} selected={cityIds} onChange={setCityIds} />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="mt-5 inline-flex items-center gap-2 h-11 px-6 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
        >
          <Plus className="h-4 w-4" /> {saving ? ta("common.saving") : ta("common.add")}
        </button>
      </form>

      <div className="rounded-3xl bg-card p-6 ring-1 ring-border/60">
        <h2 className="font-display text-lg font-semibold">{ta("social.title")}</h2>
        <ul className="mt-4 divide-y divide-border/60">
          {embeds.length === 0 && <li className="py-4 text-sm text-muted-foreground">—</li>}
          {embeds.map((em) => (
            <li key={em.id} className="py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium truncate capitalize">{em.platform} · {em.visible ? ta("common.active") : ta("common.hidden")}</p>
                <p className="text-xs text-muted-foreground truncate">{em.url}</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => toggleVisible(em)}
                  className="h-9 px-3 rounded-full text-xs font-medium ring-1 ring-border/60 hover:bg-secondary/60"
                >
                  {em.visible ? ta("common.hide") : ta("common.show")}
                </button>
                <button
                  onClick={() => remove(em.id)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label={ta("common.delete")}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}


function BookingsPanel({ bookings, reload }: { bookings: Booking[]; reload: () => Promise<void> }) {
  const { ta } = useAdminI18n();
  const [filter, setFilter] = useState<"all" | "pending" | "confirmed" | "cancelled">("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | SourceKey>("all");

  const filtered = bookings.filter((b) => {
    if (filter !== "all" && b.status !== filter) return false;
    if (sourceFilter !== "all" && b.source !== sourceFilter) return false;
    return true;
  });

  // Stats per source for last 30 days
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const recentStats = SOURCES.map((s) => ({
    source: s,
    count: bookings.filter((b) => b.source === s && new Date(b.created_at).getTime() >= thirtyDaysAgo).length,
  }));

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(ta("common.statusUpdated"));
      await reload();
    }
  };

  const remove = async (id: string) => {
    if (!confirm(ta("bookings.confirmDelete"))) return;
    const { error } = await supabase.from("bookings").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(ta("common.deleted"));
      await reload();
    }
  };

  const statusBadge = (status: string) => {
    const base = "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium";
    if (status === "confirmed") return `${base} bg-primary/10 text-primary`;
    if (status === "cancelled") return `${base} bg-destructive/10 text-destructive`;
    return `${base} bg-accent/15 text-accent-foreground`;
  };

  const filterLabel = (s: string) => {
    if (s === "all") return ta("filter.all");
    if (s === "pending") return ta("filter.pending");
    if (s === "confirmed") return ta("filter.confirmed");
    if (s === "cancelled") return ta("filter.cancelled");
    return s;
  };

  return (
    <div className="mt-6 space-y-4">
      {/* Source stats */}
      <div className="rounded-3xl bg-card p-6 ring-1 ring-border/60">
        <h2 className="font-display text-lg font-semibold">{ta("bookings.sourcesLast30")}</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {recentStats.map((s) => (
            <div key={s.source} className="rounded-2xl bg-secondary/40 p-3">
              <div className="text-xs text-muted-foreground capitalize">{s.source}</div>
              <div className="mt-1 font-display text-2xl font-semibold">{s.count}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl bg-card p-6 ring-1 ring-border/60">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">{ta("bookings.title")}</h2>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as "all" | SourceKey)}
              className="h-8 rounded-full border border-input bg-background px-3 text-xs"
            >
              <option value="all">{ta("common.allSources")}</option>
              {SOURCES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <div className="inline-flex rounded-full bg-secondary/60 p-1">
              {(["all", "pending", "confirmed", "cancelled"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className={`px-3 h-8 rounded-full text-xs font-medium capitalize ${filter === s ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                >
                  {filterLabel(s)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">{ta("bookings.empty")}</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr className="border-b border-border/60">
                  <th className="py-2 pr-3">{ta("bookings.created")}</th>
                  <th className="py-2 pr-3">{ta("bookings.source")}</th>
                  <th className="py-2 pr-3">{ta("bookings.date")}</th>
                  <th className="py-2 pr-3">{ta("bookings.guide")}</th>
                  <th className="py-2 pr-3">{ta("bookings.customer")}</th>
                  <th className="py-2 pr-3">{ta("bookings.guests")}</th>
                  <th className="py-2 pr-3">{ta("bookings.total")}</th>
                  <th className="py-2 pr-3">{ta("bookings.status")}</th>
                  <th className="py-2 pr-3 text-right">{ta("common.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filtered.map((b) => (
                  <tr key={b.id} className="align-top">
                    <td className="py-3 pr-3 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(b.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 pr-3">
                      <span className={sourceBadgeClass(b.source)}>{b.source}</span>
                    </td>
                    <td className="py-3 pr-3 whitespace-nowrap">{b.date}</td>
                    <td className="py-3 pr-3">
                      <div className="font-medium">{b.guides?.name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[180px]">{b.experience}</div>
                    </td>
                    <td className="py-3 pr-3">
                      <div className="font-medium">{b.customer_name}</div>
                      <div className="text-xs text-muted-foreground">{b.customer_email ?? "Telegram"}</div>
                      {b.notes && <div className="text-xs text-muted-foreground mt-1 max-w-[220px] truncate" title={b.notes}>{b.notes}</div>}
                    </td>
                    <td className="py-3 pr-3">{b.guests}</td>
                    <td className="py-3 pr-3 font-medium">${Number(b.total).toFixed(0)}</td>
                    <td className="py-3 pr-3">
                      <span className={statusBadge(b.status)}>{filterLabel(b.status)}</span>
                    </td>
                    <td className="py-3 pr-3 text-right whitespace-nowrap">
                      <select
                        value={b.status}
                        onChange={(e) => setStatus(b.id, e.target.value)}
                        className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                      >
                        <option value="pending">{ta("filter.pending")}</option>
                        <option value="confirmed">{ta("filter.confirmed")}</option>
                        <option value="cancelled">{ta("filter.cancelled")}</option>
                      </select>
                      <button
                        onClick={() => remove(b.id)}
                        className="ml-2 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        aria-label={ta("common.delete")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function ApplicationsPanel({
  applications,
  reload,
}: {
  applications: GuideApplication[];
  reload: () => Promise<void>;
}) {
  const { ta } = useAdminI18n();
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const portraitRef = useRef<HTMLInputElement>(null);
  const photosRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  const filtered = applications.filter((a) => filter === "all" || a.status === filter);

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("guide_applications").update({ status }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(ta("common.statusUpdated"));

    // On approval: create a guide row if one doesn't exist yet, and copy verified languages.
    if (status === "approved") {
      try {
        const app = applications.find((a) => a.id === id);
        const tests = app?.language_tests ?? [];
        const passed: Record<string, string> = {};
        for (const t of tests) {
          if (t.skipped) continue;
          if (["B1", "B2", "C1", "C2"].includes(t.level)) passed[t.language] = t.level;
        }

        if (app) {
          let existing: { id: string; verified_languages: unknown } | null = null;
          if (app.user_id) {
            const { data: g } = await supabase
              .from("guides")
              .select("id, verified_languages")
              .eq("user_id", app.user_id)
              .maybeSingle();
            existing = g ?? null;
          }

          if (!existing) {
            const { data: cityRow } = await supabase
              .from("cities")
              .select("id")
              .ilike("name", app.city)
              .maybeSingle();
            if (!cityRow?.id) {
              toast.error(`Could not find city "${app.city}" — create a guide manually`);
            } else {
              const baseSlug = (app.full_name || "guide")
                .toLowerCase()
                .normalize("NFKD")
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/(^-|-$)/g, "") || "guide";
              const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
              const appExt = app as unknown as {
                has_transport?: boolean;
                transport_seats?: number | null;
                category_ids?: string[];
                specialization?: string;
                about?: string;
                has_certificate?: boolean;
                certificate_url?: string | null;
                certificate_confirmed?: boolean;
              };
              const isLicensed = !!(appExt.has_certificate && appExt.certificate_confirmed);
              const { data: created, error: gErr } = await supabase
                .from("guides")
                .insert({
                  name: app.full_name,
                  slug,
                  city_id: cityRow.id,
                  user_id: app.user_id,
                  photo_url: app.portrait_url,
                  intro_video_url: app.video_url,
                  bio: appExt.about ?? "",
                  tagline: appExt.specialization ?? "",
                  languages: app.languages ?? [],
                  verified_languages: passed,
                  has_transport: appExt.has_transport ?? false,
                  transport_seats: appExt.transport_seats ?? null,
                  licensed: isLicensed,
                  license_url: isLicensed ? appExt.certificate_url ?? null : null,
                  licensed_at: isLicensed ? new Date().toISOString() : null,
                  verified: true,
                })
                .select("id")
                .single();
              if (gErr) {
                toast.error(`Guide creation failed: ${gErr.message}`);
              } else if (created?.id) {
                const cats = appExt.category_ids ?? [];
                if (cats.length > 0) {
                  await supabase
                    .from("guide_categories")
                    .insert(cats.map((cid) => ({ guide_id: created.id, category_id: cid })));
                }
                toast.success(ta("applications.guideCreated"));
              }
            }
          } else if (Object.keys(passed).length > 0) {
            const merged = { ...((existing.verified_languages as Record<string, string>) ?? {}), ...passed };
            await supabase.from("guides").update({ verified_languages: merged }).eq("id", existing.id);
            toast.success(`Verified ${Object.keys(passed).length} language(s) on guide profile`);
          }
          // Always sync licensed status to existing guides on approval
          if (existing?.id) {
            const isLicensed = !!(app.has_certificate && app.certificate_confirmed);
            await supabase.from("guides").update({
              licensed: isLicensed,
              license_url: isLicensed ? app.certificate_url ?? null : null,
              licensed_at: isLicensed ? new Date().toISOString() : null,
            }).eq("id", existing.id);
          }
        }
      } catch (e) {
        console.error("guide creation on approval failed", e);
      }
    }

    if (status === "approved") {
      try {
        await finalizeApprovedGuide({ data: { application_id: id } });
      } catch (e) {
        console.error("finalizeApprovedGuide failed", e);
      }
    }

    if (status === "approved" || status === "rejected") {
      try {
        await notifyGuideApplicationStatus({ data: { application_id: id, status } });
      } catch (e) {
        console.error("status email failed", e);
      }
    }
    await reload();
  };


  const remove = async (id: string) => {
    if (!confirm(ta("applications.confirmDelete"))) return;
    const { error } = await supabase.from("guide_applications").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(ta("common.deleted"));
      await reload();
    }
  };

  const badge = (s: string) => {
    const base = "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize";
    if (s === "approved") return `${base} bg-primary/10 text-primary`;
    if (s === "rejected") return `${base} bg-destructive/10 text-destructive`;
    return `${base} bg-accent/15 text-accent-foreground`;
  };

  const uploadFile = async (bucket: string, file: File, path: string): Promise<string | null> => {
    const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    if (upErr) {
      toast.error(upErr.message);
      return null;
    }
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data?.publicUrl ?? null;
  };

  const handlePortraitUpload = async (appId: string, file: File) => {
    setUploading((p) => ({ ...p, [appId + "-portrait"]: true }));
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${appId}/portrait.${ext}`;
    const url = await uploadFile("guide-application-photos", file, path);
    if (url) {
      const { error } = await supabase.from("guide_applications").update({ portrait_url: url }).eq("id", appId);
      if (error) toast.error(error.message);
      else { toast.success(ta("applications.portraitUploaded")); await reload(); }
    }
    setUploading((p) => ({ ...p, [appId + "-portrait"]: false }));
  };

  const handlePhotosUpload = async (appId: string, files: FileList) => {
    const app = applications.find((a) => a.id === appId);
    const current = app?.photo_urls?.length ?? 0;
    const toAdd = Math.min(files.length, 5 - current);
    if (toAdd <= 0) { toast.error(ta("applications.maxPhotos")); return; }

    setUploading((p) => ({ ...p, [appId + "-photos"]: true }));
    const newUrls: string[] = [];
    for (let i = 0; i < toAdd; i++) {
      const file = files[i];
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${appId}/photos/${Date.now()}-${i}.${ext}`;
      const url = await uploadFile("guide-application-photos", file, path);
      if (url) newUrls.push(url);
    }
    if (newUrls.length > 0) {
      const merged = [...(app?.photo_urls ?? []), ...newUrls];
      const { error } = await supabase.from("guide_applications").update({ photo_urls: merged }).eq("id", appId);
      if (error) toast.error(error.message);
      else { toast.success(ta("applications.photosUploaded")); await reload(); }
    }
    setUploading((p) => ({ ...p, [appId + "-photos"]: false }));
  };

  const removePhoto = async (appId: string, url: string) => {
    const app = applications.find((a) => a.id === appId);
    if (!app) return;
    const next = (app.photo_urls ?? []).filter((u) => u !== url);
    const { error } = await supabase.from("guide_applications").update({ photo_urls: next }).eq("id", appId);
    if (error) toast.error(error.message);
    else { toast.success(ta("applications.photoRemoved")); await reload(); }
  };

  const handleVideoUpload = async (appId: string, file: File) => {
    setUploading((p) => ({ ...p, [appId + "-video"]: true }));
    const ext = file.name.split(".").pop() ?? "mp4";
    const path = `${appId}/video.${ext}`;
    const url = await uploadFile("guide-application-videos", file, path);
    if (url) {
      const { error } = await supabase.from("guide_applications").update({ video_url: url }).eq("id", appId);
      if (error) toast.error(error.message);
      else { toast.success(ta("applications.videoUploaded")); await reload(); }
    }
    setUploading((p) => ({ ...p, [appId + "-video"]: false }));
  };

  const removeVideo = async (appId: string) => {
    const { error } = await supabase.from("guide_applications").update({ video_url: null }).eq("id", appId);
    if (error) toast.error(error.message);
    else { toast.success(ta("applications.videoRemoved")); await reload(); }
  };

  const toggleCertificateConfirmed = async (appId: string, next: boolean) => {
    const { error } = await supabase
      .from("guide_applications")
      .update({ certificate_confirmed: next })
      .eq("id", appId);
    if (error) toast.error(error.message);
    else { toast.success(ta("applications.licenseConfirmed")); await reload(); }
  };

  return (
    <div className="mt-6 rounded-3xl bg-card p-6 ring-1 ring-border/60">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">{ta("applications.title")}</h2>
        <div className="inline-flex rounded-full bg-secondary/60 p-1">
          {(["pending", "approved", "rejected", "all"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 h-8 rounded-full text-xs font-medium capitalize ${filter === s ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              {ta(`filter.${s}` as "filter.pending")}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">{ta("applications.empty")}</p>
      ) : (
        <ul className="mt-4 divide-y divide-border/60">
          {filtered.map((a) => {
            const open = expanded === a.id;
            const photoCount = a.photo_urls?.length ?? 0;
            return (
              <li key={a.id} className="py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{a.full_name}</p>
                      <span className={badge(a.status)}>{ta(`filter.${a.status}` as "filter.pending")}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {a.city} · {a.experience_years} {ta("applications.yrShort")} · {new Date(a.created_at).toLocaleDateString()}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground truncate">
                      {a.email} · {a.phone}{a.telegram ? ` · ${a.telegram}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setExpanded(open ? null : a.id)}
                      className="h-8 px-3 rounded-full text-xs font-medium ring-1 ring-border/60 hover:bg-secondary/60"
                    >
                      {open ? ta("common.hide") : ta("common.details")}
                    </button>
                    {a.status !== "approved" && (
                      <button
                        onClick={() => setStatus(a.id, "approved")}
                        className="h-8 px-3 rounded-full text-xs font-medium bg-primary text-primary-foreground"
                      >
                        {ta("common.approve")}
                      </button>
                    )}
                    {a.status !== "rejected" && (
                      <button
                        onClick={() => setStatus(a.id, "rejected")}
                        className="h-8 px-3 rounded-full text-xs font-medium ring-1 ring-border/60 hover:bg-destructive/10 hover:text-destructive"
                      >
                        {ta("common.reject")}
                      </button>
                    )}
                    <button
                      onClick={() => remove(a.id)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label={ta("common.delete")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {open && (
                  <div className="mt-3 rounded-2xl bg-secondary/40 p-4 text-sm space-y-4">
                    {/* Portrait */}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">{ta("applications.portrait")}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        {a.portrait_url ? (
                          <a href={a.portrait_url} target="_blank" rel="noreferrer">
                            <img src={a.portrait_url} alt="Portrait" className="h-24 w-24 rounded-xl object-cover ring-1 ring-border/60" />
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">{ta("applications.noPortrait")}</span>
                        )}
                        <button
                          onClick={() => portraitRef.current?.click()}
                          disabled={uploading[a.id + "-portrait"]}
                          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-xs font-medium ring-1 ring-border/60 hover:bg-secondary/60 disabled:opacity-50"
                        >
                          <Upload className="h-3.5 w-3.5" />
                          {uploading[a.id + "-portrait"] ? ta("common.uploading") : a.portrait_url ? ta("common.replace") : ta("applications.uploadPortrait")}
                        </button>
                        <input
                          ref={portraitRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handlePortraitUpload(a.id, file);
                            e.target.value = "";
                          }}
                        />
                      </div>
                    </div>


                    {/* ID document */}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">{ta("applications.idDocument")}</p>
                      {a.id_document_url ? (
                        <a
                          href={a.id_document_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-xs font-medium ring-1 ring-border/60 hover:bg-secondary/60"
                        >
                          {ta("applications.openIdDocument")}
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">{ta("applications.noIdDocument")}</span>
                      )}
                    </div>


                    {/* Guide certificate */}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">{ta("applications.certificate")}</p>
                      {!a.has_certificate ? (
                        <span className="text-xs text-muted-foreground">{ta("applications.noCertificate")}</span>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {a.certificate_url ? (
                            <a
                              href={a.certificate_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex w-fit items-center gap-1.5 h-9 px-3 rounded-full text-xs font-medium ring-1 ring-border/60 hover:bg-secondary/60"
                            >
                              {ta("applications.openCertificate")}
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">{ta("applications.certificateMissing")}</span>
                          )}
                          <label className="inline-flex items-center gap-2 text-xs cursor-pointer">
                            <input
                              type="checkbox"
                              checked={a.certificate_confirmed}
                              onChange={(e) => toggleCertificateConfirmed(a.id, e.target.checked)}
                              className="h-4 w-4 rounded border-border/60"
                            />
                            <span>{ta("applications.confirmLicense")}</span>
                          </label>
                        </div>
                      )}
                    </div>

                    {/* Tax ID (INN) */}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">{ta("applications.taxId")}</p>
                      {a.tax_id ? (
                        <span className="font-mono text-sm">{a.tax_id}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">{ta("applications.taxIdMissing")}</span>
                      )}
                    </div>









                    {/* Photos */}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">{ta("applications.tourPhotos")} ({photoCount}/5)</p>
                      <div className="flex flex-wrap items-center gap-2">
                        {a.photo_urls?.map((url) => (
                          <div key={url} className="relative group">
                            <a href={url} target="_blank" rel="noreferrer">
                              <img src={url} alt="Tour" className="h-24 w-24 rounded-xl object-cover ring-1 ring-border/60" />
                            </a>
                            <button
                              onClick={() => removePhoto(a.id, url)}
                              className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition"
                              title={ta("common.remove")}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                        {photoCount < 5 && (
                          <button
                            onClick={() => photosRef.current?.click()}
                            disabled={uploading[a.id + "-photos"]}
                            className="inline-flex flex-col items-center justify-center gap-1 h-24 w-24 rounded-xl ring-1 ring-border/60 border-dashed border-2 border-border/60 text-muted-foreground hover:bg-secondary/40 disabled:opacity-50"
                          >
                            <ImageIcon className="h-5 w-5" />
                            <span className="text-[10px]">{uploading[a.id + "-photos"] ? "…" : ta("applications.addPhoto")}</span>
                          </button>
                        )}
                        <input
                          ref={photosRef}
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                              handlePhotosUpload(a.id, e.target.files);
                            }
                            e.target.value = "";
                          }}
                        />
                      </div>
                    </div>

                    {/* Video */}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">{ta("applications.videoGreeting")}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        {a.video_url ? (
                          <div className="relative group">
                            <video src={a.video_url} controls className="w-full max-w-sm rounded-xl ring-1 ring-border/60" />
                            <button
                              onClick={() => removeVideo(a.id)}
                              className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center text-[10px]"
                              title={ta("applications.removeVideo")}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">{ta("applications.noVideo")}</span>
                        )}
                        <button
                          onClick={() => videoRef.current?.click()}
                          disabled={uploading[a.id + "-video"]}
                          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-xs font-medium ring-1 ring-border/60 hover:bg-secondary/60 disabled:opacity-50"
                        >
                          <Video className="h-3.5 w-3.5" />
                          {uploading[a.id + "-video"] ? ta("common.uploading") : a.video_url ? ta("common.replace") : ta("applications.uploadVideo")}
                        </button>
                        <input
                          ref={videoRef}
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleVideoUpload(a.id, file);
                            e.target.value = "";
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <span className="text-xs text-muted-foreground">{ta("applications.specialization")}</span>
                      {a.specialization}
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">{ta("applications.languages")}</span>
                      {a.languages.join(", ")}
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">{ta("applications.about")}</span>
                      <p className="mt-1 whitespace-pre-wrap">{a.about}</p>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function PlacesPanel({
  places,
  cities,
  guides,
  placeGuides,
  reload,
}: {
  places: Place[];
  cities: City[];
  guides: Guide[];
  placeGuides: PlaceGuideLink[];
  reload: () => Promise<void>;
}) {
  const { ta } = useAdminI18n();
  const [cityId, setCityId] = useState("");
  const [category, setCategory] = useState<string>("food");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [bodyMd, setBodyMd] = useState("");
  const [address, setAddress] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [tags, setTags] = useState("");
  const [published, setPublished] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filterCity, setFilterCity] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("");

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !slug || !cityId) {
      toast.error(ta("places.needFields"));
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("places").insert({
      city_id: cityId,
      category,
      name,
      slug,
      short_description: shortDescription,
      body_md: bodyMd,
      address,
      photo_url: photoUrl || null,
      tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      published,
      sort_order: places.length,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(ta("places.added"));
    setName("");
    setSlug("");
    setShortDescription("");
    setBodyMd("");
    setAddress("");
    setPhotoUrl("");
    setTags("");
    await reload();
  };

  const remove = async (id: string) => {
    if (!confirm(ta("places.confirmDelete"))) return;
    const { error } = await supabase.from("places").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(ta("common.deleted"));
      await reload();
    }
  };

  const togglePublished = async (p: Place) => {
    const { error } = await supabase.from("places").update({ published: !p.published }).eq("id", p.id);
    if (error) toast.error(error.message);
    else await reload();
  };

  const toggleGuide = async (placeId: string, guideId: string, currentlyLinked: boolean) => {
    if (currentlyLinked) {
      const { error } = await supabase
        .from("place_guides")
        .delete()
        .eq("place_id", placeId)
        .eq("guide_id", guideId);
      if (error) toast.error(error.message);
      else await reload();
    } else {
      const { error } = await supabase.from("place_guides").insert({ place_id: placeId, guide_id: guideId });
      if (error) toast.error(error.message);
      else await reload();
    }
  };

  if (cities.length === 0) {
    return (
      <div className="mt-6 rounded-3xl bg-card p-6 ring-1 ring-border/60 text-sm text-muted-foreground">
        {ta("places.needCityFirst")}
      </div>
    );
  }

  const filtered = places.filter(
    (p) => (!filterCity || p.city_id === filterCity) && (!filterCategory || p.category === filterCategory),
  );

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <form onSubmit={add} className="rounded-3xl bg-card p-6 ring-1 ring-border/60 h-fit">
        <h2 className="font-display text-lg font-semibold">{ta("places.add")}</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {ta("places.subtitle")}
        </p>
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">City</label>
              <select
                value={cityId}
                onChange={(e) => setCityId(e.target.value)}
                className="mt-1 w-full h-11 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">{ta("common.selectCity")}</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 w-full h-11 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                {PLACE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Field label="Name" value={name} onChange={setName} placeholder="Plov Center" />
          <Field label="Slug" value={slug} onChange={setSlug} placeholder="plov-center-tashkent" />
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Short description (1–2 sentences, used by AI)
            </label>
            <textarea
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder="Legendary spot for authentic Uzbek plov. Sold out by 2pm — go early."
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Full description (markdown)</label>
            <textarea
              value={bodyMd}
              onChange={(e) => setBodyMd(e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <Field label="Address" value={address} onChange={setAddress} placeholder="Iftikhor 1, Tashkent" />
          <Field label="Photo URL" value={photoUrl} onChange={setPhotoUrl} placeholder="https://…" />
          <Field
            label="Tags (comma separated)"
            value={tags}
            onChange={setTags}
            placeholder="local-favorite, lunch, budget"
          />
          <label className="inline-flex items-center gap-2 text-sm pt-1">
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
            Published (visible to AI and on site)
          </label>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="mt-5 inline-flex items-center gap-2 h-11 px-6 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
        >
          <Plus className="h-4 w-4" /> {saving ? ta("common.saving") : ta("places.addBtn")}
        </button>
      </form>

      <div className="rounded-3xl bg-card p-6 ring-1 ring-border/60">
        <h2 className="font-display text-lg font-semibold">{ta("places.title")}</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <select
            value={filterCity}
            onChange={(e) => setFilterCity(e.target.value)}
            className="h-9 rounded-full border border-input bg-background px-3 text-xs"
          >
            <option value="">{ta("common.allCities")}</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="h-9 rounded-full border border-input bg-background px-3 text-xs"
          >
            <option value="">{ta("common.allCategories")}</option>
            {PLACE_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <ul className="mt-4 divide-y divide-border/60">
          {filtered.length === 0 && <li className="py-4 text-sm text-muted-foreground">{ta("places.empty")}</li>}
          {filtered.map((p) => {
            const city = cities.find((c) => c.id === p.city_id);
            const linkedGuideIds = new Set(
              placeGuides.filter((pg) => pg.place_id === p.id).map((pg) => pg.guide_id),
            );
            const cityGuides = guides.filter((g) => g.city_id === p.city_id);
            return (
              <li key={p.id} className="py-3 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {p.name}{" "}
                      <span className="text-xs text-muted-foreground font-normal">/ {p.category}</span>
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {city?.name ?? "—"} · {p.short_description.slice(0, 60)}
                      {p.short_description.length > 60 && "…"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => togglePublished(p)}
                      className={`px-2.5 h-7 rounded-full text-xs font-medium ring-1 ${
                        p.published
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                          : "bg-secondary text-muted-foreground ring-border/60"
                      }`}
                    >
                      {p.published ? ta("common.live") : ta("common.draft")}
                    </button>
                    <button
                      onClick={() => remove(p.id)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label={ta("common.delete")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {cityGuides.length > 0 && (
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      {ta("places.guidesWhoTake")}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {cityGuides.map((g) => {
                        const on = linkedGuideIds.has(g.id);
                        return (
                          <button
                            key={g.id}
                            onClick={() => toggleGuide(p.id, g.id, on)}
                            className={`px-2.5 h-7 rounded-full text-xs font-medium ring-1 transition ${
                              on
                                ? "bg-primary text-primary-foreground ring-primary"
                                : "bg-card ring-border/60 text-muted-foreground hover:bg-secondary/60"
                            }`}
                          >
                            {g.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function SuggestionsPanel({
  suggestions,
  cities,
  reload,
}: {
  suggestions: PlaceSuggestion[];
  cities: City[];
  reload: () => Promise<void>;
}) {
  const { ta } = useAdminI18n();
  const approve = async (s: PlaceSuggestion) => {
    const cityId = s.city_id ?? cities.find((c) => c.name.toLowerCase() === s.city_name.toLowerCase())?.id;
    if (!cityId) {
      toast.error(ta("suggestions.cityNotFound"));
      return;
    }
    const baseSlug = s.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 60);
    const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
    const { error: insErr } = await supabase.from("places").insert({
      city_id: cityId,
      category: s.category,
      name: s.name,
      slug,
      short_description: s.description,
      body_md: s.description + (s.source_url ? `\n\nSource: ${s.source_url}` : ""),
      published: false,
    });
    if (insErr) {
      toast.error(insErr.message);
      return;
    }
    await supabase.from("place_suggestions").update({ status: "approved" }).eq("id", s.id);
    toast.success(ta("suggestions.added"));
    await reload();
  };

  const reject = async (id: string) => {
    const { error } = await supabase.from("place_suggestions").update({ status: "rejected" }).eq("id", id);
    if (error) toast.error(error.message);
    else await reload();
  };

  return (
    <div className="mt-6 rounded-3xl bg-card p-6 ring-1 ring-border/60">
      <h2 className="font-display text-lg font-semibold">{ta("suggestions.title")}</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        {ta("suggestions.subtitle")}
      </p>
      {suggestions.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">{ta("suggestions.empty")}</p>
      ) : (
        <ul className="mt-4 divide-y divide-border/60">
          {suggestions.map((s) => (
            <li key={s.id} className="py-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium">
                      {s.name}{" "}
                      <span className="text-xs text-muted-foreground font-normal">
                        / {s.category} · {s.city_name}
                      </span>
                    </p>
                    <SourceBadge source={s.source ?? "ai"} />
                  </div>
                  {s.contact_email && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">{s.contact_email}</p>
                  )}
                  <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
                  {s.source_url && (
                    <a
                      href={s.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block text-xs text-primary hover:underline"
                    >
                      {ta("suggestions.source")}
                    </a>
                  )}
                  {s.raw_query && (
                    <p className="mt-1 text-[11px] text-muted-foreground italic">
                      {ta("suggestions.userQuery")} "{s.raw_query}"
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => approve(s)}
                    className="px-3 h-9 rounded-full bg-primary text-primary-foreground text-xs font-semibold"
                  >
                    {ta("common.approve")}
                  </button>
                  <button
                    onClick={() => reject(s.id)}
                    className="px-3 h-9 rounded-full ring-1 ring-border/60 text-xs font-medium hover:bg-destructive/10 hover:text-destructive"
                  >
                    {ta("common.reject")}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SourceBadge({ source }: { source: string }) {
  const map: Record<string, { color: string; label: string }> = {
    client: { color: "#7AB87A", label: "Client" },
    guide: { color: "#1F9BB4", label: "Guide" },
    ai: { color: "#B47AC9", label: "AI" },
  };
  const cfg = map[source] || map.ai;
  return (
    <span
      className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
      style={{ background: `color-mix(in srgb, ${cfg.color} 15%, transparent)`, color: cfg.color }}
    >
      {cfg.label}
    </span>
  );
}



type AppUser = {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  is_admin: boolean;
};

function UsersPanel() {
  const { ta } = useAdminI18n();
  const listFn = useServerFn(listAppUsers);
  const setRoleFn = useServerFn(setAdminRole);
  const inviteFn = useServerFn(inviteAdminUser);
  const deleteFn = useServerFn(deleteAppUser);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listFn();
      setUsers(res.users);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [listFn]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (u: AppUser) => {
    if (u.is_admin && !confirm(ta("users.confirmRemoveAdmin", { email: u.email }))) return;
    try {
      await setRoleFn({ data: { user_id: u.id, grant: !u.is_admin } });
      toast.success(u.is_admin ? ta("users.adminRemoved") : ta("users.adminGranted"));
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const removeUser = async (u: AppUser) => {
    if (!confirm(ta("users.confirmDelete", { email: u.email }))) return;
    try {
      await deleteFn({ data: { user_id: u.id } });
      toast.success(ta("users.deleted"));
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setInviting(true);
    try {
      const res = await inviteFn({ data: { email } });
      toast.success(res.existed ? ta("users.adminGrantedExisting") : ta("users.inviteSentSimple"));
      setEmail("");
      await load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="mt-6 grid gap-6 md:grid-cols-2">
      <form onSubmit={invite} className="rounded-3xl bg-card p-6 ring-1 ring-border/60 h-fit">
        <h2 className="font-display text-lg font-semibold">{ta("users.inviteAdmin")}</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {ta("users.inviteHint")}
        </p>
        <div className="mt-4">
          <Field label="Email" value={email} onChange={setEmail} placeholder="new-admin@example.com" />
        </div>
        <button
          type="submit"
          disabled={inviting}
          className="mt-5 inline-flex items-center gap-2 h-11 px-6 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
        >
          <Plus className="h-4 w-4" /> {inviting ? ta("common.sending") : ta("users.inviteBtn")}
        </button>
      </form>

      <div className="rounded-3xl bg-card p-6 ring-1 ring-border/60">
        <h2 className="font-display text-lg font-semibold">{ta("users.all", { n: users.length })}</h2>
        {loading ? (
          <p className="mt-4 text-sm text-muted-foreground">{ta("common.loading")}</p>
        ) : (
          <ul className="mt-4 divide-y divide-border/60">
            {users.length === 0 && (
              <li className="py-4 text-sm text-muted-foreground">{ta("users.empty")}</li>
            )}
            {users.map((u) => (
              <li key={u.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium truncate flex items-center gap-2">
                    {u.email}
                    {u.is_admin && (
                      <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-semibold uppercase">
                        {ta("users.adminBadge")}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {ta("users.joined")} {new Date(u.created_at).toLocaleDateString()}
                    {u.last_sign_in_at && ` · ${ta("users.lastLogin")} ${new Date(u.last_sign_in_at).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggle(u)}
                    className={`h-9 px-3 rounded-full text-xs font-semibold ${
                      u.is_admin
                        ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                        : "bg-primary text-primary-foreground hover:opacity-90"
                    }`}
                  >
                    {u.is_admin ? ta("users.removeAdmin") : ta("users.makeAdmin")}
                  </button>
                  <button
                    onClick={() => removeUser(u)}
                    className="h-9 px-3 rounded-full text-xs font-semibold border border-destructive/40 text-destructive hover:bg-destructive/10"
                  >
                    {ta("common.delete")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}



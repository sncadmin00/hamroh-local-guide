import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Compass, Trash2, Plus, Upload, ImageIcon, Video, Mail, Tag } from "lucide-react";
import { CategoryIcon } from "@/components/CategoryIcon";
import { inviteGuideToPortal } from "@/lib/admin-portal.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Sancho" }] }),
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
  customer_email: string;
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
};

type Category = {
  id: string;
  slug: string;
  name: string;
  icon: string;
  description: string;
  sort_order: number;
};

type GuideCategoryLink = { guide_id: string; category_id: string };

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
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState<"bookings" | "applications" | "cities" | "guides" | "articles" | "social">("bookings");
  const [cities, setCities] = useState<City[]>([]);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [embeds, setEmbeds] = useState<Embed[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [applications, setApplications] = useState<GuideApplication[]>([]);

  const loadData = useCallback(async () => {
    const [c, g, a, e, b, ap] = await Promise.all([
      supabase.from("cities").select("*").order("sort_order"),
      supabase.from("guides").select("*").order("sort_order"),
      supabase.from("articles").select("*").order("sort_order").order("created_at", { ascending: false }),
      supabase.from("social_embeds").select("*").order("sort_order"),
      supabase.from("bookings").select("*, guides(name, slug)").order("created_at", { ascending: false }),
      supabase.from("guide_applications").select("*").order("created_at", { ascending: false }),
    ]);
    if (c.data) setCities(c.data as City[]);
    if (g.data) setGuides(g.data as Guide[]);
    if (a.data) setArticles(a.data as Article[]);
    if (e.data) setEmbeds(e.data as Embed[]);
    if (b.data) setBookings(b.data as Booking[]);
    if (ap.data) setApplications(ap.data as GuideApplication[]);
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
        toast.error("Admin access required");
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
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/30 px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <Link to="/" className="flex items-center gap-2 mb-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Compass className="h-5 w-5" />
          </div>
          <span className="font-display text-xl font-semibold">Sancho</span>
        </Link>

        <h1 className="font-display text-3xl font-semibold">Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage cities, guides, articles and social embeds.</p>

        <div className="mt-6 inline-flex flex-wrap rounded-full bg-card p-1 ring-1 ring-border/60">
          <button
            onClick={() => setTab("bookings")}
            className={`px-4 h-9 rounded-full text-sm font-medium ${tab === "bookings" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            Orders ({bookings.length})
          </button>
          <button
            onClick={() => setTab("applications")}
            className={`px-4 h-9 rounded-full text-sm font-medium ${tab === "applications" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            Applications ({applications.filter((a) => a.status === "pending").length})
          </button>
          <button
            onClick={() => setTab("cities")}
            className={`px-4 h-9 rounded-full text-sm font-medium ${tab === "cities" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            Cities ({cities.length})
          </button>
          <button
            onClick={() => setTab("guides")}
            className={`px-4 h-9 rounded-full text-sm font-medium ${tab === "guides" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            Guides ({guides.length})
          </button>
          <button
            onClick={() => setTab("articles")}
            className={`px-4 h-9 rounded-full text-sm font-medium ${tab === "articles" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            Articles ({articles.length})
          </button>
          <button
            onClick={() => setTab("social")}
            className={`px-4 h-9 rounded-full text-sm font-medium ${tab === "social" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            Social ({embeds.length})
          </button>
        </div>

        {tab === "bookings" && <BookingsPanel bookings={bookings} reload={loadData} />}
        {tab === "applications" && <ApplicationsPanel applications={applications} reload={loadData} />}
        {tab === "cities" && <CitiesPanel cities={cities} reload={loadData} />}
        {tab === "guides" && <GuidesPanel guides={guides} cities={cities} reload={loadData} />}
        {tab === "articles" && <ArticlesPanel articles={articles} cities={cities} reload={loadData} />}
        {tab === "social" && <SocialPanel embeds={embeds} cities={cities} reload={loadData} />}
      </div>
    </div>
  );
}

function CitiesPanel({ cities, reload }: { cities: City[]; reload: () => Promise<void> }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [saving, setSaving] = useState(false);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !slug || !lat || !lng) {
      toast.error("Fill all fields");
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
    toast.success("City added");
    setName("");
    setSlug("");
    setLat("");
    setLng("");
    await reload();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this city?")) return;
    const { error } = await supabase.from("cities").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      await reload();
    }
  };

  return (
    <div className="mt-6 grid gap-6 md:grid-cols-2">
      <form onSubmit={add} className="rounded-3xl bg-card p-6 ring-1 ring-border/60 h-fit">
        <h2 className="font-display text-lg font-semibold">Add a city</h2>
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
          <Plus className="h-4 w-4" /> {saving ? "Saving…" : "Add city"}
        </button>
      </form>

      <div className="rounded-3xl bg-card p-6 ring-1 ring-border/60">
        <h2 className="font-display text-lg font-semibold">Cities</h2>
        <ul className="mt-4 divide-y divide-border/60">
          {cities.length === 0 && (
            <li className="py-4 text-sm text-muted-foreground">No cities yet.</li>
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
                aria-label="Delete"
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
  reload,
}: {
  guides: Guide[];
  cities: City[];
  reload: () => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [cityId, setCityId] = useState("");
  const [tagline, setTagline] = useState("");
  const [bio, setBio] = useState("");
  const [price, setPrice] = useState("");
  const [photo, setPhoto] = useState("");
  const [specialties, setSpecialties] = useState("");
  const [languages, setLanguages] = useState("");
  const [verified, setVerified] = useState(true);
  const [instantBook, setInstantBook] = useState(false);
  const [saving, setSaving] = useState(false);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !slug || !cityId) {
      toast.error("Name, slug and city are required");
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
      languages: languages
        ? languages.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      verified,
      instant_book: instantBook,
      sort_order: guides.length,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Guide added");
    setName("");
    setSlug("");
    setTagline("");
    setBio("");
    setPrice("");
    setPhoto("");
    setSpecialties("");
    setLanguages("");
    await reload();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this guide?")) return;
    const { error } = await supabase.from("guides").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      await reload();
    }
  };

  if (cities.length === 0) {
    return (
      <div className="mt-6 rounded-3xl bg-card p-6 ring-1 ring-border/60 text-sm text-muted-foreground">
        Add at least one city before creating guides.
      </div>
    );
  }

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <form onSubmit={add} className="rounded-3xl bg-card p-6 ring-1 ring-border/60 h-fit">
        <h2 className="font-display text-lg font-semibold">Add a guide</h2>
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
              <option value="">Select city…</option>
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
          <Field
            label="Languages (comma separated)"
            value={languages}
            onChange={setLanguages}
            placeholder="English, Russian, Uzbek"
          />
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
          <Plus className="h-4 w-4" /> {saving ? "Saving…" : "Add guide"}
        </button>
      </form>

      <div className="rounded-3xl bg-card p-6 ring-1 ring-border/60">
        <h2 className="font-display text-lg font-semibold">Guides</h2>
        <ul className="mt-4 divide-y divide-border/60">
          {guides.length === 0 && (
            <li className="py-4 text-sm text-muted-foreground">No guides yet.</li>
          )}
          {guides.map((g) => {
            const city = cities.find((c) => c.id === g.city_id);
            return (
              <li key={g.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{g.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {city?.name ?? "—"} · ${Number(g.price_per_day).toFixed(0)}/day {g.user_id && <span className="ml-1 text-emerald-600">· portal linked</span>}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <InvitePortalButton guide={g} reload={reload} />
                  <button
                    onClick={() => remove(g.id)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function InvitePortalButton({ guide, reload }: { guide: Guide; reload: () => void }) {
  const invite = useServerFn(inviteGuideToPortal);
  const [busy, setBusy] = useState(false);
  const onClick = async () => {
    const email = window.prompt(`Send portal invite to which email for ${guide.name}?`);
    if (!email) return;
    setBusy(true);
    try {
      const res = await invite({ data: { guide_id: guide.id, email } });
      toast.success(res.existed ? "User linked & magic link sent" : "Invite email sent");
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
      title={guide.user_id ? "Re-send invite / re-link" : "Invite to guide portal"}
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
      toast.error("Title and slug required");
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
    if (error || !data) { setSaving(false); toast.error(error?.message ?? "Failed"); return; }
    if (cityIds.length > 0) {
      const { error: linkErr } = await supabase
        .from("article_cities")
        .insert(cityIds.map((city_id) => ({ article_id: data.id, city_id })));
      if (linkErr) toast.error(linkErr.message);
    }
    setSaving(false);
    toast.success("Article added");
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
    else { toast.success(next ? "Published" : "Unpublished"); await reload(); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this article?")) return;
    const { error } = await supabase.from("articles").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); await reload(); }
  };

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <form onSubmit={add} className="rounded-3xl bg-card p-6 ring-1 ring-border/60 h-fit">
        <h2 className="font-display text-lg font-semibold">Add an article</h2>
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
            Publish immediately
          </label>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="mt-5 inline-flex items-center gap-2 h-11 px-6 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
        >
          <Plus className="h-4 w-4" /> {saving ? "Saving…" : "Add article"}
        </button>
      </form>

      <div className="rounded-3xl bg-card p-6 ring-1 ring-border/60">
        <h2 className="font-display text-lg font-semibold">Articles</h2>
        <ul className="mt-4 divide-y divide-border/60">
          {articles.length === 0 && <li className="py-4 text-sm text-muted-foreground">No articles yet.</li>}
          {articles.map((a) => (
            <li key={a.id} className="py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium truncate">{a.title}</p>
                <p className="text-xs text-muted-foreground truncate">/{a.slug} · {a.published ? "Published" : "Draft"}</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => togglePublished(a)}
                  className="h-9 px-3 rounded-full text-xs font-medium ring-1 ring-border/60 hover:bg-secondary/60"
                >
                  {a.published ? "Unpublish" : "Publish"}
                </button>
                <button
                  onClick={() => remove(a.id)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Delete"
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
  const [platform, setPlatform] = useState<Embed["platform"]>("instagram");
  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [cityIds, setCityIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) { toast.error("URL required"); return; }
    setSaving(true);
    const { data, error } = await supabase
      .from("social_embeds")
      .insert({ platform, url, caption, sort_order: embeds.length, visible: true })
      .select("id")
      .single();
    if (error || !data) { setSaving(false); toast.error(error?.message ?? "Failed"); return; }
    if (cityIds.length > 0) {
      const { error: linkErr } = await supabase
        .from("social_embed_cities")
        .insert(cityIds.map((city_id) => ({ embed_id: data.id, city_id })));
      if (linkErr) toast.error(linkErr.message);
    }
    setSaving(false);
    toast.success("Embed added");
    setUrl(""); setCaption(""); setCityIds([]);
    await reload();
  };

  const toggleVisible = async (em: Embed) => {
    const { error } = await supabase.from("social_embeds").update({ visible: !em.visible }).eq("id", em.id);
    if (error) toast.error(error.message);
    else await reload();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this embed?")) return;
    const { error } = await supabase.from("social_embeds").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); await reload(); }
  };

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <form onSubmit={add} className="rounded-3xl bg-card p-6 ring-1 ring-border/60 h-fit">
        <h2 className="font-display text-lg font-semibold">Add a social embed</h2>
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
          <Plus className="h-4 w-4" /> {saving ? "Saving…" : "Add embed"}
        </button>
      </form>

      <div className="rounded-3xl bg-card p-6 ring-1 ring-border/60">
        <h2 className="font-display text-lg font-semibold">Social embeds</h2>
        <ul className="mt-4 divide-y divide-border/60">
          {embeds.length === 0 && <li className="py-4 text-sm text-muted-foreground">No embeds yet.</li>}
          {embeds.map((em) => (
            <li key={em.id} className="py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium truncate capitalize">{em.platform} · {em.visible ? "Visible" : "Hidden"}</p>
                <p className="text-xs text-muted-foreground truncate">{em.url}</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => toggleVisible(em)}
                  className="h-9 px-3 rounded-full text-xs font-medium ring-1 ring-border/60 hover:bg-secondary/60"
                >
                  {em.visible ? "Hide" : "Show"}
                </button>
                <button
                  onClick={() => remove(em.id)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Delete"
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
      toast.success("Status updated");
      await reload();
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this booking?")) return;
    const { error } = await supabase.from("bookings").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      await reload();
    }
  };

  const statusBadge = (status: string) => {
    const base = "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium";
    if (status === "confirmed") return `${base} bg-primary/10 text-primary`;
    if (status === "cancelled") return `${base} bg-destructive/10 text-destructive`;
    return `${base} bg-accent/15 text-accent-foreground`;
  };

  return (
    <div className="mt-6 space-y-4">
      {/* Source stats */}
      <div className="rounded-3xl bg-card p-6 ring-1 ring-border/60">
        <h2 className="font-display text-lg font-semibold">Источники за 30 дней</h2>
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
          <h2 className="font-display text-lg font-semibold">Orders</h2>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as "all" | SourceKey)}
              className="h-8 rounded-full border border-input bg-background px-3 text-xs"
            >
              <option value="all">All sources</option>
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
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">No orders yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr className="border-b border-border/60">
                  <th className="py-2 pr-3">Created</th>
                  <th className="py-2 pr-3">Source</th>
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Guide</th>
                  <th className="py-2 pr-3">Customer</th>
                  <th className="py-2 pr-3">Guests</th>
                  <th className="py-2 pr-3">Total</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3 text-right">Actions</th>
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
                      <div className="text-xs text-muted-foreground">{b.customer_email}</div>
                      {b.notes && <div className="text-xs text-muted-foreground mt-1 max-w-[220px] truncate" title={b.notes}>{b.notes}</div>}
                    </td>
                    <td className="py-3 pr-3">{b.guests}</td>
                    <td className="py-3 pr-3 font-medium">${Number(b.total).toFixed(0)}</td>
                    <td className="py-3 pr-3">
                      <span className={statusBadge(b.status)}>{b.status}</span>
                    </td>
                    <td className="py-3 pr-3 text-right whitespace-nowrap">
                      <select
                        value={b.status}
                        onChange={(e) => setStatus(b.id, e.target.value)}
                        className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                      >
                        <option value="pending">pending</option>
                        <option value="confirmed">confirmed</option>
                        <option value="cancelled">cancelled</option>
                      </select>
                      <button
                        onClick={() => remove(b.id)}
                        className="ml-2 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        aria-label="Delete"
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
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const portraitRef = useRef<HTMLInputElement>(null);
  const photosRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  const filtered = applications.filter((a) => filter === "all" || a.status === filter);

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("guide_applications").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Status updated");
      await reload();
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this application?")) return;
    const { error } = await supabase.from("guide_applications").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
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
      else { toast.success("Portrait uploaded"); await reload(); }
    }
    setUploading((p) => ({ ...p, [appId + "-portrait"]: false }));
  };

  const handlePhotosUpload = async (appId: string, files: FileList) => {
    const app = applications.find((a) => a.id === appId);
    const current = app?.photo_urls?.length ?? 0;
    const toAdd = Math.min(files.length, 5 - current);
    if (toAdd <= 0) { toast.error("Max 5 photos"); return; }

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
      else { toast.success("Photos uploaded"); await reload(); }
    }
    setUploading((p) => ({ ...p, [appId + "-photos"]: false }));
  };

  const removePhoto = async (appId: string, url: string) => {
    const app = applications.find((a) => a.id === appId);
    if (!app) return;
    const next = (app.photo_urls ?? []).filter((u) => u !== url);
    const { error } = await supabase.from("guide_applications").update({ photo_urls: next }).eq("id", appId);
    if (error) toast.error(error.message);
    else { toast.success("Photo removed"); await reload(); }
  };

  const handleVideoUpload = async (appId: string, file: File) => {
    setUploading((p) => ({ ...p, [appId + "-video"]: true }));
    const ext = file.name.split(".").pop() ?? "mp4";
    const path = `${appId}/video.${ext}`;
    const url = await uploadFile("guide-application-videos", file, path);
    if (url) {
      const { error } = await supabase.from("guide_applications").update({ video_url: url }).eq("id", appId);
      if (error) toast.error(error.message);
      else { toast.success("Video uploaded"); await reload(); }
    }
    setUploading((p) => ({ ...p, [appId + "-video"]: false }));
  };

  const removeVideo = async (appId: string) => {
    const { error } = await supabase.from("guide_applications").update({ video_url: null }).eq("id", appId);
    if (error) toast.error(error.message);
    else { toast.success("Video removed"); await reload(); }
  };

  return (
    <div className="mt-6 rounded-3xl bg-card p-6 ring-1 ring-border/60">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">Guide applications</h2>
        <div className="inline-flex rounded-full bg-secondary/60 p-1">
          {(["pending", "approved", "rejected", "all"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 h-8 rounded-full text-xs font-medium capitalize ${filter === s ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">No applications.</p>
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
                      <span className={badge(a.status)}>{a.status}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {a.city} · {a.experience_years} yr · {new Date(a.created_at).toLocaleDateString()}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground truncate">
                      {a.email} · {a.phone}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setExpanded(open ? null : a.id)}
                      className="h-8 px-3 rounded-full text-xs font-medium ring-1 ring-border/60 hover:bg-secondary/60"
                    >
                      {open ? "Hide" : "Details"}
                    </button>
                    {a.status !== "approved" && (
                      <button
                        onClick={() => setStatus(a.id, "approved")}
                        className="h-8 px-3 rounded-full text-xs font-medium bg-primary text-primary-foreground"
                      >
                        Approve
                      </button>
                    )}
                    {a.status !== "rejected" && (
                      <button
                        onClick={() => setStatus(a.id, "rejected")}
                        className="h-8 px-3 rounded-full text-xs font-medium ring-1 ring-border/60 hover:bg-destructive/10 hover:text-destructive"
                      >
                        Reject
                      </button>
                    )}
                    <button
                      onClick={() => remove(a.id)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {open && (
                  <div className="mt-3 rounded-2xl bg-secondary/40 p-4 text-sm space-y-4">
                    {/* Portrait */}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Portrait</p>
                      <div className="flex flex-wrap items-center gap-2">
                        {a.portrait_url ? (
                          <a href={a.portrait_url} target="_blank" rel="noreferrer">
                            <img src={a.portrait_url} alt="Portrait" className="h-24 w-24 rounded-xl object-cover ring-1 ring-border/60" />
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">No portrait</span>
                        )}
                        <button
                          onClick={() => portraitRef.current?.click()}
                          disabled={uploading[a.id + "-portrait"]}
                          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-xs font-medium ring-1 ring-border/60 hover:bg-secondary/60 disabled:opacity-50"
                        >
                          <Upload className="h-3.5 w-3.5" />
                          {uploading[a.id + "-portrait"] ? "Uploading…" : a.portrait_url ? "Replace" : "Upload portrait"}
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

                    {/* Photos */}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Tour photos ({photoCount}/5)</p>
                      <div className="flex flex-wrap items-center gap-2">
                        {a.photo_urls?.map((url) => (
                          <div key={url} className="relative group">
                            <a href={url} target="_blank" rel="noreferrer">
                              <img src={url} alt="Tour" className="h-24 w-24 rounded-xl object-cover ring-1 ring-border/60" />
                            </a>
                            <button
                              onClick={() => removePhoto(a.id, url)}
                              className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition"
                              title="Remove"
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
                            <span className="text-[10px]">{uploading[a.id + "-photos"] ? "…" : "Add photo"}</span>
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
                      <p className="text-xs font-medium text-muted-foreground mb-2">Video greeting</p>
                      <div className="flex flex-wrap items-center gap-2">
                        {a.video_url ? (
                          <div className="relative group">
                            <video src={a.video_url} controls className="w-full max-w-sm rounded-xl ring-1 ring-border/60" />
                            <button
                              onClick={() => removeVideo(a.id)}
                              className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center text-[10px]"
                              title="Remove video"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">No video</span>
                        )}
                        <button
                          onClick={() => videoRef.current?.click()}
                          disabled={uploading[a.id + "-video"]}
                          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-xs font-medium ring-1 ring-border/60 hover:bg-secondary/60 disabled:opacity-50"
                        >
                          <Video className="h-3.5 w-3.5" />
                          {uploading[a.id + "-video"] ? "Uploading…" : a.video_url ? "Replace" : "Upload video"}
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
                      <span className="text-xs text-muted-foreground">Specialization: </span>
                      {a.specialization}
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Languages: </span>
                      {a.languages.join(", ")}
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">About:</span>
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

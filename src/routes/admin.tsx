import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Compass, Trash2, Plus } from "lucide-react";

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
};

function AdminPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState<"cities" | "guides">("cities");
  const [cities, setCities] = useState<City[]>([]);
  const [guides, setGuides] = useState<Guide[]>([]);

  const loadData = useCallback(async () => {
    const [c, g] = await Promise.all([
      supabase.from("cities").select("*").order("sort_order"),
      supabase.from("guides").select("*").order("sort_order"),
    ]);
    if (c.data) setCities(c.data as City[]);
    if (g.data) setGuides(g.data as Guide[]);
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
          <span className="font-display text-xl font-semibold">Hamroh</span>
        </Link>

        <h1 className="font-display text-3xl font-semibold">Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage cities and guides.</p>

        <div className="mt-6 inline-flex rounded-full bg-card p-1 ring-1 ring-border/60">
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
        </div>

        {tab === "cities" ? (
          <CitiesPanel cities={cities} reload={loadData} />
        ) : (
          <GuidesPanel guides={guides} cities={cities} reload={loadData} />
        )}
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
                    {city?.name ?? "—"} · ${Number(g.price_per_day).toFixed(0)}/day
                  </p>
                </div>
                <button
                  onClick={() => remove(g.id)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
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

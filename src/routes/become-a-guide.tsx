import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, CheckCircle2, Upload, X } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { notifyAdminsOfGuideApplication } from "@/lib/newsletter.functions";
import { useI18n } from "@/lib/i18n";



export const Route = createFileRoute("/become-a-guide")({
  head: () => ({
    meta: [
      { title: "Become a Guide — Hamroh" },
      { name: "description", content: "Join Hamroh as a local guide and share your city with travelers." },
    ],
  }),
  component: BecomeAGuidePage,
});

const MAX_PHOTOS = 5;
const MAX_PHOTO_BYTES = 8 * 1024 * 1024; // 8 MB
const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50 MB

const schema = z.object({
  full_name: z.string().trim().min(2, "Please enter your full name").max(120),
  email: z.string().trim().email("Invalid email").max(255),
  phone: z.string().trim().min(5, "Please enter a phone number").max(40),
  city: z.string().trim().min(1, "Select or type your city").max(80),
  languages: z.string().trim().min(2, "List at least one language").max(200),
  specialization: z.string().trim().min(2, "Tell us what you specialize in").max(200),
  experience_years: z.coerce.number().int().min(0).max(80),
  about: z.string().trim().min(20, "Please write at least a couple of sentences").max(2000),
});

function randomKey(name: string) {
  const safe = name.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${crypto.randomUUID()}-${safe}`;
}

async function uploadTo(bucket: string, file: File): Promise<string> {
  const key = randomKey(file.name);
  const { error } = await supabase.storage.from(bucket).upload(key, file, {
    contentType: file.type,
    cacheControl: "3600",
  });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(key);
  return data.publicUrl;
}

function BecomeAGuidePage() {
  const notifyAdmins = useServerFn(notifyAdminsOfGuideApplication);
  const { tCategory } = useI18n();

  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; slug: string; name: string; icon: string }[]>([]);

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [portrait, setPortrait] = useState<File | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    city: "",
    languages: "",
    specialization: "",
    experience_years: "",
    about: "",
  });

  useEffect(() => {
    supabase
      .from("cities")
      .select("id, name")
      .order("sort_order")
      .then(({ data }) => {
        if (data) setCities(data);
      });
    supabase
      .from("categories")
      .select("id, slug, name, icon")
      .order("sort_order")
      .then(({ data }) => {
        if (data) setCategories(data);
      });
  }, []);

  const toggleCategory = (id: string) =>
    setSelectedCategories((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));


  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const onPhotosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(e.target.files ?? []);
    e.target.value = "";
    const merged = [...photos, ...incoming].slice(0, MAX_PHOTOS);
    for (const f of incoming) {
      if (f.size > MAX_PHOTO_BYTES) {
        toast.error(`${f.name} is larger than 8 MB`);
        return;
      }
    }
    setPhotos(merged);
  };

  const onVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (f && f.size > MAX_VIDEO_BYTES) {
      toast.error("Video must be under 50 MB");
      return;
    }
    setVideo(f);
  };

  const onPortraitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (f && f.size > MAX_PHOTO_BYTES) {
      toast.error("Portrait must be under 8 MB");
      return;
    }
    setPortrait(f);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const languages = parsed.data.languages
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      let portrait_url: string | null = null;
      let video_url: string | null = null;
      const photo_urls: string[] = [];

      if (portrait) portrait_url = await uploadTo("guide-application-photos", portrait);
      for (const p of photos) {
        photo_urls.push(await uploadTo("guide-application-photos", p));
      }
      if (video) video_url = await uploadTo("guide-application-videos", video);

      const { data: inserted, error } = await supabase.from("guide_applications").insert({
        full_name: parsed.data.full_name,
        email: parsed.data.email,
        phone: parsed.data.phone,
        city: parsed.data.city,
        languages,
        specialization: parsed.data.specialization,
        experience_years: parsed.data.experience_years,
        about: parsed.data.about,
        user_id: userData.user?.id ?? null,
        portrait_url,
        video_url,
        photo_urls,
        category_ids: selectedCategories,
      }).select("id").single();
      if (error) throw error;

      // Notify admins (fire-and-forget)
      if (inserted?.id) {
        notifyAdmins({ data: { application_id: inserted.id } }).catch((err: unknown) =>
          console.error("Admin notify failed", err),
        );
      }


      toast.success("Application submitted");
      setSubmitted(true);

    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
      </div>
      <div className="mx-auto max-w-2xl">
        <div className="text-center">
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
            Become a Guide
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Share your local knowledge, meet travelers from around the world, and earn on your own schedule.
          </p>
        </div>

        {submitted ? (
          <div className="mt-10 rounded-3xl border border-border/60 bg-secondary/30 p-8 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
            <h2 className="mt-4 font-display text-2xl font-semibold">Thanks for applying!</h2>
            <p className="mt-2 text-muted-foreground">
              We will review your application and get back to you within 2 business days.
            </p>
            <Button asChild className="mt-6 rounded-full px-6">
              <Link to="/">Back to home</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-10 rounded-3xl border border-border/60 bg-card p-6 sm:p-8 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Full name">
                <input required value={form.full_name} onChange={set("full_name")} className={inputCls} placeholder="John Doe" />
              </FormField>
              <FormField label="Email">
                <input required type="email" value={form.email} onChange={set("email")} className={inputCls} placeholder="you@example.com" />
              </FormField>
              <FormField label="Phone / WhatsApp">
                <input required value={form.phone} onChange={set("phone")} className={inputCls} placeholder="+998 ..." />
              </FormField>
              <FormField label="City">
                {cities.length > 0 ? (
                  <select required value={form.city} onChange={set("city")} className={inputCls}>
                    <option value="">Select a city…</option>
                    {cities.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                    <option value="Other">Other</option>
                  </select>
                ) : (
                  <input required value={form.city} onChange={set("city")} className={inputCls} placeholder="Samarkand" />
                )}
              </FormField>
              <FormField label="Languages (comma-separated)">
                <input required value={form.languages} onChange={set("languages")} className={inputCls} placeholder="English, Russian, Uzbek" />
              </FormField>
              <FormField label="Years of experience">
                <input required type="number" min={0} max={80} value={form.experience_years} onChange={set("experience_years")} className={inputCls} placeholder="3" />
              </FormField>
            </div>
            <FormField label="Specialization">
              <input required value={form.specialization} onChange={set("specialization")} className={inputCls} placeholder="Food tours, history, architecture…" />
            </FormField>

            {categories.length > 0 && (
              <FormField label="Your categories (pick all that apply)">
                <div className="mt-1 flex flex-wrap gap-2">
                  {categories.map((c) => {
                    const active = selectedCategories.includes(c.id);
                    return (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => toggleCategory(c.id)}
                        className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input bg-background text-foreground hover:bg-secondary/40"
                        }`}
                      >
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </FormField>
            )}

            <FormField label="About you">
              <textarea required rows={5} value={form.about} onChange={set("about")} className={inputCls} placeholder="Tell us about yourself, the tours you love to lead, and why travelers should pick you." />
            </FormField>


            <div className="pt-2 border-t border-border/60" />

            <FormField label="Portrait photo (you, looking friendly)">
              {portrait ? (
                <FilePreview name={portrait.name} onRemove={() => setPortrait(null)}>
                  <img src={URL.createObjectURL(portrait)} alt="Portrait preview" className="h-20 w-20 rounded-lg object-cover" />
                </FilePreview>
              ) : (
                <UploadField accept="image/*" onChange={onPortraitChange} hint="JPG or PNG, up to 8 MB" />
              )}
            </FormField>

            <FormField label={`Tour photos (up to ${MAX_PHOTOS})`}>
              <div className="space-y-2">
                {photos.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {photos.map((f, i) => (
                      <div key={i} className="relative">
                        <img src={URL.createObjectURL(f)} alt={f.name} className="h-20 w-20 rounded-lg object-cover ring-1 ring-border" />
                        <button
                          type="button"
                          onClick={() => setPhotos((arr) => arr.filter((_, j) => j !== i))}
                          className="absolute -top-1.5 -right-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-background ring-1 ring-border text-muted-foreground hover:text-destructive"
                          aria-label="Remove"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {photos.length < MAX_PHOTOS && (
                  <UploadField accept="image/*" multiple onChange={onPhotosChange} hint={`JPG or PNG, up to 8 MB each · ${MAX_PHOTOS - photos.length} left`} />
                )}
              </div>
            </FormField>

            <FormField label="Video message (optional)">
              {video ? (
                <FilePreview name={video.name} onRemove={() => setVideo(null)}>
                  <video src={URL.createObjectURL(video)} className="h-20 w-32 rounded-lg object-cover bg-black" />
                </FilePreview>
              ) : (
                <UploadField accept="video/*" onChange={onVideoChange} hint="MP4 or MOV, up to 50 MB · short intro about yourself" />
              )}
            </FormField>

            <div className="pt-2">
              <Button type="submit" size="lg" disabled={saving} className="rounded-full px-8 w-full sm:w-auto">
                {saving ? "Submitting…" : "Submit application"}
              </Button>
              <p className="mt-3 text-sm text-muted-foreground">
                We will review your application within 2 business days.
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

const inputCls =
  "mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring";

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function UploadField({
  accept,
  multiple,
  onChange,
  hint,
}: {
  accept: string;
  multiple?: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  hint: string;
}) {
  return (
    <label className="mt-1 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-input bg-background px-4 py-3 text-sm text-muted-foreground hover:bg-secondary/40 transition-colors">
      <Upload className="h-4 w-4" />
      <span className="flex-1">
        <span className="font-medium text-foreground">Click to upload</span>
        <span className="block text-xs">{hint}</span>
      </span>
      <input type="file" accept={accept} multiple={multiple} onChange={onChange} className="hidden" />
    </label>
  );
}

function FilePreview({
  name,
  onRemove,
  children,
}: {
  name: string;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-1 flex items-center gap-3 rounded-xl border border-input bg-background p-2">
      {children}
      <span className="flex-1 truncate text-sm">{name}</span>
      <button
        type="button"
        onClick={onRemove}
        className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        aria-label="Remove"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

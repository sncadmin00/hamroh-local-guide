import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  ImagePlus,
  Loader2,
  Sparkles,
  Upload,
  Video,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { notifyAdminsOfGuideApplication } from "@/lib/newsletter.functions";
import { generateGuideBio } from "@/lib/guide-application.functions";
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
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const DRAFT_KEY = "guide-application-draft-v1";

const finalSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(5).max(40),
  telegram: z.string().trim().max(64).optional().default(""),
  city: z.string().trim().min(1).max(80),
  languages: z.array(z.string().min(1)).min(1).max(20),
  specialization: z.string().trim().min(2).max(200),
  experience_years: z.coerce.number().int().min(0).max(80),
  about: z.string().trim().min(20).max(2000),
});

type FormState = {
  full_name: string;
  email: string;
  phone: string;
  telegram: string;
  city: string;
  experience_years: string;
  specialization: string;
  about: string;
  ai_highlight: string;
  ai_style: string;
  ai_why: string;
};

const emptyForm: FormState = {
  full_name: "",
  email: "",
  phone: "",
  telegram: "",
  city: "",
  experience_years: "",
  specialization: "",
  about: "",
  ai_highlight: "",
  ai_style: "",
  ai_why: "",
};

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
  const generateBio = useServerFn(generateGuideBio);
  const { tCategory } = useI18n();

  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; slug: string; name: string; icon: string }[]>([]);
  const [allLanguages, setAllLanguages] = useState<{ id: string; name: string }[]>([]);

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [portrait, setPortrait] = useState<File | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  // Load draft
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        form?: FormState;
        languages?: string[];
        categories?: string[];
      };
      if (parsed.form) setForm({ ...emptyForm, ...parsed.form });
      if (parsed.languages) setSelectedLanguages(parsed.languages);
      if (parsed.categories) setSelectedCategories(parsed.categories);
    } catch {
      // ignore
    }
  }, []);

  // Save draft
  useEffect(() => {
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ form, languages: selectedLanguages, categories: selectedCategories }),
      );
    } catch {
      // ignore
    }
  }, [form, selectedLanguages, selectedCategories]);

  useEffect(() => {
    supabase.from("cities").select("id, name").order("sort_order").then(({ data }) => {
      if (data) setCities(data);
    });
    supabase.from("categories").select("id, slug, name, icon").order("sort_order").then(({ data }) => {
      if (data) setCategories(data);
    });
    supabase.from("languages").select("id, name").eq("is_active", true).order("sort_order").then(({ data }) => {
      if (data) setAllLanguages(data);
    });
  }, []);

  // Prefill from authenticated user (Google login etc.)
  useEffect(() => {
    const applyUser = (user: { email?: string | null; phone?: string | null; user_metadata?: Record<string, unknown> } | null) => {
      if (!user) return;
      const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
      const nameFromAuth = (meta.full_name as string) || (meta.name as string) || "";
      const emailFromAuth = user.email ?? "";
      const phoneFromAuth = user.phone ?? "";
      setForm((f) => ({
        ...f,
        full_name: f.full_name || nameFromAuth,
        email: f.email || emailFromAuth,
        phone: f.phone || phoneFromAuth,
      }));
    };
    supabase.auth.getUser().then(({ data }) => applyUser(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      applyUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);


  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const toggleLanguage = (name: string) =>
    setSelectedLanguages((s) => (s.includes(name) ? s.filter((x) => x !== name) : [...s, name]));
  const toggleCategory = (id: string) =>
    setSelectedCategories((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  // Photo / video handlers
  const addPhotos = (files: File[]) => {
    for (const f of files) {
      if (f.size > MAX_PHOTO_BYTES) {
        toast.error(`${f.name} больше 8 MB`);
        return;
      }
    }
    setPhotos((p) => [...p, ...files].slice(0, MAX_PHOTOS));
  };
  const setOnePhoto = (
    file: File | null,
    limit: number,
    setter: (f: File | null) => void,
    label: string,
  ) => {
    if (file && file.size > limit) {
      toast.error(`${label} слишком большой`);
      return;
    }
    setter(file);
  };

  const onAiGenerate = async () => {
    setAiLoading(true);
    try {
      const specializations = selectedCategories
        .map((id) => categories.find((c) => c.id === id)?.name)
        .filter(Boolean) as string[];
      const { bio } = await generateBio({
        data: {
          name: form.full_name,
          city: form.city,
          years: form.experience_years,
          languages: selectedLanguages,
          specializations,
          specialization: form.specialization,
          highlight: form.ai_highlight,
          style: form.ai_style,
          why: form.ai_why,
          language_hint: "auto",
        },
      });
      update("about", bio);
      toast.success("Готово! Можно отредактировать текст.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Не получилось сгенерировать";
      toast.error(msg);
    } finally {
      setAiLoading(false);
    }
  };

  // ---- Steps definition ----
  const steps: Array<{
    title: string;
    subtitle?: string;
    canNext: () => boolean;
    nextHint?: string;
    render: () => React.ReactNode;
  }> = [
    {
      title: "Привет! Станьте гидом на Hamroh",
      subtitle: "Это займёт 3–5 минут. Расскажите о себе, добавьте фото и короткое видео — мы поможем с текстом «о себе».",
      canNext: () => true,
      render: () => (
        <div className="space-y-4 text-sm text-muted-foreground">
          <ul className="space-y-2">
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" /> Несколько простых вопросов</li>
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" /> AI поможет написать «о себе»</li>
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" /> Сделайте фото и видео прямо с камеры</li>
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" /> Ответ от нас в течение 2 рабочих дней</li>
          </ul>
        </div>
      ),
    },
    {
      title: "Как с вами связаться?",
      canNext: () =>
        form.full_name.trim().length >= 2 &&
        /^\S+@\S+\.\S+$/.test(form.email) &&
        form.phone.trim().length >= 5,
      nextHint: "Заполните имя, email и телефон",
      render: () => (
        <div className="grid gap-4">
          <Field label="Имя и фамилия">
            <input autoFocus className={inputCls} value={form.full_name} onChange={(e) => update("full_name", e.target.value)} placeholder="Алишер Каримов" />
          </Field>
          <Field label="Email">
            <input type="email" className={inputCls} value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="you@example.com" />
          </Field>
          <Field label="Телефон">
            <input className={inputCls} value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+998 ..." />
          </Field>
          <Field label="Telegram (необязательно)">
            <input className={inputCls} value={form.telegram} onChange={(e) => update("telegram", e.target.value)} placeholder="@username" />
          </Field>
        </div>
      ),
    },
    {
      title: "Откуда вы и как давно водите?",
      canNext: () => form.city.trim().length > 0 && form.experience_years !== "",
      nextHint: "Укажите город и опыт",
      render: () => (
        <div className="grid gap-4">
          <Field label="Город">
            {cities.length > 0 ? (
              <select className={inputCls} value={form.city} onChange={(e) => update("city", e.target.value)}>
                <option value="">Выберите город…</option>
                {cities.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                <option value="Other">Другой</option>
              </select>
            ) : (
              <input className={inputCls} value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="Самарканд" />
            )}
          </Field>
          <Field label="Лет опыта">
            <input type="number" min={0} max={80} className={inputCls} value={form.experience_years} onChange={(e) => update("experience_years", e.target.value)} placeholder="3" />
          </Field>
        </div>
      ),
    },
    {
      title: "На каких языках водите туры?",
      canNext: () => selectedLanguages.length > 0,
      nextHint: "Выберите хотя бы один язык",
      render: () => (
        <div className="flex flex-wrap gap-2">
          {allLanguages.length === 0 && <p className="text-sm text-muted-foreground">Загрузка…</p>}
          {allLanguages.map((lng) => {
            const active = selectedLanguages.includes(lng.name);
            return (
              <button
                type="button"
                key={lng.id}
                onClick={() => toggleLanguage(lng.name)}
                className={chipCls(active)}
              >
                {lng.name}
              </button>
            );
          })}
        </div>
      ),
    },
    {
      title: "Чем вы специализируетесь?",
      canNext: () => form.specialization.trim().length >= 2,
      nextHint: "Опишите вашу специализацию",
      render: () => (
        <div className="space-y-4">
          {categories.length > 0 && (
            <Field label="Категории (можно несколько)">
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => {
                  const active = selectedCategories.includes(c.id);
                  return (
                    <button type="button" key={c.id} onClick={() => toggleCategory(c.id)} className={chipCls(active)}>
                      {tCategory(c.slug, c.name)}
                    </button>
                  );
                })}
              </div>
            </Field>
          )}
          <Field label="Коротко о специализации">
            <input className={inputCls} value={form.specialization} onChange={(e) => update("specialization", e.target.value)} placeholder="Гастротуры, история, архитектура…" />
          </Field>
        </div>
      ),
    },
    {
      title: "Расскажите о себе — AI поможет",
      subtitle: "Ответьте в двух словах на 3 вопроса, и AI составит чернетку. Вы её сможете отредактировать.",
      canNext: () => form.about.trim().length >= 20,
      nextHint: "Сгенерируйте или напишите текст «о себе» (минимум 20 символов)",
      render: () => (
        <div className="space-y-4">
          <Field label="Что вы обязательно покажете гостям?">
            <textarea rows={2} className={inputCls} value={form.ai_highlight} onChange={(e) => update("ai_highlight", e.target.value)} placeholder="Например: рассвет на Регистане, чайхану дедушки…" />
          </Field>
          <Field label="Как вы ведёте туры?">
            <textarea rows={2} className={inputCls} value={form.ai_style} onChange={(e) => update("ai_style", e.target.value)} placeholder="Неспешно, с историями, дегустациями…" />
          </Field>
          <Field label="Почему вам это нравится?">
            <textarea rows={2} className={inputCls} value={form.ai_why} onChange={(e) => update("ai_why", e.target.value)} placeholder="Люблю знакомить людей с настоящим Узбекистаном…" />
          </Field>

          <Button type="button" onClick={onAiGenerate} disabled={aiLoading} className="rounded-full w-full sm:w-auto">
            {aiLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Пишу…</> : <><Sparkles className="h-4 w-4 mr-2" /> {form.about ? "Переписать с AI" : "Составить с AI"}</>}
          </Button>

          <Field label="«О себе» (можно отредактировать)">
            <textarea rows={6} className={inputCls} value={form.about} onChange={(e) => update("about", e.target.value)} placeholder="Здесь появится текст после генерации, или напишите сами." />
            <div className="mt-1 text-xs text-muted-foreground">{form.about.trim().length} символов</div>
          </Field>
        </div>
      ),
    },
    {
      title: "Ваш портрет",
      subtitle: "Доброжелательное фото — это первое, что увидят путешественники.",
      canNext: () => true,
      render: () => (
        <PhotoSlot
          file={portrait}
          onPick={(f) => setOnePhoto(f, MAX_PHOTO_BYTES, setPortrait, "Портрет")}
          onClear={() => setPortrait(null)}
          accept="image/*"
          captureMode="user"
        />
      ),
    },
    {
      title: "Фото ваших туров",
      subtitle: `До ${MAX_PHOTOS} фотографий. Покажите атмосферу — места, людей, моменты.`,
      canNext: () => true,
      render: () => (
        <PhotoGrid
          photos={photos}
          onAdd={addPhotos}
          onRemove={(i) => setPhotos((arr) => arr.filter((_, j) => j !== i))}
          max={MAX_PHOTOS}
        />
      ),
    },
    {
      title: "Короткое видео-приветствие",
      subtitle: "Не обязательно, но очень помогает. 15–30 секунд — расскажите, кто вы и что покажете.",
      canNext: () => true,
      render: () => (
        <VideoSlot
          file={video}
          onPick={(f) => setOnePhoto(f, MAX_VIDEO_BYTES, setVideo, "Видео")}
          onClear={() => setVideo(null)}
        />
      ),
    },
    {
      title: "Проверьте и отправьте",
      canNext: () => true,
      render: () => (
        <ReviewBlock
          form={form}
          languages={selectedLanguages}
          categories={selectedCategories.map((id) => categories.find((c) => c.id === id)?.name).filter(Boolean) as string[]}
          portrait={portrait}
          photos={photos}
          video={video}
        />
      ),
    },
  ];

  const total = steps.length;
  const current = steps[step];
  const isLast = step === total - 1;

  const goNext = () => {
    if (!current.canNext()) {
      if (current.nextHint) toast.error(current.nextHint);
      return;
    }
    setStep((s) => Math.min(s + 1, total - 1));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const goBack = () => {
    setStep((s) => Math.max(s - 1, 0));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onSubmit = async () => {
    const parsed = finalSchema.safeParse({ ...form, languages: selectedLanguages });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Проверьте форму");
      return;
    }
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      let portrait_url: string | null = null;
      let video_url: string | null = null;
      const photo_urls: string[] = [];

      if (portrait) portrait_url = await uploadTo("guide-application-photos", portrait);
      for (const p of photos) photo_urls.push(await uploadTo("guide-application-photos", p));
      if (video) video_url = await uploadTo("guide-application-videos", video);

      const { data: inserted, error } = await supabase
        .from("guide_applications")
        .insert({
          full_name: parsed.data.full_name,
          email: parsed.data.email,
          phone: parsed.data.phone,
          telegram: parsed.data.telegram ?? "",
          city: parsed.data.city,
          languages: parsed.data.languages,
          specialization: parsed.data.specialization,
          experience_years: parsed.data.experience_years,
          about: parsed.data.about,
          user_id: userData.user?.id ?? null,
          portrait_url,
          video_url,
          photo_urls,
          category_ids: selectedCategories,
        })
        .select("id")
        .single();
      if (error) throw error;

      if (inserted?.id) {
        notifyAdmins({ data: { application_id: inserted.id } }).catch((err: unknown) =>
          console.error("Admin notify failed", err),
        );
      }

      try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }

      toast.success("Заявка отправлена");
      setSubmitted(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Что-то пошло не так";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 sm:py-12">
      <div className="mb-6">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> На главную
        </Link>
      </div>

      <div className="mx-auto max-w-2xl">
        {submitted ? (
          <div className="rounded-3xl border border-border/60 bg-secondary/30 p-8 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
            <h2 className="mt-4 font-display text-2xl font-semibold">Спасибо за заявку!</h2>
            <p className="mt-2 text-muted-foreground">Мы свяжемся с вами в течение 2 рабочих дней.</p>
            <Button asChild className="mt-6 rounded-full px-6"><Link to="/">На главную</Link></Button>
          </div>
        ) : (
          <>
            {/* Progress */}
            <div className="mb-6">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                <span>Шаг {step + 1} из {total}</span>
                <span>{Math.round(((step + 1) / total) * 100)}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${((step + 1) / total) * 100}%` }}
                />
              </div>
            </div>

            <div className="rounded-3xl border border-border/60 bg-card p-6 sm:p-8">
              <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">{current.title}</h1>
              {current.subtitle && <p className="mt-2 text-sm text-muted-foreground">{current.subtitle}</p>}

              <div key={step} className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {current.render()}
              </div>

              <div className="mt-8 flex items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={goBack}
                  disabled={step === 0}
                  className="rounded-full"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" /> Назад
                </Button>
                {isLast ? (
                  <Button type="button" onClick={onSubmit} disabled={saving} size="lg" className="rounded-full px-6">
                    {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Отправка…</> : "Отправить заявку"}
                  </Button>
                ) : (
                  <Button type="button" onClick={goNext} size="lg" className="rounded-full px-6">
                    {step === 0 ? "Начать" : "Далее"} <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ---- Subcomponents ----

const inputCls =
  "mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring";

const chipCls = (active: boolean) =>
  `rounded-full border px-3 py-1.5 text-sm transition-colors ${
    active
      ? "border-primary bg-primary text-primary-foreground"
      : "border-input bg-background text-foreground hover:bg-secondary/40"
  }`;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function PhotoSlot({
  file,
  onPick,
  onClear,
  accept,
  captureMode,
}: {
  file: File | null;
  onPick: (f: File | null) => void;
  onClear: () => void;
  accept: string;
  captureMode?: "user" | "environment";
}) {
  const previewUrl = useObjectUrl(file);
  if (file) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-input bg-background p-3">
        {previewUrl && <img src={previewUrl} alt="" className="h-24 w-24 rounded-lg object-cover" />}
        <span className="flex-1 truncate text-sm">{file.name}</span>
        <button type="button" onClick={onClear} className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Убрать">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <PickButton icon={<Camera className="h-4 w-4" />} label="Снять камерой" accept={accept} capture={captureMode} onPick={(fs) => onPick(fs[0] ?? null)} />
      <PickButton icon={<ImagePlus className="h-4 w-4" />} label="Выбрать из галереи" accept={accept} onPick={(fs) => onPick(fs[0] ?? null)} />
    </div>
  );
}

function VideoSlot({ file, onPick, onClear }: { file: File | null; onPick: (f: File | null) => void; onClear: () => void }) {
  const previewUrl = useObjectUrl(file);
  if (file) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-input bg-background p-3">
        {previewUrl && <video src={previewUrl} className="h-24 w-32 rounded-lg object-cover bg-black" controls />}
        <span className="flex-1 truncate text-sm">{file.name}</span>
        <button type="button" onClick={onClear} className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Убрать">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <PickButton icon={<Video className="h-4 w-4" />} label="Записать видео" accept="video/*" capture="user" onPick={(fs) => onPick(fs[0] ?? null)} />
      <PickButton icon={<Upload className="h-4 w-4" />} label="Загрузить файл" accept="video/*" onPick={(fs) => onPick(fs[0] ?? null)} />
    </div>
  );
}

function PhotoGrid({ photos, onAdd, onRemove, max }: { photos: File[]; onAdd: (fs: File[]) => void; onRemove: (i: number) => void; max: number }) {
  return (
    <div className="space-y-3">
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((f, i) => <GridThumb key={i} file={f} onRemove={() => onRemove(i)} />)}
        </div>
      )}
      {photos.length < max && (
        <div className="grid gap-2 sm:grid-cols-2">
          <PickButton icon={<Camera className="h-4 w-4" />} label="Снять камерой" accept="image/*" capture="environment" onPick={(fs) => onAdd(fs.slice(0, max - photos.length))} />
          <PickButton icon={<ImagePlus className="h-4 w-4" />} label={`Выбрать (${max - photos.length} осталось)`} accept="image/*" multiple onPick={(fs) => onAdd(fs.slice(0, max - photos.length))} />
        </div>
      )}
    </div>
  );
}

function GridThumb({ file, onRemove }: { file: File; onRemove: () => void }) {
  const url = useObjectUrl(file);
  return (
    <div className="relative aspect-square">
      {url && <img src={url} alt="" className="h-full w-full rounded-lg object-cover ring-1 ring-border" />}
      <button type="button" onClick={onRemove} className="absolute -top-1.5 -right-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-background ring-1 ring-border text-muted-foreground hover:text-destructive" aria-label="Убрать">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function PickButton({
  icon,
  label,
  accept,
  capture,
  multiple,
  onPick,
}: {
  icon: React.ReactNode;
  label: string;
  accept: string;
  capture?: "user" | "environment";
  multiple?: boolean;
  onPick: (files: File[]) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-input bg-background px-4 py-4 text-sm font-medium hover:bg-secondary/40 transition-colors"
      >
        {icon} {label}
      </button>
      <input
        ref={ref}
        type="file"
        accept={accept}
        capture={capture}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (files.length) onPick(files);
        }}
      />
    </>
  );
}

function ReviewBlock({
  form,
  languages,
  categories,
  portrait,
  photos,
  video,
}: {
  form: FormState;
  languages: string[];
  categories: string[];
  portrait: File | null;
  photos: File[];
  video: File | null;
}) {
  const rows: Array<[string, string]> = [
    ["Имя", form.full_name || "—"],
    ["Email", form.email || "—"],
    ["Телефон", form.phone || "—"],
    ["Telegram", form.telegram || "—"],
    ["Город", form.city || "—"],
    ["Опыт (лет)", form.experience_years || "—"],
    ["Языки", languages.join(", ") || "—"],
    ["Категории", categories.join(", ") || "—"],
    ["Специализация", form.specialization || "—"],
  ];
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/60 divide-y divide-border/60">
        {rows.map(([k, v]) => (
          <div key={k} className="flex gap-3 px-3 py-2 text-sm">
            <span className="w-32 shrink-0 text-muted-foreground">{k}</span>
            <span className="flex-1 break-words">{v}</span>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border/60 p-3 text-sm">
        <div className="text-muted-foreground text-xs mb-1">О себе</div>
        <p className="whitespace-pre-wrap">{form.about || "—"}</p>
      </div>
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span>Портрет: {portrait ? "✓" : "—"}</span>
        <span>· Фото: {photos.length}</span>
        <span>· Видео: {video ? "✓" : "—"}</span>
      </div>
    </div>
  );
}

function useObjectUrl(file: File | null) {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  return url;
}

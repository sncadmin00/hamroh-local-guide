import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/become-a-guide")({
  head: () => ({
    meta: [
      { title: "Become a Guide — Sancho" },
      { name: "description", content: "Join Sancho as a local guide and share your city with travelers." },
    ],
  }),
  component: BecomeAGuidePage,
});

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

function BecomeAGuidePage() {
  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
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
  }, []);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const languages = parsed.data.languages
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const { error } = await supabase.from("guide_applications").insert({
      full_name: parsed.data.full_name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      city: parsed.data.city,
      languages,
      specialization: parsed.data.specialization,
      experience_years: parsed.data.experience_years,
      about: parsed.data.about,
      user_id: userData.user?.id ?? null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Application submitted");
    setSubmitted(true);
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
            <FormField label="About you">
              <textarea required rows={5} value={form.about} onChange={set("about")} className={inputCls} placeholder="Tell us about yourself, the tours you love to lead, and why travelers should pick you." />
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

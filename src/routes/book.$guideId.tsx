import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { Star, BadgeCheck, Zap, ArrowLeft, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useGuide } from "@/lib/content-queries";

export const Route = createFileRoute("/book/$guideId")({
  head: () => ({ meta: [{ title: "Book a guide — Sancho" }] }),
  component: BookPage,
});

function BookPage() {
  const { guideId } = Route.useParams();
  const { data: guide, isLoading } = useGuide(guideId);
  const navigate = useNavigate();
  const [confirmed, setConfirmed] = useState(false);
  const [form, setForm] = useState({
    date: "",
    guests: 2,
    experience: "",
    name: "",
    email: "",
    notes: "",
  });

  if (isLoading || !guide) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <div className="container mx-auto px-4 py-24 text-center text-muted-foreground">Loading…</div>
        <SiteFooter />
      </div>
    );
  }

  const experiences = guide.experiences.length > 0 ? guide.experiences : [{ title: "Full day with guide", duration: "8 hours", price: guide.pricePerDay }];
  const currentExperience = form.experience || experiences[0].title;

  const handleFieldChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };
  const handleGuestChange = (e: ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, guests: Math.max(1, Number(e.target.value) || 1) });
  };
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setConfirmed(true);
    window.scrollTo({ top: 0 });
  };

  const selectedExperience = experiences.find((e) => e.title === currentExperience) ?? experiences[0];
  const total = selectedExperience.price * form.guests;
  const fee = Math.round(total * 0.08);

  if (confirmed) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <section className="container mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Check className="h-8 w-8" />
          </div>
          <h1 className="mt-6 font-display text-4xl font-semibold">You're booked!</h1>
          <p className="mt-3 text-muted-foreground">
            {guide.name} will meet you in {guide.city} on{" "}
            <span className="font-medium text-foreground">{form.date}</span>. We've sent a confirmation to{" "}
            <span className="font-medium text-foreground">{form.email}</span>.
          </p>
          <div className="mt-8 flex gap-3">
            <Link to="/guides" className="rounded-full border border-input px-5 py-2.5 text-sm font-medium">Browse more</Link>
            <Link to="/" className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">Back home</Link>
          </div>
        </section>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="container mx-auto px-4 pt-6">
        <button onClick={() => navigate({ to: "/guides/$guideId", params: { guideId: guide.id } })} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to profile
        </button>
      </div>

      <section className="container mx-auto px-4 py-8 md:py-12">
        <h1 className="font-display text-4xl font-semibold md:text-5xl">Confirm your booking</h1>
        <p className="mt-2 text-muted-foreground">A few details and you're all set.</p>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <form onSubmit={handleSubmit} className="space-y-6 rounded-3xl bg-card p-6 ring-1 ring-border/60 md:p-8">
            <div>
              <label className="text-sm font-medium">Experience</label>
              <select value={currentExperience} onChange={handleFieldChange} name="experience" className="mt-2 h-12 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-ring">
                {experiences.map((e) => (
                  <option key={e.title} value={e.title}>{e.title} — ${e.price} · {e.duration}</option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Date</label>
                <input type="date" required value={form.date} onChange={handleFieldChange} name="date" className="mt-2 h-12 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-sm font-medium">Guests</label>
                <input type="number" min={1} max={12} value={form.guests} onChange={handleGuestChange} className="mt-2 h-12 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Your name</label>
                <input required value={form.name} onChange={handleFieldChange} name="name" className="mt-2 h-12 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="Jane Doe" />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <input type="email" required value={form.email} onChange={handleFieldChange} name="email" className="mt-2 h-12 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="you@email.com" />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Notes for your guide (optional)</label>
              <textarea value={form.notes} onChange={handleFieldChange} name="notes" rows={4} className="mt-2 w-full rounded-xl border border-input bg-background p-4 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="Anything specific you'd love to see or do…" />
            </div>

            <button type="submit" className="inline-flex h-12 w-full items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.01]">
              {guide.instantBook ? `Confirm & book — $${total + fee}` : `Request booking — $${total + fee}`}
            </button>
            <p className="text-center text-xs text-muted-foreground">You won't be charged until your guide confirms.</p>
          </form>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl bg-card p-6 ring-1 ring-border/60 shadow-[var(--shadow-card)]">
              <div className="flex gap-4">
                <img src={guide.photo} alt={guide.name} width={80} height={80} loading="lazy" className="h-20 w-20 rounded-xl object-cover" />
                <div>
                  <h3 className="font-display text-xl font-semibold">{guide.name}</h3>
                  <p className="text-sm text-muted-foreground">{guide.city}</p>
                  <p className="mt-1 inline-flex items-center gap-1 text-sm"><Star className="h-3.5 w-3.5 fill-accent text-accent" />{guide.rating} · {guide.reviews} reviews</p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {guide.verified && <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"><BadgeCheck className="h-3.5 w-3.5" /> Verified</span>}
                {guide.instantBook && <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2.5 py-1 text-xs font-medium text-accent"><Zap className="h-3.5 w-3.5" /> Instant</span>}
              </div>

              <div className="mt-6 space-y-3 border-t border-border/60 pt-5 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">{selectedExperience.title}</span><span>${selectedExperience.price}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">× {form.guests} guests</span><span>${total}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Service fee</span><span>${fee}</span></div>
                <div className="flex justify-between border-t border-border/60 pt-3 text-base font-semibold"><span>Total</span><span>${total + fee}</span></div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

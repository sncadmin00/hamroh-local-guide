import { createFileRoute, Link } from "@tanstack/react-router";
import { BadgeCheck, Globe2, Zap, Sparkles, ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How it works — Sancho" },
      { name: "description", content: "Verified guides, multiple languages, instant booking. Here's how Sancho works." },
      { property: "og:title", content: "How it works — Sancho" },
      { property: "og:description", content: "Verified guides, multiple languages, instant booking." },
    ],
  }),
  component: HowItWorksPage,
});

const features = [
  { icon: BadgeCheck, title: "Verified guides", text: "Every guide is licensed, interviewed, and reviewed by real travelers." },
  { icon: Globe2, title: "Multiple languages", text: "English, Russian, French, German, Korean, and more." },
  { icon: Zap, title: "Instant booking", text: "Confirm your guide in seconds — no waiting, no back-and-forth." },
  { icon: Sparkles, title: "Local experiences", text: "From artisan workshops to hidden tea houses tourists never see." },
];

function HowItWorksPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="container mx-auto px-4 py-16 md:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="font-display text-4xl md:text-5xl font-semibold">Travel like a local, instantly.</h1>
            <p className="mt-4 text-lg text-muted-foreground">A new way to discover destinations — through the eyes of the people who live there.</p>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div key={f.title} className="rounded-2xl bg-card p-6 ring-1 ring-border/60 shadow-[var(--shadow-card)]">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 font-display text-xl font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="container mx-auto px-4 pb-24">
          <div className="relative overflow-hidden rounded-3xl p-10 md:p-16" style={{ background: "var(--gradient-hero)" }}>
            <div className="relative max-w-2xl text-primary-foreground">
              <h2 className="font-display text-4xl font-semibold md:text-5xl">Your adventure starts here.</h2>
              <p className="mt-4 text-lg opacity-90">Browse guides, read reviews, book in seconds.</p>
              <Link to="/guides" className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-background px-7 text-sm font-semibold text-foreground transition-transform hover:scale-[1.02]">
                Explore all guides <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

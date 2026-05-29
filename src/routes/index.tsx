import { createFileRoute, Link } from "@tanstack/react-router";
import { BadgeCheck, Globe2, Zap, Sparkles, Search, ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { GuideCard } from "@/components/GuideCard";
import { guides } from "@/data/guides";
import hero from "@/assets/hero-bukhara.jpg";
import tashkent from "@/assets/city-tashkent.jpg";
import samarkand from "@/assets/city-samarkand.jpg";
import bukhara from "@/assets/city-bukhara.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hamroh — Trusted local guides in Uzbekistan" },
      { name: "description", content: "Book verified local guides in Tashkent, Samarkand, and Bukhara. Authentic experiences with instant booking." },
    ],
  }),
  component: Home,
});

const cities = [
  { name: "Tashkent", img: tashkent, blurb: "The modern capital — bazaars, metro mosaics, food scene." },
  { name: "Samarkand", img: samarkand, blurb: "Registan Square and the heart of the Silk Road." },
  { name: "Bukhara", img: bukhara, blurb: "Sacred madrasas and 2,000 years of stories." },
];

const features = [
  { icon: BadgeCheck, title: "Verified guides", text: "Every guide is licensed, interviewed, and reviewed by real travelers." },
  { icon: Globe2, title: "Multiple languages", text: "English, Russian, French, German, Korean, and more." },
  { icon: Zap, title: "Instant booking", text: "Confirm your guide in seconds — no waiting, no back-and-forth." },
  { icon: Sparkles, title: "Local experiences", text: "From artisan workshops to hidden tea houses tourists never see." },
];

function Home() {
  return (
    <div className="min-h-screen">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <img src={hero} alt="Bukhara old town at golden hour with turquoise domes and minarets" width={1920} height={1280} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/70" />
        <div className="relative container mx-auto px-4 pb-32 pt-28 md:pb-44 md:pt-40">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" /> Now in Tashkent · Samarkand · Bukhara
            </span>
            <h1 className="mt-5 font-display text-5xl font-semibold leading-[1.05] text-white md:text-7xl">
              Uzbekistan, with someone who calls it home.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-white/85">
              Hamroh connects you with verified local guides for unforgettable experiences across the Silk Road's greatest cities.
            </p>




            <div className="mt-4">
              <Link
                to="/ai"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white/15 px-5 text-sm font-medium text-white backdrop-blur ring-1 ring-white/30 hover:bg-white/25 transition-colors"
              >
                <Sparkles className="h-4 w-4" /> Or ask AI to find your perfect guide
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-white/80">
              <span className="inline-flex items-center gap-2"><BadgeCheck className="h-4 w-4" /> 100% verified guides</span>
              <span className="inline-flex items-center gap-2">★ 4.9 average rating</span>
              <span className="inline-flex items-center gap-2"><Zap className="h-4 w-4" /> Free cancellation</span>
            </div>
          </div>
        </div>
      </section>

      {/* Search bar */}
      <section className="container mx-auto px-4 relative z-10 -mt-8 md:-mt-10">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl bg-background/95 p-3 shadow-[var(--shadow-elegant)] ring-1 ring-border/60 backdrop-blur sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center gap-3 px-3 py-2">
            <Search className="h-5 w-5 text-muted-foreground" />
            <div className="w-full text-base font-medium text-foreground">All cities</div>
          </div>
          <Link
            to="/guides"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02]"
          >
            Find a guide <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Features */}

      <section id="how" className="container mx-auto px-4 py-20 md:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-4xl font-semibold md:text-5xl">Travel like a local, instantly.</h2>
          <p className="mt-4 text-lg text-muted-foreground">A new way to discover Uzbekistan — through the eyes of the people who live there.</p>
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

      {/* Cities */}
      <section id="cities" className="bg-secondary/40 py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-4xl font-semibold md:text-5xl">Three cities, three worlds.</h2>
              <p className="mt-3 max-w-xl text-muted-foreground">Pick a destination and meet the guides who know it inside out.</p>
            </div>
            <Link to="/guides" className="hidden text-sm font-medium text-primary hover:underline md:inline">All guides →</Link>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {cities.map((c) => (
              <Link
                key={c.name}
                to="/guides"
                search={{ city: c.name }}
                className="group relative aspect-[4/5] overflow-hidden rounded-2xl"
              >
                <img src={c.img} alt={c.name} loading="lazy" width={1200} height={800} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                  <h3 className="font-display text-3xl font-semibold">{c.name}</h3>
                  <p className="mt-2 text-sm text-white/85">{c.blurb}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured guides */}
      <section className="container mx-auto px-4 py-20 md:py-28">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-4xl font-semibold md:text-5xl">Meet a few of our guides</h2>
            <p className="mt-3 max-w-xl text-muted-foreground">Handpicked locals with the highest ratings from travelers like you.</p>
          </div>
          <Link to="/guides" className="hidden text-sm font-medium text-primary hover:underline md:inline">See all →</Link>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {guides.map((g) => <GuideCard key={g.id} guide={g} />)}
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 pb-24">
        <div className="relative overflow-hidden rounded-3xl p-10 md:p-16" style={{ background: "var(--gradient-hero)" }}>
          <div className="relative max-w-2xl text-primary-foreground">
            <h2 className="font-display text-4xl font-semibold md:text-5xl">Your Uzbekistan adventure starts here.</h2>
            <p className="mt-4 text-lg opacity-90">Browse guides, read reviews, book in seconds.</p>
            <Link to="/guides" className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-background px-7 text-sm font-semibold text-foreground transition-transform hover:scale-[1.02]">
              Explore all guides <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

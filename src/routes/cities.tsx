import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CityPicker } from "@/components/CityPicker";
import { useState } from "react";
import tashkent from "@/assets/city-tashkent.jpg";
import samarkand from "@/assets/city-samarkand.jpg";
import bukhara from "@/assets/city-bukhara.jpg";

export const Route = createFileRoute("/cities")({
  head: () => ({
    meta: [
      { title: "Cities — Hamroh" },
      { name: "description", content: "Explore guides across Tashkent, Samarkand, and Bukhara." },
      { property: "og:title", content: "Cities — Hamroh" },
      { property: "og:description", content: "Explore guides across Tashkent, Samarkand, and Bukhara." },
    ],
  }),
  component: CitiesPage,
});

const cities = [
  { name: "Tashkent", img: tashkent, blurb: "The modern capital — bazaars, metro mosaics, food scene." },
  { name: "Samarkand", img: samarkand, blurb: "Registan Square and the heart of the Silk Road." },
  { name: "Bukhara", img: bukhara, blurb: "Sacred madrasas and 2,000 years of stories." },
];

function CitiesPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-2xl">
          <h1 className="font-display text-4xl md:text-5xl font-semibold">Three cities, three worlds.</h1>
          <p className="mt-3 text-muted-foreground">Pick a destination and meet the guides who know it inside out.</p>
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
                <h2 className="font-display text-3xl font-semibold">{c.name}</h2>
                <p className="mt-2 text-sm text-white/85">{c.blurb}</p>
              </div>
            </Link>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

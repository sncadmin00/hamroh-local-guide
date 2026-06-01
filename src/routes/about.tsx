import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useI18n } from "@/lib/i18n";

const URL = "https://hamroh-local-guide.lovable.app/about";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Hamroh — Verified local guides" },
      { name: "description", content: "Hamroh connects travellers with verified local guides across Central Asia and beyond." },
      { property: "og:title", content: "About Hamroh" },
      { property: "og:description", content: "We help travellers discover places through the eyes of locals." },
      { property: "og:url", content: URL },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: AboutPage,
});

function AboutPage() {
  const { lang } = useI18n();
  const t = {
    en: {
      h: "We're building a kinder way to travel",
      lead: "Hamroh ('companion' in Tajik & Uzbek) pairs you with verified local guides who turn a city into a story.",
      missionH: "Our mission",
      mission: "Make authentic local experiences accessible everywhere — and make sure local guides earn fairly.",
      teamH: "Team",
      team: "A small remote team based across Samarkand, Tashkent and Berlin. Engineers, ex-tour guides, and travellers.",
      contactH: "Get in touch",
      contact: "Write to us — partnerships, press, or a quick hello.",
      cta: "Contact us",
    },
    ru: {
      h: "Создаём бережный способ путешествовать",
      lead: "Hamroh («спутник» по-таджикски и узбекски) соединяет вас с проверенными местными гидами, которые превращают город в историю.",
      missionH: "Наша миссия",
      mission: "Сделать настоящие локальные впечатления доступными везде — и гарантировать, что гиды получают честную оплату.",
      teamH: "Команда",
      team: "Небольшая удалённая команда из Самарканда, Ташкента и Берлина. Инженеры, бывшие гиды и путешественники.",
      contactH: "Связаться",
      contact: "Партнёрства, пресса или просто привет — пишите.",
      cta: "Написать нам",
    },
    uz: {
      h: "Sayohatning yangi va e'tiborli usulini quryapmiz",
      lead: "Hamroh sizni shaharni hikoyaga aylantiruvchi tasdiqlangan mahalliy hamrohlar bilan bog'laydi.",
      missionH: "Vazifamiz",
      mission: "Haqiqiy mahalliy tajribalarni hamma joyda mavjud qilish va hamrohlar adolatli daromad olishiga ishonch hosil qilish.",
      teamH: "Jamoa",
      team: "Samarqand, Toshkent va Berlinda joylashgan kichik masofaviy jamoa.",
      contactH: "Aloqa",
      contact: "Hamkorlik, matbuot yoki shunchaki salom — bizga yozing.",
      cta: "Yozish",
    },
  }[lang] ?? null;
  const L = t!;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="container mx-auto max-w-3xl px-4 py-16 md:py-24">
          <h1 className="font-display text-4xl md:text-5xl font-semibold leading-tight">{L.h}</h1>
          <p className="mt-5 text-lg text-muted-foreground">{L.lead}</p>
        </section>

        <section className="border-t border-border/60 bg-secondary/30">
          <div className="container mx-auto max-w-3xl px-4 py-12 md:py-16 grid gap-10 md:grid-cols-2">
            <div>
              <h2 className="font-display text-2xl font-semibold">{L.missionH}</h2>
              <p className="mt-3 text-foreground/80 leading-relaxed">{L.mission}</p>
            </div>
            <div>
              <h2 className="font-display text-2xl font-semibold">{L.teamH}</h2>
              <p className="mt-3 text-foreground/80 leading-relaxed">{L.team}</p>
            </div>
          </div>
        </section>

        <section className="container mx-auto max-w-3xl px-4 py-12 md:py-16">
          <h2 className="font-display text-2xl font-semibold">{L.contactH}</h2>
          <p className="mt-3 text-foreground/80">{L.contact}</p>
          <Link to="/contact" className="mt-5 inline-flex h-11 px-5 items-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
            {L.cta}
          </Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useI18n } from "@/lib/i18n";

const URL = "https://hamroh-local-guide.lovable.app/support";
const EMAIL = "admin@supernovacarriers.com";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Support — Hamroh" },
      { name: "description", content: "Get help with your Hamroh account, bookings, or the mobile app." },
      { property: "og:title", content: "Support — Hamroh" },
      { property: "og:description", content: "Get help with your Hamroh account, bookings, or the mobile app." },
      { property: "og:url", content: URL },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: SupportPage,
});

function SupportPage() {
  const { lang } = useI18n();
  const L = {
    en: {
      h: "Support",
      sub: "We're here to help — with bookings, guide payouts, refunds, or the mobile app.",
      email: "Email us",
      faq: "Browse FAQ",
      contact: "Contact form",
      delete: "Delete your account",
      deleteBody:
        "You can delete your Hamroh account and personal data at any time from the mobile app: Settings → Account → Delete account. Completed bookings are anonymized and kept for financial reporting, as described in our Privacy Policy. Prefer email? Write to us at the address above.",
      operator: "Operated by Ark Labs LLC, 52/23 Rustaveli St., 100100 Tashkent, Uzbekistan.",
    },
    ru: {
      h: "Поддержка",
      sub: "Поможем с бронированиями, выплатами гидам, возвратами или мобильным приложением.",
      email: "Написать нам",
      faq: "FAQ",
      contact: "Форма связи",
      delete: "Удалить аккаунт",
      deleteBody:
        "Вы можете удалить свой аккаунт и персональные данные в любой момент из мобильного приложения: Настройки → Аккаунт → Удалить аккаунт. Завершённые бронирования обезличиваются и сохраняются для финансовой отчётности, как описано в Политике конфиденциальности. Или напишите нам на email выше.",
      operator: "Оператор: ООО «Ark Labs», ул. Руставели 52/23, 100100 Ташкент, Узбекистан.",
    },
    uz: {
      h: "Yordam",
      sub: "Bronlar, hamroh to'lovlari, qaytarish yoki mobil ilova bo'yicha yordam beramiz.",
      email: "Email yozing",
      faq: "FAQ",
      contact: "Aloqa formasi",
      delete: "Akkauntni o'chirish",
      deleteBody:
        "Hamroh akkauntingizni va shaxsiy ma'lumotlaringizni istalgan vaqtda mobil ilovadan o'chirishingiz mumkin: Sozlamalar → Akkaunt → Akkauntni o'chirish. Yakunlangan bronlar Maxfiylik siyosatida ko'rsatilganidek moliyaviy hisobot uchun anonimlashtiriladi.",
      operator: "Operator: Ark Labs MChJ, Rustaveli ko'ch. 52/23, 100100 Toshkent, O'zbekiston.",
    },
  }[lang] ?? null;
  const t = L!;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 container mx-auto max-w-2xl px-4 py-12 md:py-16">
        <h1 className="font-display text-3xl md:text-4xl font-semibold">{t.h}</h1>
        <p className="mt-3 text-muted-foreground">{t.sub}</p>

        <div className="mt-8 space-y-4">
          <a
            href={`mailto:${EMAIL}`}
            className="block rounded-2xl border border-input bg-background p-5 hover:bg-muted transition"
          >
            <div className="text-sm font-semibold">{t.email}</div>
            <div className="mt-1 text-sm text-muted-foreground">{EMAIL}</div>
          </a>
          <a
            href="/faq"
            className="block rounded-2xl border border-input bg-background p-5 hover:bg-muted transition"
          >
            <div className="text-sm font-semibold">{t.faq}</div>
            <div className="mt-1 text-sm text-muted-foreground">/faq</div>
          </a>
          <a
            href="/contact"
            className="block rounded-2xl border border-input bg-background p-5 hover:bg-muted transition"
          >
            <div className="text-sm font-semibold">{t.contact}</div>
            <div className="mt-1 text-sm text-muted-foreground">/contact</div>
          </a>
        </div>

        <section className="mt-10">
          <h2 className="font-display text-lg font-semibold">{t.delete}</h2>
          <p className="mt-2 text-foreground/80 leading-relaxed">{t.deleteBody}</p>
        </section>

        <p className="mt-10 text-xs text-muted-foreground">{t.operator}</p>
      </main>
      <SiteFooter />
    </div>
  );
}

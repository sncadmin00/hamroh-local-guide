import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { submitFeedback } from "@/lib/feedback.functions";
import { useI18n } from "@/lib/i18n";

const URL = "https://hamroh-local-guide.lovable.app/contact";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Hamroh" },
      { name: "description", content: "Send us a message — questions, feedback, partnership." },
      { property: "og:title", content: "Contact — Hamroh" },
      { property: "og:description", content: "Send us a message — questions, feedback, partnership." },
      { property: "og:url", content: URL },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: ContactPage,
});

function ContactPage() {
  const { lang } = useI18n();
  const submit = useServerFn(submitFeedback);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const L = {
    en: { h: "Get in touch", sub: "Questions, feedback, or partnership ideas — we read every message.", name: "Your name", email: "Email", message: "Message", send: "Send", sent: "Thanks! We'll get back to you soon." },
    ru: { h: "Связаться с нами", sub: "Вопросы, отзывы или идеи партнёрства — мы читаем каждое сообщение.", name: "Ваше имя", email: "Email", message: "Сообщение", send: "Отправить", sent: "Спасибо! Скоро ответим." },
    uz: { h: "Biz bilan bog'laning", sub: "Savollar, fikrlar yoki hamkorlik takliflari — har bir xabarni o'qiymiz.", name: "Ismingiz", email: "Email", message: "Xabar", send: "Yuborish", sent: "Rahmat! Tez orada javob beramiz." },
  }[lang] ?? null;
  const t = L!;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    try {
      await submit({ data: { name, email, message, page: typeof window !== "undefined" ? window.location.pathname : "" } });
      setSent(true);
      setName(""); setEmail(""); setMessage("");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 container mx-auto max-w-xl px-4 py-12 md:py-16">
        <h1 className="font-display text-3xl md:text-4xl font-semibold">{t.h}</h1>
        <p className="mt-3 text-muted-foreground">{t.sub}</p>

        {sent ? (
          <div className="mt-8 rounded-2xl bg-primary/10 p-6 text-primary">{t.sent}</div>
        ) : (
          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <input
              required maxLength={120}
              placeholder={t.name}
              value={name} onChange={(e) => setName(e.target.value)}
              className="w-full h-12 rounded-xl border border-input bg-background px-4 text-sm"
            />
            <input
              required type="email" maxLength={255}
              placeholder={t.email}
              value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full h-12 rounded-xl border border-input bg-background px-4 text-sm"
            />
            <textarea
              required minLength={5} maxLength={2000} rows={6}
              placeholder={t.message}
              value={message} onChange={(e) => setMessage(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm resize-none"
            />
            <button
              type="submit" disabled={sending}
              className="h-12 px-6 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
            >
              {sending ? "…" : t.send}
            </button>
          </form>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

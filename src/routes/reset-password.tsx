import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — Hamroh" },
      { name: "description", content: "Set a new password for your Hamroh account." },
      { property: "og:title", content: "Reset password — Hamroh" },
      { property: "og:description", content: "Set a new password for your Hamroh account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

const TXT = {
  en: { title: "Set a new password", ph: "New password", ph2: "Repeat password", save: "Save password", wait: "Please wait…", mismatch: "Passwords do not match.", invalid: "This link is invalid or has expired. Request a new one from the sign-in page.", done: "Password updated. Signing you in…", back: "Back to sign in" },
  ru: { title: "Новый пароль", ph: "Новый пароль", ph2: "Повторите пароль", save: "Сохранить пароль", wait: "Подождите…", mismatch: "Пароли не совпадают.", invalid: "Ссылка недействительна или устарела. Запросите новую на странице входа.", done: "Пароль изменён. Входим…", back: "Вернуться ко входу" },
  uz: { title: "Yangi parol", ph: "Yangi parol", ph2: "Parolni takrorlang", save: "Parolni saqlash", wait: "Kuting…", mismatch: "Parollar mos emas.", invalid: "Havola yaroqsiz yoki muddati o'tgan. Kirish sahifasidan yangisini so'rang.", done: "Parol yangilandi. Kirilmoqda…", back: "Kirishga qaytish" },
};

function ResetPasswordPage() {
  const { lang } = useI18n();
  const t = TXT[lang as "en" | "ru" | "uz"] ?? TXT.en;
  const navigate = useNavigate();
  const [ready, setReady] = useState<boolean | null>(null);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    const timer = window.setTimeout(() => setReady((r) => r ?? false), 4000);
    return () => {
      sub.subscription.unsubscribe();
      window.clearTimeout(timer);
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (pw !== pw2) return setError(t.mismatch);
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setLoading(false);
    if (error) return setError(error.message);
    setDone(true);
    window.setTimeout(() => navigate({ to: "/" }), 1500);
  };

  const input = "w-full h-11 rounded-xl border border-input bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="min-h-screen bg-secondary/30 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-3xl bg-card p-8 ring-1 ring-border/60 shadow-[var(--shadow-elegant)]">
        <h1 className="font-display text-2xl font-semibold">{t.title}</h1>
        {ready === false ? (
          <p className="mt-4 text-sm text-destructive">{t.invalid}</p>
        ) : done ? (
          <p className="mt-4 text-sm text-primary">{t.done}</p>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-3">
            <input type="password" required minLength={6} placeholder={t.ph} value={pw} onChange={(e) => setPw(e.target.value)} className={input} />
            <input type="password" required minLength={6} placeholder={t.ph2} value={pw2} onChange={(e) => setPw2(e.target.value)} className={input} />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button type="submit" disabled={loading || !ready} className="w-full h-11 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60">
              {loading || ready === null ? t.wait : t.save}
            </button>
          </form>
        )}
        <Link to="/login" className="mt-4 inline-block text-sm text-primary hover:underline">{t.back}</Link>
      </div>
    </div>
  );
}

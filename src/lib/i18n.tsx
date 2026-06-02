import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Lang = "en" | "uz" | "ru";

type Dict = Record<string, { en: string; uz: string; ru: string }>;

export const translations: Dict = {
  "nav.findGuide": { en: "Find a guide", uz: "Hamroh toping", ru: "Найти гида" },
  "nav.cities": { en: "Cities", uz: "Shaharlar", ru: "Города" },
  "nav.explore": { en: "Explore", uz: "Kashf eting", ru: "Обзор" },
  "nav.howItWorks": { en: "How it works", uz: "Qanday ishlaydi", ru: "Как это работает" },
  "nav.becomeGuide": { en: "Become a guide", uz: "Hamroh bo'ling", ru: "Стать гидом" },
  "nav.faq": { en: "FAQ", uz: "FAQ", ru: "FAQ" },
  "common.menu": { en: "Menu", uz: "Menyu", ru: "Меню" },
  "common.findUs": { en: "Find us:", uz: "Bizni toping:", ru: "Найти нас:" },
  "common.contactUs": { en: "Contact us:", uz: "Aloqa:", ru: "Связаться:" },
  "common.signIn": { en: "Sign in", uz: "Kirish", ru: "Войти" },
  "common.signOut": { en: "Sign out", uz: "Chiqish", ru: "Выйти" },
  "common.messages": { en: "Messages", uz: "Xabarlar", ru: "Сообщения" },
  "common.settings": { en: "Account settings", uz: "Hisob sozlamalari", ru: "Настройки аккаунта" },
  "common.admin": { en: "Admin", uz: "Admin", ru: "Админ" },
  "hero.title": { en: "Find your local guide", uz: "Mahalliy hamrohizni toping", ru: "Найдите своего местного гида" },
  "hero.subtitle": {
    en: "Describe the trip you want. Hamroh AI matches you with a verified local guide.",
    uz: "Qanday sayohat xohlayotganingizni yozing. Hamroh AI sizga tasdiqlangan mahalliy hamrohni topadi.",
    ru: "Опишите желаемую поездку. Hamroh AI подберёт вам проверенного местного гида.",
  },
  "hero.browse": {
    en: "Prefer to browse? Find a guide manually →",
    uz: "O'zingiz tanlamoqchimisiz? Hamrohni qo'lda toping →",
    ru: "Хотите выбрать сами? Найдите гида вручную →",
  },
  "hero.placeholder": {
    en: "e.g. English-speaking food guide for two days…",
    uz: "masalan, ikki kunlik ingliz tilida so'zlashuvchi taom hamrohi…",
    ru: "напр., англоговорящий гид по еде на два дня…",
  },
  "browse.title": { en: "Browse by interest", uz: "Qiziqish bo'yicha izlash", ru: "По интересам" },
  "browse.subtitle": { en: "Find a guide for what you love", uz: "Sevimli mavzuingiz bo'yicha hamroh toping", ru: "Найдите гида под ваши интересы" },
  "footer.about": { en: "About", uz: "Biz haqimizda", ru: "О нас" },
  "footer.contact": { en: "Contact", uz: "Aloqa", ru: "Контакты" },
  "footer.terms": { en: "Terms", uz: "Shartlar", ru: "Условия" },
  "footer.privacy": { en: "Privacy", uz: "Maxfiylik", ru: "Конфиденциальность" },
  "footer.refunds": { en: "Refunds", uz: "Pulni qaytarish", ru: "Возвраты" },
  "footer.tagline": { en: "Operated by Ark Labs LLC", uz: "Ark Labs LLC tomonidan boshqariladi", ru: "Оператор — Ark Labs LLC" },
};

const I18nContext = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: keyof typeof translations) => string }>({
  lang: "en",
  setLang: () => {},
  t: (k) => translations[k]?.en ?? String(k),
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const saved = (typeof window !== "undefined" && localStorage.getItem("lang")) as Lang | null;
    if (saved === "en" || saved === "uz" || saved === "ru") setLangState(saved);
  }, []);

  // Sync current language to authenticated user's metadata and guide profile (if any).
  useEffect(() => {
    let cancelled = false;
    const sync = async (l: Lang) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled || !user) return;
      if (user.user_metadata?.locale !== l) {
        await supabase.auth.updateUser({ data: { locale: l } });
      }
      await supabase.from("guides").update({ locale: l }).eq("user_id", user.id);
    };
    sync(lang);
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) sync(lang);
    });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, [lang]);

  const setLang = (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem("lang", l); } catch {}
  };

  const t = (k: keyof typeof translations) => translations[k]?.[lang] ?? translations[k]?.en ?? String(k);

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);

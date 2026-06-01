import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "uz" | "ru";

type Dict = Record<string, { en: string; uz: string; ru: string }>;

export const translations: Dict = {
  "nav.findGuide": { en: "Find a guide", uz: "Yo'lboshchi toping", ru: "Найти гида" },
  "nav.cities": { en: "Cities", uz: "Shaharlar", ru: "Города" },
  "nav.explore": { en: "Explore", uz: "Kashf eting", ru: "Обзор" },
  "nav.howItWorks": { en: "How it works", uz: "Qanday ishlaydi", ru: "Как это работает" },
  "nav.becomeGuide": { en: "Become a guide", uz: "Yo'lboshchi bo'ling", ru: "Стать гидом" },
  "common.menu": { en: "Menu", uz: "Menyu", ru: "Меню" },
  "common.findUs": { en: "Find us:", uz: "Bizni toping:", ru: "Найти нас:" },
  "common.contactUs": { en: "Contact us:", uz: "Aloqa:", ru: "Связаться:" },
  "hero.title": { en: "Find your local guide", uz: "Mahalliy yo'lboshchini toping", ru: "Найдите своего местного гида" },
  "hero.subtitle": {
    en: "Describe the trip you want. Hamroh AI matches you with a verified local guide.",
    uz: "Qanday sayohat xohlayotganingizni yozing. Hamroh AI sizga tasdiqlangan mahalliy yo'lboshchini topadi.",
    ru: "Опишите желаемую поездку. Hamroh AI подберёт вам проверенного местного гида.",
  },
  "hero.browse": {
    en: "Prefer to browse? Find a guide manually →",
    uz: "O'zingiz tanlamoqchimisiz? Yo'lboshchini qo'lda toping →",
    ru: "Хотите выбрать сами? Найдите гида вручную →",
  },
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

  const setLang = (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem("lang", l); } catch {}
  };

  const t = (k: keyof typeof translations) => translations[k]?.[lang] ?? translations[k]?.en ?? String(k);

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);

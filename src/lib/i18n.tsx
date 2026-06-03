import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Lang = "en" | "uz" | "ru";

type Dict = Record<string, { en: string; uz: string; ru: string }>;

export const translations: Dict = {
  "nav.findGuide": { en: "Find a guide", uz: "Hamroh toping", ru: "Найти гида" },
  "nav.cities": { en: "Cities", uz: "Shaharlar", ru: "Города" },
  "nav.tours": { en: "Tours", uz: "Sayohatlar", ru: "Туры" },
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
  "hero.tagline": {
    en: "Powered by Hamroh AI · Free · No signup to try",
    uz: "Hamroh AI · Bepul · Ro'yxatdan o'tmasdan sinab ko'ring",
    ru: "Hamroh AI · Бесплатно · Без регистрации",
  },
  "hero.suggest.1": { en: "Korean-speaking food guide", uz: "Koreys tilida ovqat hamrohi", ru: "Гид по еде со знанием корейского" },
  "hero.suggest.2": { en: "Sunset photography tour", uz: "Quyosh botishi fotosessiyasi", ru: "Фототур на закате" },
  "hero.suggest.3": { en: "Family-friendly history walk", uz: "Oilaviy tarixiy sayohat", ru: "Историческая прогулка для семьи" },
  "hero.suggest.4": { en: "Half-day artisan workshop", uz: "Yarim kunlik hunarmandlar ustaxonasi", ru: "Мастер-класс на полдня" },

  "hero.stats.guides": { en: "verified guides", uz: "tasdiqlangan hamroh", ru: "проверенных гидов" },
  "hero.stats.cities": { en: "cities", uz: "shahar", ru: "городов" },
  "hero.stats.travelers": { en: "happy travelers", uz: "mamnun sayohatchi", ru: "довольных путешественников" },

  "spot.newGuide.label": { en: "New guide", uz: "Yangi hamroh", ru: "Новый гид" },
  "spot.newRoute.label": { en: "New route", uz: "Yangi yo'nalish", ru: "Новый маршрут" },
  "spot.news.label": { en: "News", uz: "Yangiliklar", ru: "Новости" },
  "spot.newTour.label": { en: "New tour", uz: "Yangi sayohat", ru: "Новый тур" },
  "spot.aral.title": { en: "Aral Sea tours from Nukus", uz: "Nukusdan Orol dengiziga sayohatlar", ru: "Туры к Аральскому морю из Нукуса" },
  "spot.aral.desc": { en: "First guide covering the dried seabed and ship graveyard", uz: "Qurigan dengiz tubi va kemalar qabristoni bo'ylab birinchi hamroh", ru: "Первый гид по высохшему дну и кладбищу кораблей" },
  "spot.samarkand.title": { en: "Sunset photography in Samarkand", uz: "Samarqandda quyosh botishi fotosessiyasi", ru: "Фототур на закате в Самарканде" },
  "spot.samarkand.desc": { en: "Three-hour route through Registan and rooftop viewpoints", uz: "Registon va tom usti manzaralari bo'ylab uch soatlik yo'nalish", ru: "Трёхчасовой маршрут по Регистану и крышам с видом" },
  "spot.aziz.title": { en: "Meet Aziz — local foodie from Bukhara", uz: "Buxorolik mahalliy oshpaz Aziz bilan tanishing", ru: "Знакомьтесь — Азиз, фуди из Бухары" },
  "spot.aziz.desc": { en: "Hidden plov spots and family-run teahouses", uz: "Yashirin osh joylari va oilaviy choyxonalar", ru: "Скрытые места с пловом и семейные чайханы" },
  "spot.crafts.title": { en: "Crafts & bazaar walks now in Khiva", uz: "Xivada hunarmandlar va bozor sayohatlari", ru: "Прогулки по ремёслам и базарам теперь в Хиве" },
  "spot.crafts.desc": { en: "Meet ceramicists, silk weavers and wood carvers", uz: "Kulollar, ipak to'quvchilar va yog'och o'ymakorlari", ru: "Керамисты, ткачи шёлка и резчики по дереву" },

  "trust.verified": { en: "Verified locals", uz: "Tasdiqlangan mahalliylar", ru: "Проверенные местные" },
  "trust.directChat": { en: "Direct chat", uz: "To'g'ridan-to'g'ri chat", ru: "Чат напрямую" },
  "trust.secureBooking": { en: "Secure booking", uz: "Xavfsiz bron", ru: "Безопасная бронь" },

  "how.title": { en: "How it works", uz: "Qanday ishlaydi", ru: "Как это работает" },
  "how.subtitle": { en: "Three steps to your local guide", uz: "Hamrohingizgacha uch qadam", ru: "Три шага до вашего гида" },
  "how.step1.title": { en: "Tell us your trip", uz: "Sayohatingizni yozing", ru: "Опишите поездку" },
  "how.step1.desc": { en: "Describe what you want in your own words — Hamroh AI gets it.", uz: "O'z so'zlaringiz bilan tushuntiring — Hamroh AI tushunadi.", ru: "Расскажите своими словами — Hamroh AI поймёт." },
  "how.step2.title": { en: "Get matched", uz: "Mos hamroh", ru: "Получите подбор" },
  "how.step2.desc": { en: "We hand-pick verified locals who fit your trip and language.", uz: "Sayohatingiz va tilingizga mos tasdiqlangan hamrohlarni tanlaymiz.", ru: "Подбираем проверенных гидов под вашу поездку и язык." },
  "how.step3.title": { en: "Book & chat", uz: "Bron qiling", ru: "Бронируйте и общайтесь" },
  "how.step3.desc": { en: "Confirm your dates and message your guide directly.", uz: "Sanani tasdiqlang va hamroh bilan bog'laning.", ru: "Подтвердите даты и пишите гиду напрямую." },

  "featured.title": { en: "Meet our top guides", uz: "Eng yaxshi hamrohlarimiz", ru: "Наши лучшие гиды" },
  "featured.subtitle": { en: "Hand-picked locals with the best reviews", uz: "Eng yaxshi sharhli mahalliylar", ru: "Локалы с лучшими отзывами" },
  "featured.viewAll": { en: "View all guides", uz: "Hammasini ko'rish", ru: "Все гиды" },

  "cities.title": { en: "Popular cities", uz: "Mashhur shaharlar", ru: "Популярные города" },
  "cities.subtitle": { en: "Pick a destination and meet your guide", uz: "Yo'nalishni tanlang va hamroh toping", ru: "Выберите город и найдите гида" },

  "latest.title": { en: "Latest from our guides", uz: "Hamrohlarimizdan yangiliklar", ru: "Свежее от гидов" },
  "latest.subtitle": { en: "What locals are sharing right now", uz: "Mahalliylar hozir ulashayotgan", ru: "Чем делятся локалы прямо сейчас" },

  "reviews.title": { en: "Loved by travelers", uz: "Sayohatchilar yaxshi ko'radi", ru: "Путешественники нас любят" },
  "reviews.subtitle": { en: "Real stories from real trips", uz: "Haqiqiy sayohatlardan haqiqiy hikoyalar", ru: "Реальные истории из реальных поездок" },
  "reviews.about": { en: "about", uz: "haqida", ru: "о гиде" },

  "cta.title": { en: "Are you a local guide?", uz: "Siz mahalliy hamrohmisiz?", ru: "Вы местный гид?" },
  "cta.subtitle": { en: "Join Hamroh, share your city and grow your bookings.", uz: "Hamroh'ga qo'shiling, shahringizni ulashing va bronlaringizni oshiring.", ru: "Присоединяйтесь к Hamroh, делитесь городом и получайте больше броней." },
  "cta.button": { en: "Become a guide", uz: "Hamroh bo'lish", ru: "Стать гидом" },

  "browse.title": { en: "Browse by interest", uz: "Qiziqish bo'yicha izlash", ru: "По интересам" },
  "browse.subtitle": { en: "Find a guide for what you love", uz: "Sevimli mavzuingiz bo'yicha hamroh toping", ru: "Найдите гида под ваши интересы" },

  "cat.locals-favourite": { en: "Local's favourite", uz: "Mahalliylar tanlovi", ru: "Выбор местных" },
  "cat.people": { en: "People", uz: "Insonlar", ru: "Люди" },
  "cat.gastro": { en: "Gastro", uz: "Gastronomiya", ru: "Гастрономия" },
  "cat.mountains": { en: "Mountains & Nature", uz: "Tog'lar va tabiat", ru: "Горы и природа" },
  "cat.city": { en: "City & History", uz: "Shahar va tarix", ru: "Город и история" },
  "cat.crafts": { en: "Crafts & Bazaars", uz: "Hunarmandchilik va bozorlar", ru: "Ремёсла и базары" },
  "cat.culture": { en: "Culture & Art", uz: "Madaniyat va san'at", ru: "Культура и искусство" },
  "cat.photo": { en: "Photo Tours", uz: "Foto sayohatlar", ru: "Фототуры" },

  "footer.about": { en: "About", uz: "Biz haqimizda", ru: "О нас" },
  "footer.contact": { en: "Contact", uz: "Aloqa", ru: "Контакты" },
  "footer.terms": { en: "Terms", uz: "Shartlar", ru: "Условия" },
  "footer.privacy": { en: "Privacy", uz: "Maxfiylik", ru: "Конфиденциальность" },
  "footer.refunds": { en: "Refunds", uz: "Pulni qaytarish", ru: "Возвраты" },
  "footer.tagline": { en: "Operated by Ark Labs LLC", uz: "Ark Labs LLC tomonidan boshqariladi", ru: "Оператор — Ark Labs LLC" },

  "tours.title": { en: "Tours", uz: "Sayohatlar", ru: "Туры" },
  "tours.subtitle": { en: "Curated routes led by verified local guides", uz: "Tasdiqlangan mahalliy hamrohlar olib boradigan tanlangan yo'nalishlar", ru: "Подборка маршрутов с проверенными местными гидами" },
  "tours.priceFrom": { en: "from", uz: "boshlab", ru: "от" },
  "tours.duration": { en: "Duration", uz: "Davomiyligi", ru: "Длительность" },
  "tours.hours": { en: "h", uz: "soat", ru: "ч" },
  "tours.guides": { en: "Guides", uz: "Hamrohlar", ru: "Гиды" },
  "tours.included": { en: "What's included", uz: "Nimani o'z ichiga oladi", ru: "Что включено" },
  "tours.notIncluded": { en: "Not included", uz: "Kirmaydi", ru: "Не включено" },
  "tours.highlights": { en: "Highlights", uz: "Asosiy joylari", ru: "Главное" },
  "tours.book": { en: "Book this tour", uz: "Sayohatni bron qilish", ru: "Забронировать тур" },
  "tours.allCities": { en: "All cities", uz: "Barcha shaharlar", ru: "Все города" },
  "tours.empty": { en: "No tours yet. Check back soon.", uz: "Hozircha sayohatlar yo'q.", ru: "Туров пока нет. Загляните позже." },
  "tours.backToList": { en: "← All tours", uz: "← Barcha sayohatlar", ru: "← Все туры" },
};

const I18nContext = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: keyof typeof translations) => string; tCategory: (slug: string, fallback?: string) => string }>({
  lang: "en",
  setLang: () => {},
  t: (k) => translations[k]?.en ?? String(k),
  tCategory: (_slug, fallback) => fallback ?? "",
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
  const tCategory = (slug: string, fallback?: string) => {
    const key = `cat.${slug}` as keyof typeof translations;
    return translations[key]?.[lang] ?? fallback ?? translations[key]?.en ?? slug;
  };

  return <I18nContext.Provider value={{ lang, setLang, t, tCategory }}>{children}</I18nContext.Provider>;

}

export const useI18n = () => useContext(I18nContext);

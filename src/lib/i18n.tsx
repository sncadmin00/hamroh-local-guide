import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Lang = "en" | "uz" | "ru";

type Dict = Record<string, { en: string; uz: string; ru: string }>;

export const translations: Dict = {
  "nav.findGuide": { en: "Guides", uz: "Hamrohlar", ru: "Гиды" },
  "nav.cities": { en: "Cities", uz: "Shaharlar", ru: "Города" },
  "nav.tours": { en: "Tours", uz: "Sayohatlar", ru: "Туры" },
  "nav.explore": { en: "Explore", uz: "Kashf eting", ru: "Обзор" },
  "nav.howItWorks": { en: "How it works", uz: "Qanday ishlaydi", ru: "Как это работает" },
  "nav.becomeGuide": { en: "Become a guide", uz: "Hamroh bo'ling", ru: "Стать гидом" },
  "nav.faq": { en: "FAQ", uz: "FAQ", ru: "FAQ" },
  "nav.wishlist": { en: "Wishlist", uz: "Saralangan", ru: "Избранное" },
  "wishlist.title": { en: "My wishlist", uz: "Saralanganlarim", ru: "Моё избранное" },
  "wishlist.empty": { en: "Tap the heart on any guide, tour or city to save it here.", uz: "Saralash uchun gid, sayohat yoki shahar yonidagi yurakni bosing.", ru: "Нажмите на сердечко у гида, тура или города, чтобы сохранить его сюда." },
  "wishlist.tabs.guides": { en: "Guides", uz: "Hamrohlar", ru: "Гиды" },
  "wishlist.tabs.tours": { en: "Tours", uz: "Sayohatlar", ru: "Туры" },
  "wishlist.tabs.cities": { en: "Cities", uz: "Shaharlar", ru: "Города" },
  "wishlist.saved": { en: "Saved to wishlist", uz: "Saralanganlarga qo'shildi", ru: "Добавлено в избранное" },
  "wishlist.removed": { en: "Removed from wishlist", uz: "Saralanganlardan o'chirildi", ru: "Удалено из избранного" },
  "common.menu": { en: "Menu", uz: "Menyu", ru: "Меню" },
  "common.findUs": { en: "Find us:", uz: "Bizni toping:", ru: "Найти нас:" },
  "common.contactUs": { en: "Contact us:", uz: "Aloqa:", ru: "Связаться:" },
  "common.signIn": { en: "Sign in", uz: "Kirish", ru: "Войти" },
  "common.signOut": { en: "Sign out", uz: "Chiqish", ru: "Выйти" },
  "common.messages": { en: "Messages", uz: "Xabarlar", ru: "Сообщения" },
  "common.settings": { en: "Account settings", uz: "Hisob sozlamalari", ru: "Настройки аккаунта" },
  "common.admin": { en: "Admin", uz: "Admin", ru: "Админ" },
  "hero.title": { en: "Find your local guide", uz: "Mahalliy hamrohizni toping", ru: "Найдите своего местного гида" },
  "hero.h1": {
    en: "Find a trusted companion in 30 seconds",
    uz: "30 soniyada ishonchli hamroh toping",
    ru: "Найдите проверенного спутника за 30 секунд",
  },
  "hero.h1sub": {
    en: "Get matched with a verified local guide who can show you the city, translate, and help you travel like a local.",
    uz: "Sizga shaharni ko'rsatadigan, tarjima qiladigan va mahalliy aholi kabi sayohat qilishga yordam beradigan tasdiqlangan mahalliy hamrohni toping.",
    ru: "Найдите проверенного местного гида, который покажет город, переведет и поможет путешествовать как местный.",
  },
  "hero.subtitle": {
    en: "Describe the trip you want. Hamroh AI matches you with a verified local guide.",
    uz: "Qanday sayohat xohlayotganingizni yozing. Hamroh AI sizga tasdiqlangan mahalliy hamrohni topadi.",
    ru: "Опишите желаемую поездку. Hamroh AI подберёт вам проверенного местного гида.",
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

 "spot.whatsNew": { en: "What's new", uz: "Yangilik", ru: "Что нового" },
 "spot.newExperience.label": { en: "New experience", uz: "Yangi tajriba", ru: "Новинка" },
 "spot.newGuide.label": { en: "New experience", uz: "Yangi tajriba", ru: "Новинка" },
 "spot.newRoute.label": { en: "New experience", uz: "Yangi tajriba", ru: "Новинка" },
 "spot.news.label": { en: "New experience", uz: "Yangi tajriba", ru: "Новинка" },
 "spot.newTour.label": { en: "New experience", uz: "Yangi tajriba", ru: "Новинка" },
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
  "topTours.title": { en: "Top tours", uz: "Top sayohatlar", ru: "Топ туры" },
  "topTours.subtitle": { en: "Curated routes with verified local guides", uz: "Tasdiqlangan hamrohlar bilan tanlangan yo'nalishlar", ru: "Подборка маршрутов с проверенными гидами" },
  "topTours.viewAll": { en: "View all tours", uz: "Barcha sayohatlar", ru: "Все туры" },

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

  "explore.tabs.guides": { en: "Top guides", uz: "Top hamrohlar", ru: "Топ гиды" },
  "explore.tabs.tours": { en: "Top tours", uz: "Top sayohatlar", ru: "Топ туры" },
  "explore.tabs.cities": { en: "Popular cities", uz: "Mashhur shaharlar", ru: "Популярные города" },
  "explore.tabs.explore": { en: "Explore", uz: "Kashf eting", ru: "Обзор" },


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

  "book.cta": { en: "Book", uz: "Bron", ru: "Бронь" },

  "why.title": { en: "Why Hamroh", uz: "Nega Hamroh", ru: "Почему Hamroh" },
  "why.subtitle": { en: "Everything you need for a safe, memorable trip", uz: "Xavfsiz va esda qoladigan sayohat uchun kerakli barcha narsa", ru: "Всё для безопасной и яркой поездки" },
  "why.verified.title": { en: "Verified locals", uz: "Tasdiqlangan mahalliylar", ru: "Проверенные местные" },
  "why.verified.desc": { en: "Every guide is ID-checked and reviewed by our team.", uz: "Har bir hamrohning hujjatlari va sharhlari tekshirilgan.", ru: "Каждый гид проходит проверку документов и отзывов." },
  "why.chat.title": { en: "Direct chat", uz: "To'g'ridan-to'g'ri chat", ru: "Чат напрямую" },
  "why.chat.desc": { en: "Talk to your guide before you book — no middlemen.", uz: "Bron qilishdan oldin hamroh bilan suhbatlashing — vositachisiz.", ru: "Общайтесь с гидом до бронирования — без посредников." },
  "why.pay.title": { en: "Secure payments", uz: "Xavfsiz to'lovlar", ru: "Безопасная оплата" },
  "why.pay.desc": { en: "Pay safely online. Money is released to the guide after your trip.", uz: "Onlayn xavfsiz to'lang. Pul sayohatdan so'ng hamrohga o'tadi.", ru: "Платите онлайн. Деньги перечисляются гиду после поездки." },
  "why.cancel.title": { en: "Free cancellation", uz: "Bepul bekor qilish", ru: "Бесплатная отмена" },
  "why.cancel.desc": { en: "Plans change. Cancel for free up to 24 hours before your tour.", uz: "Rejalar o'zgaradi. Sayohatdan 24 soat oldin bepul bekor qiling.", ru: "Планы меняются. Отмените бесплатно за 24 часа до тура." },

  "faq.title": { en: "Frequently asked questions", uz: "Ko'p so'raladigan savollar", ru: "Частые вопросы" },
  "faq.subtitle": { en: "Everything you need to know about Hamroh", uz: "Hamroh haqida bilishingiz kerak bo'lgan hamma narsa", ru: "Всё, что нужно знать о Hamroh" },
  "faq.q1": { en: "How does Hamroh work?", uz: "Hamroh qanday ishlaydi?", ru: "Как работает Hamroh?" },
  "faq.a1": { en: "Describe your trip in your own words. Our AI matches you with verified local guides who fit your language, budget and interests. Chat with them and book in one place.", uz: "Sayohatingizni o'z so'zlaringiz bilan tasvirlab bering. AI sizga til, byudjet va qiziqishlaringizga mos tasdiqlangan hamrohlarni tanlaydi. Ular bilan suhbatlashing va bir joyda bron qiling.", ru: "Опишите поездку своими словами. ИИ подберёт проверенных гидов под ваш язык, бюджет и интересы. Общайтесь и бронируйте в одном месте." },
  "faq.q2": { en: "Are the guides really verified?", uz: "Hamrohlar haqiqatan tasdiqlanganmi?", ru: "Гиды действительно проверены?" },
  "faq.a2": { en: "Yes. Each guide submits ID, references and sample tours. Our team reviews every application manually before approval.", uz: "Ha. Har bir hamroh shaxsiy guvohnoma, tavsiyalar va sayohat namunalarini taqdim etadi. Jamoamiz har bir arizani qo'lda ko'rib chiqadi.", ru: "Да. Каждый гид предоставляет удостоверение, рекомендации и примеры туров. Команда проверяет каждую заявку вручную." },
  "faq.q3": { en: "How do I pay?", uz: "Qanday to'lashim mumkin?", ru: "Как оплатить?" },
  "faq.a3": { en: "Pay securely online by card. We hold your payment and release it to the guide after your trip is completed.", uz: "Karta orqali onlayn xavfsiz to'lang. To'lovni ushlab turamiz va sayohat tugaganidan keyin hamrohga o'tkazamiz.", ru: "Платите картой онлайн. Мы удерживаем платёж и переводим его гиду после завершения поездки." },
  "faq.q4": { en: "Can I cancel a booking?", uz: "Bronni bekor qila olamanmi?", ru: "Можно ли отменить бронирование?" },
  "faq.a4": { en: "Yes — cancel free of charge up to 24 hours before the tour starts. Later cancellations may not be refundable.", uz: "Ha — sayohat boshlanishidan 24 soat oldin bepul bekor qiling. Kechroq bekor qilishlar qaytarilmasligi mumkin.", ru: "Да — отмена бесплатна за 24 часа до начала тура. Более поздние отмены могут не возвращаться." },
  "faq.q5": { en: "What languages do guides speak?", uz: "Hamrohlar qaysi tillarda gaplashadi?", ru: "На каких языках говорят гиды?" },
  "faq.a5": { en: "English, Russian and Uzbek are most common. Many guides also speak French, German, Korean, Japanese and more — filter by language when you search.", uz: "Eng ko'p ingliz, rus va o'zbek tillari. Ko'pchilik hamrohlar fransuz, nemis, koreys, yapon va boshqa tillarni ham biladi.", ru: "Чаще всего английский, русский и узбекский. Многие также говорят на французском, немецком, корейском, японском и других — фильтруйте по языку." },
  "faq.q6": { en: "Do I need to sign up to chat with AI?", uz: "AI bilan suhbatlashish uchun ro'yxatdan o'tish kerakmi?", ru: "Нужна ли регистрация для чата с ИИ?" },
  "faq.a6": { en: "No — try Hamroh AI for free without signup. You'll only need an account when you're ready to book or message a guide.", uz: "Yo'q — ro'yxatdan o'tmasdan Hamroh AI'ni bepul sinab ko'ring. Faqat bron qilish yoki yozish uchun hisob kerak bo'ladi.", ru: "Нет — попробуйте Hamroh AI бесплатно без регистрации. Аккаунт нужен только для бронирования или переписки." },

  "book.eyebrow": { en: "Browse & book", uz: "Tanlang va bron qiling", ru: "Выберите и забронируйте" },
  "book.title": { en: "Book an experience", uz: "Tajribangizni bron qiling", ru: "Забронируйте свой опыт" },
  "book.subtitle": {
    en: "Pick a country, city or interest — we'll show matching guides and tours.",
    uz: "Mamlakat, shahar yoki qiziqishni tanlang — mos hamrohlar va sayohatlarni ko'rsatamiz.",
    ru: "Выберите страну, город или интерес — покажем подходящих гидов и туры.",
  },
  "book.country": { en: "Country", uz: "Mamlakat", ru: "Страна" },
  "book.city": { en: "City", uz: "Shahar", ru: "Город" },
  "book.interest": { en: "Interest", uz: "Qiziqish", ru: "Интерес" },
  "book.anyCountry": { en: "Any country", uz: "Har qanday mamlakat", ru: "Любая страна" },
  "book.anyCity": { en: "Any city", uz: "Har qanday shahar", ru: "Любой город" },
  "book.anyInterest": { en: "Any interest", uz: "Har qanday qiziqish", ru: "Любой интерес" },
  "book.searchCity": { en: "Search cities…", uz: "Shaharlarni qidirish…", ru: "Поиск города…" },
  "book.searchInterest": { en: "Search interests…", uz: "Qiziqishlarni qidirish…", ru: "Поиск интереса…" },
  "book.noCity": { en: "No cities found.", uz: "Shaharlar topilmadi.", ru: "Города не найдены." },
  "book.noInterest": { en: "No interests found.", uz: "Qiziqishlar topilmadi.", ru: "Интересы не найдены." },
  "book.tab.all": { en: "All", uz: "Hammasi", ru: "Все" },
  "book.tab.guides": { en: "Guides", uz: "Hamrohlar", ru: "Гиды" },
  "book.tab.tours": { en: "Tours", uz: "Sayohatlar", ru: "Туры" },
  "book.noResults": {
    en: "Nothing matches yet — try a different city or interest.",
    uz: "Mos keladigan natija yo'q — boshqa shahar yoki qiziqishni sinab ko'ring.",
    ru: "Ничего не найдено — попробуйте другой город или интерес.",
  },
  "book.clearAll": { en: "Clear all filters", uz: "Filtrlarni tozalash", ru: "Сбросить фильтры" },
  "book.autoDetected": { en: "Suggested by your location", uz: "Sizning joylashuvingiz bo'yicha", ru: "Подобрано по вашему местоположению" },
  "book.change": { en: "change", uz: "o'zgartirish", ru: "изменить" },
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

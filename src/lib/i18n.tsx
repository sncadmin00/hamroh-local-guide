import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Lang = "en" | "uz" | "ru";

type Dict = Record<string, { en: string; uz: string; ru: string }>;

export const translations: Dict = {
  "nav.findGuide": { en: "Guides", uz: "Hamrohlar", ru: "Гиды" },
  "home.spotlightGuide.title": { en: "Meet a top-rated guide", uz: "Yetakchi hamroh bilan tanishing", ru: "Познакомьтесь с лучшим гидом" },
  "home.spotlightGuide.cta": { en: "View profile", uz: "Profilni ko'rish", ru: "Смотреть профиль" },
  "home.categories.title": { en: "Popular categories", uz: "Mashhur toifalar", ru: "Популярные категории" },
  "home.categories.viewAll": { en: "View all", uz: "Hammasi", ru: "Все" },
  "home.categories.guidesCount": { en: "guides", uz: "hamroh", ru: "гидов" },
  "home.spotlightGuide.tours": { en: "tours", uz: "sayohat", ru: "туров" },
  "home.spotlightTour.title": { en: "Featured tour", uz: "Tanlangan sayohat", ru: "Тур недели" },
  "home.spotlightTour.cta": { en: "View tour", uz: "Sayohatni ko'rish", ru: "Подробнее" },
  "home.spotlightTour.by": { en: "by", uz: "—", ru: "от" },
  "home.bookingCta.title": { en: "Ready to book your trip?", uz: "Sayohatni bron qilishga tayyormisiz?", ru: "Готовы забронировать поездку?" },
  "home.bookingCta.subtitle": { en: "Pick a date, choose a guide, and travel with confidence.", uz: "Sanani tanlang, hamrohni tanlang va xotirjam sayohat qiling.", ru: "Выберите дату, гида и отправляйтесь в путь с уверенностью." },
  "home.bookingCta.button": { en: "Book now", uz: "Bron qilish", ru: "Забронировать" },
  "nav.cities": { en: "Cities", uz: "Shaharlar", ru: "Города" },
  "nav.tours": { en: "Tours", uz: "Sayohatlar", ru: "Туры" },
  "nav.explore": { en: "Explore", uz: "Kashf eting", ru: "Обзор" },
  "nav.howItWorks": { en: "How it works", uz: "Qanday ishlaydi", ru: "Как это работает" },
  "nav.becomeGuide": { en: "Become a guide", uz: "Hamroh bo'ling", ru: "Стать гидом" },
  "nav.faq": { en: "FAQ", uz: "FAQ", ru: "FAQ" },
  "nav.guideDashboard": { en: "Guide Dashboard", uz: "Gid kabineti", ru: "Кабинет гида" },
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
  "hero.headline": {
    en: "Find your\nlocal companion",
    uz: "Mahalliy\nhamrohizni toping",
    ru: "Найдите своего\nместного спутника",
  },
  "hero.headlineSub": {
    en: "Real people. Real stories.\nUnforgettable experiences.",
    uz: "Haqiqiy odamlar. Haqiqiy hikoyalar.\nUnutilmas tajribalar.",
    ru: "Настоящие люди. Настоящие истории.\nНезабываемые впечатления.",
  },
  "hero.h1": {
    en: "Explore Uzbekistan with locals",
    uz: "Har bir safar uchun ishonchli hamroh",
    ru: "Найдите своего надежного спутника",
  },
  "hero.h1sub": {
    en: "Verified guides, unique routes and authentic experiences.",
    uz: "Ishonchli gidlar, noyob tajribalar va unutilmas xotiralar.",
    ru: "Увидьте Узбекистан глазами местных.",
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
    en: "Powered by Hamroh AI",
    uz: "Hamroh AI bilan ishlaydi",
    ru: "Работает на Hamroh AI",
  },
  "hero.suggest.1": { en: "Korean-speaking food guide", uz: "Koreys tilida ovqat hamrohi", ru: "Гид по еде со знанием корейского" },
  "hero.suggest.2": { en: "Sunset photography tour", uz: "Quyosh botishi fotosessiyasi", ru: "Фототур на закате" },
  "hero.suggest.3": { en: "Family-friendly history walk", uz: "Oilaviy tarixiy sayohat", ru: "Историческая прогулка для семьи" },
  "hero.suggest.4": { en: "Half-day artisan workshop", uz: "Yarim kunlik hunarmandlar ustaxonasi", ru: "Мастер-класс на полдня" },

  "hero.bookGuide": { en: "Book a tour", uz: "Tur bron qilish", ru: "Забронировать тур" },
  "hero.search.title": {
    en: "Find your\nlocal companion\nin Uzbekistan",
    uz: "O'zbekistonda\no'z mahalliy\nhamrohingizni toping",
    ru: "Найдите своего\nместного спутника\nв Узбекистане",
  },
  "hero.search.subtitle": {
    en: "Authentic people. Real stories. Unforgettable experiences.",
    uz: "Haqiqiy odamlar. Jonli hikoyalar. Unutilmas tajribalar.",
    ru: "Настоящие люди. Живые истории. Незабываемые впечатления.",
  },
  "hero.search.where": { en: "Where are you going?", uz: "Qayerga bormoqchisiz?", ru: "Куда вы едете?" },
  "hero.search.when": { en: "Select date", uz: "Sanani tanlang", ru: "Выберите дату" },
  "hero.search.guests": { en: "Guests", uz: "Mehmonlar", ru: "Гости" },
  "hero.search.guest_one": { en: "guest", uz: "mehmon", ru: "гость" },
  "hero.search.guest_other": { en: "guests", uz: "mehmon", ru: "гостей" },
  "hero.search.button": { en: "Search", uz: "Qidirish", ru: "Найти" },
  "hero.search.aiHint": {
    en: "Powered by Hamroh AI — we'll match you with the perfect guide.",
    uz: "Hamroh AI yordamida — sizga eng mos hamrohni topamiz.",
    ru: "На базе Hamroh AI — подберём для вас идеального гида.",
  },
  "hero.becomeGuide": { en: "Become a guide", uz: "Hamroh bo'lish", ru: "Стать гидом" },
  "hero.stats.guides": { en: "verified guides", uz: "tasdiqlangan hamroh", ru: "проверенных гидов" },
  "hero.stats.cities": { en: "cities", uz: "shahar", ru: "городов" },
  "hero.stats.travelers": { en: "happy travelers", uz: "mamnun sayohatchi", ru: "довольных путешественников" },

 "spot.whatsNew": { en: "What's new", uz: "Yangilik", ru: "Что нового" },
 "spot.newExperience.label": { en: "New experience", uz: "Yangi tajriba", ru: "Новинка" },
 "spot.newGuide.label": { en: "New experience", uz: "Yangi tajriba", ru: "Новинка" },
 "spot.newRoute.label": { en: "New experience", uz: "Yangi tajriba", ru: "Новинка" },
 "spot.news.label": { en: "New experience", uz: "Yangi tajriba", ru: "Новинка" },
 "spot.newTour.label": { en: "New experience", uz: "Yangi tajriba", ru: "Новинка" },
 "spot.badge.new": { en: "New", uz: "Yangi", ru: "Новое" },
 "spot.badge.featured": { en: "Featured", uz: "Tanlangan", ru: "Рекомендуем" },
 "spot.badge.trending": { en: "Trending", uz: "Trendda", ru: "В тренде" },
 "spot.badge.limited": { en: "Limited availability", uz: "Cheklangan", ru: "Мест мало" },
 "spot.cta.view": { en: "View experience", uz: "Tajribani ko'rish", ru: "Смотреть" },
  "spot.aral.title": { en: "Aral Sea tours from Nukus", uz: "Nukusdan Orol dengiziga sayohatlar", ru: "Туры к Аральскому морю из Нукуса" },
  "spot.aral.desc": { en: "First guide covering the dried seabed and ship graveyard", uz: "Qurigan dengiz tubi va kemalar qabristoni bo'ylab birinchi hamroh", ru: "Первый гид по высохшему дну и кладбищу кораблей" },
  "spot.samarkand.title": { en: "Sunset photography in Samarkand", uz: "Samarqandda quyosh botishi fotosessiyasi", ru: "Фототур на закате в Самарканде" },
  "spot.samarkand.desc": { en: "Three-hour route through Registan and rooftop viewpoints", uz: "Registon va tom usti manzaralari bo'ylab uch soatlik yo'nalish", ru: "Трёхчасовой маршрут по Регистану и крышам с видом" },
  "spot.aziz.title": { en: "Meet Aziz — local foodie from Bukhara", uz: "Buxorolik mahalliy oshpaz Aziz bilan tanishing", ru: "Знакомьтесь — Азиз, фуди из Бухары" },
  "spot.aziz.desc": { en: "Hidden plov spots and family-run teahouses", uz: "Yashirin osh joylari va oilaviy choyxonalar", ru: "Скрытые места с пловом и семейные чайханы" },
  "spot.crafts.title": { en: "Crafts & bazaar walks now in Khiva", uz: "Xivada hunarmandlar va bozor sayohatlari", ru: "Прогулки по ремёслам и базарам теперь в Хиве" },
  "spot.crafts.desc": { en: "Meet ceramicists, silk weavers and wood carvers", uz: "Kulollar, ipak to'quvchilar va yog'och o'ymakorlari", ru: "Керамисты, ткачи шёлка и резчики по дереву" },

  "trust.verified": { en: "Verified identity", uz: "Tasdiqlangan shaxs", ru: "Проверенная личность" },
  "trust.language": { en: "Verified language", uz: "Tasdiqlangan til", ru: "Проверенный язык" },
  "trust.directChat": { en: "Direct chat", uz: "To'g'ridan-to'g'ri chat", ru: "Чат напрямую" },
  "trust.secureBooking": { en: "Secure booking", uz: "Xavfsiz bron", ru: "Безопасная бронь" },
  "trust.trustedReviews": { en: "Only trusted reviews", uz: "Faqat ishonchli sharhlar", ru: "Только проверенные отзывы" },
  "trust.rated": { en: "Rated by travelers", uz: "Sayohatchilar baholagan", ru: "Оценено путешественниками" },

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
 "topTours.all": { en: "All", uz: "Hammasi", ru: "Все" },

  "cities.title": { en: "Popular cities", uz: "Mashhur shaharlar", ru: "Популярные города" },
  "cities.subtitle": { en: "Pick a destination and meet your guide", uz: "Yo'nalishni tanlang va hamroh toping", ru: "Выберите город и найдите гида" },


  "reviews.title": { en: "Loved by travelers", uz: "Sayohatchilar yaxshi ko'radi", ru: "Путешественники нас любят" },
  "reviews.subtitle": { en: "Real stories from real trips", uz: "Haqiqiy sayohatlardan haqiqiy hikoyalar", ru: "Реальные истории из реальных поездок" },
  "reviews.about": { en: "about", uz: "haqida", ru: "о гиде" },

  "cta.title": { en: "Got stories to tell?\nBecome a guide in 5 minutes", uz: "Aytadigan hikoyalaringiz bormi?\n5 daqiqada hamroh bo'ling", ru: "Есть что рассказать?\nСтань гидом за 5 минут" },
  "cta.subtitle": { en: "Join Hamroh, explore yourself", uz: "Hamroh'ga qo'shiling, o'zingizni kashf eting", ru: "Присоединяйтесь к Hamroh, откройте себя" },
  "cta.button": { en: "Become a guide", uz: "Hamroh bo'lish", ru: "Стать гидом" },

  "banner.guide.title": { en: "Got stories to tell?\nBecome a guide in 5 minutes", uz: "Aytadigan hikoyalaringiz bormi?\n5 daqiqada hamroh bo'ling", ru: "Есть что рассказать?\nСтань гидом за 5 минут" },
  "banner.guide.points": { en: "Share your city.\nEarn money.\nMeet travelers.", uz: "Shaharingizni ulashing.\nPul toping.\nSayohatchilar bilan tanishing.", ru: "Делись своим городом.\nЗарабатывай.\nЗнакомься с путешественниками." },
  "banner.guide.button": { en: "Apply Now", uz: "Ariza topshirish", ru: "Подать заявку" },

  "browse.title": { en: "Browse by interest", uz: "Qiziqish bo'yicha izlash", ru: "По интересам" },
  "browse.subtitle": { en: "Find a guide for what you love", uz: "Sevimli mavzuingiz bo'yicha hamroh toping", ru: "Найдите гида под ваши интересы" },

  "explore.tabs.guides": { en: "Top guides", uz: "Top hamrohlar", ru: "Топ гиды" },
  "explore.tabs.tours": { en: "Top tours", uz: "Top sayohatlar", ru: "Топ туры" },
  "explore.tabs.cities": { en: "Popular cities", uz: "Mashhur shaharlar", ru: "Популярные города" },
  "explore.tabs.explore": { en: "Explore", uz: "Kashf eting", ru: "Обзор" },


  "cat.locals-favourite": { en: "Local's favourite", uz: "Mahalliylar tanlovi", ru: "Выбор местных" },
  "cat.city-tours": { en: "City Tours", uz: "Shahar sayohatlari", ru: "Городские туры" },
  "cat.food-culture": { en: "Food & Culture", uz: "Taom va madaniyat", ru: "Еда и культура" },
  "cat.nature-adventure": { en: "Nature & Adventure", uz: "Tabiat va sarguzasht", ru: "Природа и приключения" },
  "cat.local-life": { en: "Local Life", uz: "Mahalliy hayot", ru: "Местная жизнь" },
  "cat.history-heritage": { en: "History & Heritage", uz: "Tarix va meros", ru: "История и наследие" },

  "footer.about": { en: "About", uz: "Biz haqimizda", ru: "О нас" },
  "footer.contact": { en: "Contact", uz: "Aloqa", ru: "Контакты" },
  "footer.terms": { en: "Terms", uz: "Shartlar", ru: "Условия" },
  "footer.privacy": { en: "Privacy", uz: "Maxfiylik", ru: "Конфиденциальность" },
  "footer.refunds": { en: "Refunds", uz: "Pulni qaytarish", ru: "Возвраты" },
  "footer.tagline": { en: "Operated by Ark Labs LLC", uz: "Ark Labs LLC tomonidan boshqariladi", ru: "Оператор — Ark Labs LLC" },
  "payments.accepted": { en: "We accept", uz: "To'lov qabul qilamiz", ru: "Принимаем к оплате" },

  "tours.title": { en: "Tours", uz: "Sayohatlar", ru: "Туры" },
  "tours.subtitle": { en: "Curated routes led by verified local guides", uz: "Tasdiqlangan mahalliy hamrohlar olib boradigan tanlangan yo'nalishlar", ru: "Подборка маршрутов с проверенными местными гидами" },
  "tours.priceFrom": { en: "from", uz: "boshlab", ru: "от" },
  "tours.pricePerLanguage": { en: "Price per language", uz: "Har bir til uchun narx", ru: "Цена по языкам" },
  "tours.person": { en: "person", uz: "kishi", ru: "чел." },
  "tours.priceForGroup": { en: "Price for the whole group", uz: "Butun guruh uchun narx", ru: "Цена за всю группу" },
  "tours.upTo": { en: "up to {n}", uz: "{n} kishigacha", ru: "до {n}" },
  "tours.wholeTour": { en: "Whole tour", uz: "Butun sayohat", ru: "Весь тур" },
  "tours.languageSurcharge": { en: "+{p}% for {lang}", uz: "{lang} uchun +{p}%", ru: "+{p}% за {lang}" },
  "tours.duration": { en: "Duration", uz: "Davomiyligi", ru: "Длительность" },
  "tours.hours": { en: "h", uz: "soat", ru: "ч" },
  "tours.guides": { en: "Guides", uz: "Hamrohlar", ru: "Гиды" },
  "tours.yourGuide": { en: "Your guide", uz: "Sizning hamrohingiz", ru: "Ваш гид" },
  "tours.included": { en: "What's included", uz: "Nimani o'z ichiga oladi", ru: "Что включено" },
  "tours.notIncluded": { en: "Not included", uz: "Kirmaydi", ru: "Не включено" },
  "tours.highlights": { en: "Highlights", uz: "Asosiy joylari", ru: "Главное" },
  "tours.book": { en: "Book this tour", uz: "Sayohatni bron qilish", ru: "Забронировать тур" },
  "tours.allCities": { en: "All cities", uz: "Barcha shaharlar", ru: "Все города" },
  "tours.allCategories": { en: "All categories", uz: "Barcha toifalar", ru: "Все категории" },
  "tours.allLanguages": { en: "All languages", uz: "Barcha tillar", ru: "Все языки" },

  "tours.by": { en: "by", uz: "hamroh", ru: "гид" },
  "tours.transport": { en: "transport", uz: "transport", ru: "транспорт" },
  "tours.loading": { en: "Loading…", uz: "Yuklanmoqda…", ru: "Загрузка…" },
  "tours.empty": { en: "No tours yet. Check back soon.", uz: "Hozircha sayohatlar yo'q.", ru: "Туров пока нет. Загляните позже." },
  "tours.backToList": { en: "← All tours", uz: "← Barcha sayohatlar", ru: "← Все туры" },
  "tours.similar": { en: "Similar tours", uz: "O'xshash sayohatlar", ru: "Похожие туры" },

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

  // Language names — keyed by lowercased English name
  "lang.english": { en: "English", uz: "Ingliz", ru: "Английский" },
  "lang.russian": { en: "Russian", uz: "Rus", ru: "Русский" },
  "lang.uzbek": { en: "Uzbek", uz: "O'zbek", ru: "Узбекский" },
  "lang.tajik": { en: "Tajik", uz: "Tojik", ru: "Таджикский" },
  "lang.kazakh": { en: "Kazakh", uz: "Qozoq", ru: "Казахский" },
  "lang.kyrgyz": { en: "Kyrgyz", uz: "Qirg'iz", ru: "Киргизский" },
  "lang.turkish": { en: "Turkish", uz: "Turk", ru: "Турецкий" },
  "lang.arabic": { en: "Arabic", uz: "Arab", ru: "Арабский" },
  "lang.persian": { en: "Persian", uz: "Fors", ru: "Персидский" },
  "lang.french": { en: "French", uz: "Frantsuz", ru: "Французский" },
  "lang.german": { en: "German", uz: "Nemis", ru: "Немецкий" },
  "lang.spanish": { en: "Spanish", uz: "Ispan", ru: "Испанский" },
  "lang.italian": { en: "Italian", uz: "Italyan", ru: "Итальянский" },
  "lang.chinese": { en: "Chinese", uz: "Xitoy", ru: "Китайский" },
  "lang.japanese": { en: "Japanese", uz: "Yapon", ru: "Японский" },
  "lang.korean": { en: "Korean", uz: "Koreys", ru: "Корейский" },

  // Become a guide — onboarding
  "bg.toMain": { en: "Back to home", uz: "Bosh sahifaga", ru: "На главную" },
  "bg.thanksTitle": { en: "Thanks for your application!", uz: "Arizangiz uchun rahmat!", ru: "Спасибо за заявку!" },
  "bg.thanksSub": { en: "We'll get back to you within 2 business days.", uz: "Sizga 2 ish kuni ichida javob beramiz.", ru: "Мы свяжемся с вами в течение 2 рабочих дней." },
  "bg.step": { en: "Step", uz: "Qadam", ru: "Шаг" },
  "bg.of": { en: "of", uz: "/", ru: "из" },
  "bg.back": { en: "Back", uz: "Orqaga", ru: "Назад" },
  "bg.next": { en: "Next", uz: "Keyingi", ru: "Далее" },
  "bg.start": { en: "Start", uz: "Boshlash", ru: "Начать" },
  "bg.submit": { en: "Submit application", uz: "Arizani yuborish", ru: "Отправить заявку" },
  "bg.submitting": { en: "Sending…", uz: "Yuborilmoqda…", ru: "Отправка…" },
  "bg.applicationSent": { en: "Application sent", uz: "Ariza yuborildi", ru: "Заявка отправлена" },
  "bg.sthWrong": { en: "Something went wrong", uz: "Nimadir xato ketdi", ru: "Что-то пошло не так" },
  "bg.formCheck": { en: "Please check the form", uz: "Iltimos, formani tekshiring", ru: "Проверьте форму" },
  "bg.remove": { en: "Remove", uz: "O'chirish", ru: "Убрать" },

  "bg.s0.title": { en: "Hi! Become a guide on Hamroh", uz: "Salom! Hamrohda hamroh bo'ling", ru: "Привет! Станьте гидом на Hamroh" },
  "bg.s0.sub": { en: "It takes 3–5 minutes. Tell us about yourself, add photos and a short video — we'll help with the \"about\" text.", uz: "Bu 3–5 daqiqa oladi. O'zingiz haqida gapiring, rasm va qisqa video qo'shing — \"o'zim haqimda\" matnida yordam beramiz.", ru: "Это займёт 3–5 минут. Расскажите о себе, добавьте фото и короткое видео — мы поможем с текстом «о себе»." },
  "bg.s0.b1": { en: "A few simple questions", uz: "Bir nechta oddiy savollar", ru: "Несколько простых вопросов" },
  "bg.s0.b2": { en: "AI helps write your \"about\"", uz: "AI \"o'zim haqimda\" yozishga yordam beradi", ru: "AI поможет написать «о себе»" },
  "bg.s0.b3": { en: "Take photos and video right from your camera", uz: "Rasm va videoni kameradan to'g'ridan-to'g'ri oling", ru: "Сделайте фото и видео прямо с камеры" },
  "bg.s0.b4": { en: "Response within 2 business days", uz: "2 ish kuni ichida javob", ru: "Ответ от нас в течение 2 рабочих дней" },
  "bg.s0.remTitle": { en: "Before you start", uz: "Boshlashdan oldin", ru: "Прежде чем начать" },
  "bg.s0.rem1": { en: "Have your passport or ID ready", uz: "Pasport yoki ID-kartangiz tayyor bo‘lsin", ru: "Имейте при себе паспорт или удостоверение личности" },
  "bg.s0.rem2": { en: "Make sure you can record a short video of yourself", uz: "O‘zingizni qisqa videoga olish imkoniyati borligiga ishonch hosil qiling", ru: "Убедитесь, что вы сможете снять себя на короткое видео" },
  "bg.s0.rem3": { en: "You will need a microphone for the language test", uz: "Til testi uchun mikrofon kerak bo‘ladi", ru: "Для языкового теста понадобится микрофон" },
  "bg.s0.rem4": { en: "Prepare a few photos of your city or tours", uz: "Shaharingiz yoki sayohatlaringizdan bir nechta rasm tayyorlang", ru: "Подготовьте несколько фотографий вашего города или туров" },

  "bg.s1.title": { en: "How can we reach you?", uz: "Siz bilan qanday bog'lansak bo'ladi?", ru: "Как с вами связаться?" },
  "bg.s1.hint": { en: "Fill in name, email and phone", uz: "Ism, email va telefonni to'ldiring", ru: "Заполните имя, email и телефон" },
  "bg.s1.fullName": { en: "Full name", uz: "Ism va familiya", ru: "Имя и фамилия" },
  "bg.s1.namePh": { en: "Alisher Karimov", uz: "Alisher Karimov", ru: "Алишер Каримов" },
  "bg.s1.email": { en: "Email", uz: "Email", ru: "Email" },
  "bg.s1.phone": { en: "Phone", uz: "Telefon", ru: "Телефон" },
  "bg.s1.telegram": { en: "Telegram (optional)", uz: "Telegram (ixtiyoriy)", ru: "Telegram (необязательно)" },

  "bg.s2.title": { en: "Where are you and how long have you been guiding?", uz: "Qayerdansiz va qancha vaqtdan beri ekskursiya o'tkazasiz?", ru: "Откуда вы и как давно водите?" },
  "bg.s2.hint": { en: "Pick a city and years of experience", uz: "Shahar va tajriba yillarini ko'rsating", ru: "Укажите город и опыт" },
  "bg.s2.city": { en: "City", uz: "Shahar", ru: "Город" },
  "bg.s2.cityPick": { en: "Choose a city…", uz: "Shaharni tanlang…", ru: "Выберите город…" },
  "bg.s2.cityOther": { en: "Other", uz: "Boshqa", ru: "Другой" },
  "bg.s2.cityPh": { en: "Samarkand", uz: "Samarqand", ru: "Самарканд" },
  "bg.s2.years": { en: "Years of experience", uz: "Tajriba yillari", ru: "Лет опыта" },

  "bg.s3.title": { en: "What languages do you guide in?", uz: "Qaysi tillarda ekskursiya o'tkazasiz?", ru: "На каких языках водите туры?" },
  "bg.s3.hint": { en: "Choose at least one language", uz: "Kamida bitta tilni tanlang", ru: "Выберите хотя бы один язык" },
  "bg.s3.loading": { en: "Loading…", uz: "Yuklanmoqda…", ru: "Загрузка…" },
  "bg.s3.addOwn": { en: "Don't see your language? Add your own", uz: "Tilingiz yo'qmi? O'zingizniki qo'shing", ru: "Нет вашего языка? Добавьте свой" },
  "bg.s3.addOwnHint": { en: "Admin will add it to the shared list later", uz: "Admin keyinroq uni umumiy ro'yxatga qo'shadi", ru: "Админ затем добавит его в общий список" },
  "bg.s3.otherPh": { en: "e.g. Türkçe, 한국어, Tojik…", uz: "Masalan: Türkçe, 한국어, Tojik…", ru: "Напр. Türkçe, 한국어, Tojik…" },
  "bg.s3.add": { en: "Add", uz: "Qo'shish", ru: "Добавить" },

  "bg.lt.title": { en: "Quick voice test", uz: "Tezkor ovozli test", ru: "Быстрый голосовой тест" },
  "bg.lt.sub": { en: "Record a short voice sample in each language you chose. Our AI will check your level — this helps travelers trust your profile.", uz: "Tanlagan har bir tilda qisqa ovozli namuna yozing. AI sizning darajangizni baholaydi — bu sayohatchilarga ishonch beradi.", ru: "Запишите короткий голосовой ответ на каждом выбранном языке. AI оценит ваш уровень — это повысит доверие путешественникам." },
  "bg.lt.hint": { en: "Please record (or skip) every selected language to continue.", uz: "Davom etish uchun har bir tanlangan tilda yozing yoki o'tkazib yuboring.", ru: "Запишите или пропустите каждый язык, чтобы продолжить." },
  "bg.lt.prompt": { en: "Speak for ~30 seconds in {lang}: tell us who you are, your favourite place in your city, and why travelers love you.", uz: "{lang} tilida ~30 soniya gapiring: o'zingiz kimligingizni, shahringizdagi sevimli joyingizni va sayohatchilar nima uchun sizni yaxshi ko'rishini ayting.", ru: "Говорите ~30 секунд на {lang}: расскажите кто вы, ваше любимое место в городе и за что вас любят путешественники." },
  "bg.lt.start": { en: "Start recording", uz: "Yozishni boshlash", ru: "Начать запись" },
  "bg.lt.stop": { en: "Stop", uz: "To'xtatish", ru: "Остановить" },
  "bg.lt.rerecord": { en: "Record again", uz: "Qayta yozish", ru: "Перезаписать" },
  "bg.lt.submit": { en: "Submit for AI check", uz: "AI tekshiruviga yuborish", ru: "Отправить на AI-проверку" },
  "bg.lt.checking": { en: "AI is listening…", uz: "AI tinglamoqda…", ru: "AI слушает…" },
  "bg.lt.recording": { en: "Recording…", uz: "Yozilmoqda…", ru: "Запись…" },
  "bg.lt.level": { en: "Level", uz: "Daraja", ru: "Уровень" },
  "bg.lt.skip": { en: "Skip this language", uz: "Bu tilni o'tkazib yuborish", ru: "Пропустить язык" },
  "bg.lt.tooShort": { en: "Recording is too short — speak for at least 5 seconds.", uz: "Yozuv juda qisqa — kamida 5 soniya gapiring.", ru: "Запись слишком короткая — говорите минимум 5 секунд." },
  "bg.lt.micFail": { en: "Couldn't access microphone. Please allow microphone access.", uz: "Mikrofonga kirib bo'lmadi. Iltimos, ruxsat bering.", ru: "Не удалось получить доступ к микрофону. Разрешите доступ." },
  "bg.lt.assessFail": { en: "AI check failed — try again", uz: "AI tekshiruvi bajarilmadi — qayta urinib ko'ring", ru: "AI-проверка не удалась — попробуйте ещё раз" },
  "bg.lt.transcript": { en: "What AI heard", uz: "AI eshitgan matn", ru: "Что услышал AI" },
  "bg.rv.languageTests": { en: "Language tests", uz: "Til testlari", ru: "Языковые тесты" },


  "bg.s4.title": { en: "What do you specialise in?", uz: "Sizning mutaxassisligingiz nima?", ru: "Чем вы специализируетесь?" },
  "bg.s4.hint": { en: "Describe your specialisation", uz: "Mutaxassisligingizni yozing", ru: "Опишите вашу специализацию" },
  "bg.s4.categories": { en: "Categories (multiple)", uz: "Toifalar (bir nechta)", ru: "Категории (можно несколько)" },
  "bg.s4.specLabel": { en: "Short specialisation", uz: "Qisqacha mutaxassislik", ru: "Коротко о специализации" },
  "bg.s4.specPh": { en: "Food tours, history, architecture…", uz: "Gastro sayohatlar, tarix, me'morchilik…", ru: "Гастротуры, история, архитектура…" },

  "bg.s5.title": { en: "Tell us about yourself — AI will help", uz: "O'zingiz haqida gapiring — AI yordam beradi", ru: "Расскажите о себе — AI поможет" },
  "bg.s5.sub": { en: "Answer 3 short questions and AI will draft your text. You can edit it after.", uz: "3 ta qisqa savolga javob bering va AI matn yozadi. Keyin uni tahrirlashingiz mumkin.", ru: "Ответьте в двух словах на 3 вопроса, и AI составит чернетку. Вы её сможете отредактировать." },
  "bg.s5.hint": { en: "Generate or write the \"about\" text (min 20 chars)", uz: "\"O'zim haqimda\" matnini yarating yoki yozing (kamida 20 belgi)", ru: "Сгенерируйте или напишите текст «о себе» (минимум 20 символов)" },
  "bg.s5.q1": { en: "What will you definitely show guests?", uz: "Mehmonlarga nimani albatta ko'rsatasiz?", ru: "Что вы обязательно покажете гостям?" },
  "bg.s5.q1ph": { en: "e.g. sunrise at Registan, grandpa's tea house…", uz: "Masalan: Registonda quyosh chiqishi, bobomning choyxonasi…", ru: "Например: рассвет на Регистане, чайхану дедушки…" },
  "bg.s5.q2": { en: "How do you run your tours?", uz: "Ekskursiyalarni qanday o'tkazasiz?", ru: "Как вы ведёте туры?" },
  "bg.s5.q2ph": { en: "Slowly, with stories, tastings…", uz: "Sokin, hikoyalar va tatib ko'rishlar bilan…", ru: "Неспешно, с историями, дегустациями…" },
  "bg.s5.q3": { en: "Why do you love it?", uz: "Bu ish sizga nima uchun yoqadi?", ru: "Почему вам это нравится?" },
  "bg.s5.q3ph": { en: "I love showing people the real Uzbekistan…", uz: "Odamlarga haqiqiy O'zbekistonni ko'rsatishni yaxshi ko'raman…", ru: "Люблю знакомить людей с настоящим Узбекистаном…" },
  "bg.s5.writing": { en: "Writing…", uz: "Yozmoqda…", ru: "Пишу…" },
  "bg.s5.rewrite": { en: "Rewrite with AI", uz: "AI bilan qayta yozish", ru: "Переписать с AI" },
  "bg.s5.compose": { en: "Compose with AI", uz: "AI bilan tuzish", ru: "Составить с AI" },
  "bg.s5.aboutLabel": { en: "\"About\" (editable)", uz: "\"O'zim haqimda\" (tahrirlash mumkin)", ru: "«О себе» (можно отредактировать)" },
  "bg.s5.aboutPh": { en: "Text will appear here after generation, or write your own.", uz: "Matn shu yerda paydo bo'ladi yoki o'zingiz yozing.", ru: "Здесь появится текст после генерации, или напишите сами." },
  "bg.s5.chars": { en: "characters", uz: "belgi", ru: "символов" },
  "bg.s5.ok": { en: "Done! You can edit the text.", uz: "Tayyor! Matnni tahrirlashingiz mumkin.", ru: "Готово! Можно отредактировать текст." },
  "bg.s5.fail": { en: "Couldn't generate", uz: "Yarata olmadik", ru: "Не получилось сгенерировать" },

  "bg.s6.title": { en: "Your portrait", uz: "Sizning portretingiz", ru: "Ваш портрет" },
  "bg.s6.sub": { en: "A friendly photo is the first thing travelers see.", uz: "Iliq rasm — sayohatchilar ko'radigan birinchi narsa.", ru: "Доброжелательное фото — это первое, что увидят путешественники." },
  "bg.s6.takeCamera": { en: "Take with camera", uz: "Kamera bilan olish", ru: "Снять камерой" },
  "bg.s6.pickGallery": { en: "Pick from gallery", uz: "Galereyadan tanlash", ru: "Выбрать из галереи" },
  "bg.s6.portraitTooBig": { en: "Portrait is too large", uz: "Portret juda katta", ru: "Портрет слишком большой" },

  "bg.sId.title": { en: "Passport or ID", uz: "Pasport yoki ID", ru: "Паспорт или ID" },
  "bg.sId.sub": { en: "Upload a clear photo of your passport or national ID. Used only for verification — never shown publicly.", uz: "Pasport yoki shaxsiy guvohnomangizning aniq rasmini yuklang. Faqat tekshirish uchun — hech qachon ommaviy ko'rsatilmaydi.", ru: "Загрузите чёткое фото паспорта или ID. Используется только для проверки — публично не отображается." },
  "bg.sId.tooBig": { en: "Document is too large", uz: "Hujjat juda katta", ru: "Документ слишком большой" },
  "bg.rv.idDoc": { en: "ID document", uz: "Hujjat", ru: "Документ" },


  "bg.s7.title": { en: "Photos of your tours", uz: "Ekskursiyalaringiz rasmlari", ru: "Фото ваших туров" },
  "bg.s7.sub": { en: "Up to {n} photos. Show the vibe — places, people, moments.", uz: "{n} tagacha rasm. Atmosferani ko'rsating — joylar, odamlar, lahzalar.", ru: "До {n} фотографий. Покажите атмосферу — места, людей, моменты." },
  "bg.s7.tooBig": { en: "{name} is over 8 MB", uz: "{name} 8 MB dan katta", ru: "{name} больше 8 MB" },
  "bg.s7.pickLeft": { en: "Pick ({n} left)", uz: "Tanlash ({n} qoldi)", ru: "Выбрать ({n} осталось)" },

  "bg.s8.title": { en: "Short welcome video", uz: "Qisqa salomlashuv videosi", ru: "Короткое видео-приветствие" },
  "bg.s8.sub": { en: "Optional, but it really helps. 15–30 seconds — say who you are and what you'll show.", uz: "Ixtiyoriy, lekin juda yordam beradi. 15–30 soniya — kim ekanligingizni va nimani ko'rsatishingizni ayting.", ru: "Не обязательно, но очень помогает. 15–30 секунд — расскажите, кто вы и что покажете." },
  "bg.s8.record": { en: "Record video", uz: "Video yozish", ru: "Записать видео" },
  "bg.s8.upload": { en: "Upload file", uz: "Faylni yuklash", ru: "Загрузить файл" },
  "bg.s8.videoTooBig": { en: "Video is too large", uz: "Video juda katta", ru: "Видео слишком большое" },

  "bg.s9.title": { en: "Review and submit", uz: "Tekshirib yuboring", ru: "Проверьте и отправьте" },

  "bg.rv.name": { en: "Name", uz: "Ism", ru: "Имя" },
  "bg.rv.email": { en: "Email", uz: "Email", ru: "Email" },
  "bg.rv.phone": { en: "Phone", uz: "Telefon", ru: "Телефон" },
  "bg.rv.telegram": { en: "Telegram", uz: "Telegram", ru: "Telegram" },
  "bg.rv.city": { en: "City", uz: "Shahar", ru: "Город" },
  "bg.rv.years": { en: "Experience (years)", uz: "Tajriba (yil)", ru: "Опыт (лет)" },
  "bg.rv.languages": { en: "Languages", uz: "Tillar", ru: "Языки" },
  "bg.rv.categories": { en: "Categories", uz: "Toifalar", ru: "Категории" },
  "bg.rv.specialization": { en: "Specialisation", uz: "Mutaxassislik", ru: "Специализация" },
  "bg.rv.about": { en: "About", uz: "O'zim haqimda", ru: "О себе" },
  "bg.rv.portrait": { en: "Portrait", uz: "Portret", ru: "Портрет" },
  "bg.rv.photos": { en: "Photos", uz: "Rasmlar", ru: "Фото" },
  "bg.rv.video": { en: "Video", uz: "Video", ru: "Видео" },

  "badges.verified": { en: "Verified", uz: "Tasdiqlangan", ru: "Проверено" },
  "badges.activity": { en: "Activity", uz: "Faollik", ru: "Активность" },
  "badges.identity": { en: "Identity", uz: "Shaxs", ru: "Личность" },
  "badges.language": { en: "Language", uz: "Til", ru: "Язык" },
  "badges.introVideo": { en: "Intro video", uz: "Tanishuv video", ru: "Видео-визитка" },
  "badges.reviews": { en: "reviews", uz: "sharh", ru: "отзывов" },
  "badges.tours": { en: "completed tours", uz: "yakunlangan sayohat", ru: "завершённых туров" },
  "badges.min": { en: "min", uz: "daq", ru: "мин" },
  "badges.identity.on": { en: "Email, phone & passport verified", uz: "Email, telefon va pasport tasdiqlangan", ru: "Email, телефон и паспорт подтверждены" },
  "badges.identity.off": { en: "Identity not verified", uz: "Shaxs tasdiqlanmagan", ru: "Личность не подтверждена" },
  "badges.language.on": { en: "AI language test passed (B1+)", uz: "AI til testidan o'tgan (B1+)", ru: "Тест AI по языку пройден (B1+)" },
  "badges.language.off": { en: "No verified language", uz: "Tasdiqlangan til yo'q", ru: "Нет подтверждённого языка" },
  "badges.introVideo.on": { en: "Intro video approved", uz: "Tanishuv video tasdiqlangan", ru: "Видео-визитка подтверждена" },
  "badges.introVideo.off": { en: "No approved intro video", uz: "Tasdiqlangan tanishuv video yo'q", ru: "Нет подтверждённого видео" },
  "badges.reviews.on": { en: "{n} reviews from completed tours", uz: "Yakunlangan sayohatlardan {n} ta sharh", ru: "{n} отзывов с завершённых туров" },
  "badges.reviews.off": { en: "Needs {n}+ verified reviews", uz: "{n}+ tasdiqlangan sharh kerak", ru: "Нужно {n}+ проверенных отзывов" },
  "badges.tours.count": { en: "{n} completed tours", uz: "{n} ta yakunlangan sayohat", ru: "{n} завершённых туров" },
  "badges.response.none": { en: "Not enough data to measure response time", uz: "Javob vaqtini o'lchash uchun ma'lumot yetarli emas", ru: "Недостаточно данных для оценки времени ответа" },
  "badges.response.on": { en: "Median response time {n} min", uz: "O'rtacha javob vaqti {n} daq", ru: "Среднее время ответа {n} мин" },
  "badges.response.off": { en: "Median response {n} min (badge requires <{limit})", uz: "O'rtacha javob {n} daq (nishon uchun <{limit} kerak)", ru: "Среднее время ответа {n} мин (значок при <{limit})" },
  "badges.transport": { en: "Transport", uz: "Transport", ru: "Транспорт" },
  "badges.transport.seats": { en: "{n} seats", uz: "{n} o'rin", ru: "{n} мест" },
  "badges.transport.on": { en: "Provides transport ({n} seats)", uz: "Transport bilan ta'minlaydi ({n} o'rin)", ru: "Предоставляет транспорт ({n} мест)" },
  "badges.transport.onNoSeats": { en: "Provides transport", uz: "Transport bilan ta'minlaydi", ru: "Предоставляет транспорт" },
  "badges.transport.off": { en: "No transport provided", uz: "Transport taqdim etilmaydi", ru: "Транспорт не предоставляется" },

  "bg.tr.title": { en: "Do you provide transport?", uz: "Transport bilan ta'minlaysizmi?", ru: "Предоставляете ли вы транспорт?" },
  "bg.tr.sub": { en: "Tell travelers if you have a car or van for tours.", uz: "Sayohatchilarga avtomobilingiz yoki mikroavtobusingiz borligini bildiring.", ru: "Сообщите путешественникам, есть ли у вас авто или микроавтобус для туров." },
  "bg.tr.yes": { en: "Yes, I provide transport", uz: "Ha, transport bilan ta'minlayman", ru: "Да, предоставляю транспорт" },
  "bg.tr.no": { en: "No transport", uz: "Transport yo'q", ru: "Без транспорта" },
  "bg.tr.seats": { en: "Number of passenger seats", uz: "Yo'lovchilar uchun o'rinlar soni", ru: "Количество пассажирских мест" },
  "bg.tr.seatsPh": { en: "e.g. 4", uz: "masalan, 4", ru: "например, 4" },
  "bg.rv.transport": { en: "Transport", uz: "Transport", ru: "Транспорт" },
};



const I18nContext = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: keyof typeof translations) => string; tCategory: (slug: string, fallback?: string) => string; tLanguage: (name: string) => string }>({
  lang: "en",
  setLang: () => {},
  t: (k) => translations[k]?.en ?? String(k),
  tCategory: (_slug, fallback) => fallback ?? "",
  tLanguage: (name) => name,
});



export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const saved = (typeof window !== "undefined" && localStorage.getItem("lang")) as Lang | null;
    if (saved === "en" || saved === "uz" || saved === "ru") setLangState(saved);
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
    }
  }, [lang]);

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
  const tLanguage = (name: string) => {
    const key = `lang.${name.trim().toLowerCase()}` as keyof typeof translations;
    return translations[key]?.[lang] ?? translations[key]?.en ?? name;
  };

  return <I18nContext.Provider value={{ lang, setLang, t, tCategory, tLanguage }}>{children}</I18nContext.Provider>;


}

export const useI18n = () => useContext(I18nContext);

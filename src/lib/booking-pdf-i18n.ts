// i18n dictionary for booking PDF confirmation
export type PdfLocale = 'ru' | 'en' | 'uz';

export function normalizePdfLocale(input: unknown): PdfLocale {
  const s = String(input ?? '').toLowerCase();
  if (s.startsWith('uz')) return 'uz';
  if (s.startsWith('en')) return 'en';
  return 'ru';
}

type Dict = Record<PdfLocale, string>;

export const T = {
  docTitle: { ru: 'Подтверждение бронирования', en: 'Booking confirmation', uz: 'Bronlash tasdig‘i' } as Dict,
  statusConfirmed: { ru: 'Подтверждено', en: 'Confirmed', uz: 'Tasdiqlangan' } as Dict,
  bookingNo: { ru: 'Бронь №', en: 'Booking #', uz: 'Bron №' } as Dict,
  tour: { ru: 'Тур', en: 'Tour', uz: 'Sayohat' } as Dict,
  city: { ru: 'Город', en: 'City', uz: 'Shahar' } as Dict,
  description: { ru: 'Описание', en: 'Description', uz: 'Tavsif' } as Dict,
  duration: { ru: 'Длительность', en: 'Duration', uz: 'Davomiyligi' } as Dict,
  hours: { ru: 'ч', en: 'h', uz: 'soat' } as Dict,
  languages: { ru: 'Языки', en: 'Languages', uz: 'Tillar' } as Dict,
  categories: { ru: 'Категории', en: 'Categories', uz: 'Toifalar' } as Dict,
  highlights: { ru: 'Что увидим', en: 'Highlights', uz: 'Asosiy lahzalar' } as Dict,
  included: { ru: 'Включено', en: 'Included', uz: 'Kiritilgan' } as Dict,
  notIncluded: { ru: 'Не включено', en: 'Not included', uz: 'Kiritilmagan' } as Dict,
  transport: { ru: 'Транспорт', en: 'Transport', uz: 'Transport' } as Dict,
  transportYes: { ru: 'входит в стоимость', en: 'included', uz: 'kiritilgan' } as Dict,
  transportNo: { ru: 'не включён', en: 'not included', uz: 'kiritilmagan' } as Dict,

  bookingDetails: { ru: 'Детали бронирования', en: 'Booking details', uz: 'Bron tafsilotlari' } as Dict,
  date: { ru: 'Дата', en: 'Date', uz: 'Sana' } as Dict,
  startTime: { ru: 'Время начала', en: 'Start time', uz: 'Boshlanish vaqti' } as Dict,
  meetingPoint: { ru: 'Место встречи', en: 'Meeting point', uz: 'Uchrashuv joyi' } as Dict,
  endPoint: { ru: 'Место окончания тура', en: 'End of tour', uz: 'Tur tugash joyi' } as Dict,
  notSpecified: { ru: 'не указано', en: 'not specified', uz: 'ko‘rsatilmagan' } as Dict,
  guests: { ru: 'Гости', en: 'Guests', uz: 'Mehmonlar' } as Dict,
  adults: { ru: 'взр.', en: 'adults', uz: 'kattalar' } as Dict,
  children: { ru: 'дет.', en: 'children', uz: 'bolalar' } as Dict,
  groupType: { ru: 'Тип группы', en: 'Group type', uz: 'Guruh turi' } as Dict,
  tourLanguage: { ru: 'Язык тура', en: 'Tour language', uz: 'Tur tili' } as Dict,
  total: { ru: 'Итого', en: 'Total', uz: 'Jami' } as Dict,
  clientNotes: { ru: 'Комментарий клиента', en: 'Client notes', uz: 'Mijoz izohi' } as Dict,

  guideBlock: { ru: 'Ваш гид', en: 'Your guide', uz: 'Yo‘lboshchingiz' } as Dict,
  rating: { ru: 'Рейтинг', en: 'Rating', uz: 'Reyting' } as Dict,
  phone: { ru: 'Телефон', en: 'Phone', uz: 'Telefon' } as Dict,
  telegram: { ru: 'Telegram', en: 'Telegram', uz: 'Telegram' } as Dict,

  footerLine: {
    ru: 'Hamroh — гиды Узбекистана и Таджикистана. hamrohim.com',
    en: 'Hamroh — local guides in Uzbekistan and Tajikistan. hamrohim.com',
    uz: 'Hamroh — O‘zbekiston va Tojikiston yo‘lboshchilari. hamrohim.com',
  } as Dict,
  generated: { ru: 'Сгенерировано', en: 'Generated', uz: 'Yaratilgan' } as Dict,

  groupPrivate: { ru: 'Индивидуальный', en: 'Private', uz: 'Individual' } as Dict,
  groupSmall: { ru: 'Малая группа', en: 'Small group', uz: 'Kichik guruh' } as Dict,
  groupGroup: { ru: 'Группа', en: 'Group', uz: 'Guruh' } as Dict,
  groupLarge: { ru: 'Большая группа', en: 'Large group', uz: 'Katta guruh' } as Dict,
};

export function tt(key: keyof typeof T, locale: PdfLocale): string {
  return T[key][locale] ?? T[key].ru;
}

export function localizedTour(tour: {
  title?: string | null;
  title_ru?: string | null;
  title_en?: string | null;
  title_uz?: string | null;
  short_description?: string | null;
  short_description_ru?: string | null;
  short_description_en?: string | null;
  short_description_uz?: string | null;
  description_md?: string | null;
  description_md_ru?: string | null;
  description_md_en?: string | null;
  description_md_uz?: string | null;
}, locale: PdfLocale) {
  const pick = (base: string | null | undefined, ru: string | null | undefined, en: string | null | undefined, uz: string | null | undefined) => {
    const v = locale === 'ru' ? ru : locale === 'en' ? en : uz;
    return (v && v.trim()) || (base ?? '') || '';
  };
  return {
    title: pick(tour.title, tour.title_ru, tour.title_en, tour.title_uz),
    short: pick(tour.short_description, tour.short_description_ru, tour.short_description_en, tour.short_description_uz),
    description: pick(tour.description_md, tour.description_md_ru, tour.description_md_en, tour.description_md_uz),
  };
}

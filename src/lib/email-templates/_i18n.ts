export type Locale = 'ru' | 'uz' | 'en'

export const LOCALES: readonly Locale[] = ['ru', 'uz', 'en'] as const

export function normalizeLocale(v: unknown): Locale {
  return v === 'uz' || v === 'en' || v === 'ru' ? v : 'ru'
}

export type LocaleDict<T> = Record<Locale, T>

export function pick<T>(dict: LocaleDict<T>, locale: Locale): T {
  return dict[locale] ?? dict.ru
}

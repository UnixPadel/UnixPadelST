import i18n from '@/i18n/i18n'

/** Arayüz diline bağlı tarih, saat ve sayı biçimlerinin tek kaynağı (TR: tr-TR, EN: en-GB). */
export type AppLang = 'tr' | 'en'

const LOCALES: Record<AppLang, string> = { tr: 'tr-TR', en: 'en-GB' }

export const appLang = (): AppLang => (i18n.language?.toLowerCase().startsWith('en') ? 'en' : 'tr')

export const appLocale = (lang: AppLang = appLang()): string => LOCALES[lang]

export function formatTime(date: string | number | Date, withSeconds = false): string {
  return new Date(date).toLocaleTimeString(appLocale(), {
    hour: '2-digit',
    minute: '2-digit',
    ...(withSeconds ? { second: '2-digit' as const } : {}),
  })
}

export function formatDateTime(date: string | number | Date): string {
  return new Date(date).toLocaleString(appLocale(), { dateStyle: 'short', timeStyle: 'short' })
}

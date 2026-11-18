import { appLang, appLocale, type AppLang } from '@/lib/format'

export type NumberLang = AppLang

/**
 * Dile duyarlı ondalık ayrıştırma (Faz 0 / F0-1, EN uyumu 2026-11-18).
 *
 * Kurallar:
 *   • Virgül ve nokta birlikteyse sondaki ondalıktır → "1.234,56" ve "1,234.56" = 1234.56
 *   • Aynı ayırıcı birden çok kez geçiyorsa binliktir → "1.000.000" ve "1,000,000" = 1000000
 *   • Tek ayırıcı dilin ondalık ayırıcısıysa ondalıktır → TR "1,500" = 1.5, EN "1.500" = 1.5
 *   • Tek ayırıcı diğer dilinkiyse "d{1,3}?ddd" biçiminde ve tam kısım 0 değilken binliktir
 *     → TR "1.500" = 1500, EN "1,500" = 1500; aksi halde ondalıktır → TR "12.5", EN "1,5"
 * Geçersiz girişte '' döner (NaN asla dışarı sızmaz).
 */
export function parseDecimal(text: string, lang: NumberLang = appLang()): number | '' {
  let s = (text ?? '').replace(/\s/g, '')
  if (s.includes(',') && s.includes('.')) s = s.replace(/[.,]+$/, '')
  if (s === '') return ''

  const lastSeparator = Math.max(s.lastIndexOf(','), s.lastIndexOf('.'))
  let decimalAt = -1
  if (s.includes(',') && s.includes('.')) {
    decimalAt = lastSeparator
  } else if (lastSeparator >= 0) {
    const separator = s[lastSeparator]
    const isSingle = s.indexOf(separator) === lastSeparator
    const isLanguageDecimal = separator === (lang === 'en' ? '.' : ',')
    const looksGrouped = /^\d{1,3}[.,]\d{3}$/.test(s) && !/^0[.,]/.test(s)
    if (isSingle && (isLanguageDecimal || !looksGrouped)) decimalAt = lastSeparator
  }

  const digits = (part: string) => part.replace(/[.,]/g, '')
  const normalized = decimalAt >= 0
    ? `${digits(s.slice(0, decimalAt))}.${digits(s.slice(decimalAt + 1))}`
    : digits(s)
  if (normalized === '' || normalized === '.') return ''
  const n = Number(normalized.endsWith('.') ? normalized.slice(0, -1) : normalized)
  return Number.isFinite(n) ? n : ''
}

/**
 * Giriş alanı için gösterim: etkin dilin ondalık ayırıcısı, binlik ayırıcı YOK.
 * Böylece blur'da yeniden ayrıştırma belirsiz kalmaz ve operatör yorumlanan değeri
 * görür (TR: "1.500" yazan 1500 → "1500"; EN: "1,500" yazan 1500 → "1500").
 */
export function formatDecimalInput(n: number | '' | null | undefined, lang: NumberLang = appLang()): string {
  if (n === '' || n == null || !Number.isFinite(n)) return ''
  return n.toLocaleString(appLocale(lang), { useGrouping: false, maximumFractionDigits: 6 })
}

/** Sayısal örnek metni ("0,00", "5.500") etkin dilin ayırıcılarına çevirir. */
export function localizeNumberPlaceholder(placeholder: string, lang: NumberLang = appLang()): string {
  if (lang !== 'en' || !/^[\d.,]+$/.test(placeholder)) return placeholder
  return placeholder.replace(/[.,]/g, (separator) => (separator === '.' ? ',' : '.'))
}

/** Salt-okunur sayı gösterimi (binlikli, 2 hane). */
export function formatNumber(n: number | null | undefined, digits = 2): string {
  if (n == null || !Number.isFinite(n)) return '-'
  return n.toLocaleString(appLocale(), { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

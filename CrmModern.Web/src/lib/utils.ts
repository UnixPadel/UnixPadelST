import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date | null | undefined): string {
  if (date == null) return '-'
  return new Date(date).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/**
 * PROMPT-v6 §3 — Telefonlar DB'de ülke kodsuz tutulur; kod Ulkeler.NumaraBirimi'nde
 * (örn '+90'). Ülke adıyla eşleşen kayıt bulunursa numara prefix'lenir; eşleşme
 * yoksa veya numara zaten '+' ile başlıyorsa olduğu gibi döner.
 */
export function formatPhone(
  ulkeAdi: string | null | undefined,
  telefon: string | null | undefined,
  ulkeler: ReadonlyArray<{ ulkeAdi: string; numaraBirimi: string }>,
): string {
  const tel = telefon?.trim()
  if (!tel) return ''
  if (tel.startsWith('+')) return tel
  const ad = ulkeAdi?.trim().toLocaleLowerCase('tr')
  if (!ad) return tel
  const prefix = ulkeler.find((u) => u.ulkeAdi.trim().toLocaleLowerCase('tr') === ad)
    ?.numaraBirimi?.trim()
  return prefix ? `${prefix} ${tel}` : tel
}

/** PROMPT-v6 §6 — yoğun gridlerde kısa tarih (dd.MM.yy). */
export function formatDateShort(date: string | Date | null | undefined): string {
  if (date == null) return '-'
  return new Date(date).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })
}

export function formatCurrency(amount: number | null | undefined, currency = 'EUR'): string {
  if (amount == null) return '-'
  const symbols: Record<string, string> = {
    Euro: '€',
    Dolar: '$',
    TL: '₺',
    Sterlin: '£',
  }
  const symbol = symbols[currency] ?? currency
  return `${symbol}${amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

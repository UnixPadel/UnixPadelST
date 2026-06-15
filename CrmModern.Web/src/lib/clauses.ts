// Round-8 §4/§5 — DetayTablo standart şart KODLARI ve dil-duyarlı çözümleme.
// Yeni siparişler standart şartları "@@KOD" olarak saklar; ekran ve proforma
// hedef dile çevirir. Serbest metin verbatim kalır. Backend karşılığı:
// CrmModern.Core/Proforma/ClauseText.cs (iki taraf AYNI metinleri üretir).
import type { TFunction } from 'i18next'

export const CLAUSE = {
  FIYAT:  '@@FIYAT',
  KDV:    '@@KDV',
  KARGO:  '@@KARGO',
  MONTAJ: '@@MONTAJ',
  HAKLAR: '@@HAKLAR',
} as const

export const TESLIMAT_PREFIX = '@@TESLIMAT:'
export const ODEME_PREFIX    = '@@ODEME:'

// Yeni boş formda seed edilen standart şartlar (sıra korunur).
export const STANDART_SART_KODLARI: readonly string[] = [
  CLAUSE.FIYAT, CLAUSE.KDV, CLAUSE.KARGO, CLAUSE.MONTAJ, CLAUSE.HAKLAR,
]

export const teslimatCode = (incoterm: string) => `${TESLIMAT_PREFIX}${incoterm}`
export const odemeCode = (sekli: 'Pesin' | 'Vadeli', pesinYuzde: number | null): string => {
  if (sekli === 'Pesin') return `${ODEME_PREFIX}Pesin`
  return pesinYuzde != null ? `${ODEME_PREFIX}Vadeli:${pesinYuzde}` : `${ODEME_PREFIX}Vadeli`
}

export const isClauseCode = (line: string) => line.trim().startsWith('@@')

// Eski (legacy) TR standart metinleri → kod. Revize / Formu Getir hidrasyonunda
// normalleştirilir; böylece eski siparişler de dil-duyarlı proforma üretir.
const LEGACY_TR: Record<string, string> = {
  'Fiyatlar 2 hafta geçerlidir.': CLAUSE.FIYAT,
  'Fiyatlara KDV dahil değildir.': CLAUSE.KDV,
  'Fiyatlara nakliye dahil değildir.': CLAUSE.KARGO,
  'Fiyatlara montaj dahil değildir.': CLAUSE.MONTAJ,
  'Bu belgedeki fiyat ve bilgiler üzerindeki tüm haklar saklıdır.': CLAUSE.HAKLAR,
}

/** Tek satırı koda normalleştirir (legacy TR / prefix'li → kod); serbest metin aynen döner. */
export function normalizeToCode(line: string): string {
  const s = line.trim()
  if (isClauseCode(s)) return s
  if (s in LEGACY_TR) return LEGACY_TR[s]
  if (s.startsWith('Teslimat Şekli:')) return teslimatCode(s.slice('Teslimat Şekli:'.length).trim())
  if (s.startsWith('Ödeme Şekli:')) {
    const rest = s.slice('Ödeme Şekli:'.length).trim()
    if (/vadeli/i.test(rest)) {
      const m = rest.match(/%?\s*(\d+)/)
      return odemeCode('Vadeli', m ? Number(m[1]) : null)
    }
    return odemeCode('Pesin', null)
  }
  return line
}

/** Bir detay satırını UI diline çevirir. Kod değilse aynen döner. */
export function resolveClause(t: TFunction, line: string): string {
  const s = line.trim()
  if (!isClauseCode(s)) return line
  if (s.startsWith(TESLIMAT_PREFIX)) return t('clauses.teslimat', { value: s.slice(TESLIMAT_PREFIX.length).trim() })
  if (s.startsWith(ODEME_PREFIX)) {
    const rest = s.slice(ODEME_PREFIX.length).trim()
    if (rest.toLowerCase().startsWith('pesin')) return t('clauses.odemePesin')
    const parts = rest.split(':')
    if (parts.length >= 2 && /^\d+$/.test(parts[1])) return t('clauses.odemeVadeliPesin', { pesin: parts[1] })
    return t('clauses.odemeVadeli')
  }
  switch (s) {
    case CLAUSE.FIYAT:  return t('clauses.fiyat')
    case CLAUSE.KDV:    return t('clauses.kdv')
    case CLAUSE.KARGO:  return t('clauses.kargo')
    case CLAUSE.MONTAJ: return t('clauses.montaj')
    case CLAUSE.HAKLAR: return t('clauses.haklar')
    default:            return line
  }
}

/**
 * Prefix/kod ile tanınan otomatik satırı idempotent günceller: varsa yerinde
 * değiştirir, yoksa sona ekler, line=null ise siler. Serbest metne dokunmaz.
 */
export function upsertClause(details: string[], matchPrefix: string, line: string | null): string[] {
  const idx = details.findIndex((s) => s.startsWith(matchPrefix))
  if (line === null) return idx >= 0 ? details.filter((_, i) => i !== idx) : details
  if (idx >= 0) return details.map((s, i) => (i === idx ? line : s))
  return [...details, line]
}

/** Ödeme Şekli kontrolünü mevcut detaylardan (kod veya legacy) kurar. */
export function parseOdemeFromDetails(details: string[]): '' | 'Pesin' | 'Vadeli' {
  const line = details.find((s) => s.startsWith(ODEME_PREFIX) || s.startsWith('Ödeme Şekli:'))
  if (!line) return ''
  return /vadeli/i.test(line) ? 'Vadeli' : 'Pesin'
}

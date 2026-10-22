/**
 * TR-öncelikli ondalık ayrıştırma (Faz 0 / F0-1).
 *
 * Eski DecimalInput yalnız İLK virgülü noktaya çeviriyordu; "1.234,56" → 1.234
 * olarak kaydediliyordu. Kurallar:
 *   • Virgül varsa: son virgül ondalık ayırıcıdır, tüm noktalar (ve önceki
 *     virgüller) binlik ayırıcı sayılır  → "1.234,56" = 1234.56, "1,5" = 1.5
 *   • Virgül yok, birden fazla nokta: noktalar binliktir → "1.000.000" = 1000000
 *   • Virgül yok, tek nokta: "d{1,3}.ddd" biçiminde ve tam kısım 0 değilse binlik
 *     ("1.500" = 1500, TR yazımı); aksi halde ondalık ("12.5" = 12.5, "0.125").
 * Geçersiz girişte '' döner (NaN asla dışarı sızmaz).
 */
export function parseDecimalTR(text: string): number | '' {
  let s = (text ?? '').replace(/\s/g, '')
  if (s === '') return ''
  if (s.includes(',')) {
    const last = s.lastIndexOf(',')
    s = s.slice(0, last).replace(/[.,]/g, '') + '.' + s.slice(last + 1).replace(/[.,]/g, '')
  } else {
    const dots = (s.match(/\./g) ?? []).length
    if (dots > 1) s = s.replace(/\./g, '')
    else if (dots === 1 && /^\d{1,3}\.\d{3}$/.test(s) && !/^0\./.test(s)) s = s.replace('.', '')
  }
  if (s === '.' || s === '') return ''
  const n = Number(s.endsWith('.') ? s.slice(0, -1) : s)
  return Number.isFinite(n) ? n : ''
}

/**
 * Giriş alanı için gösterim: virgüllü ondalık, binlik ayırıcı YOK. Böylece
 * blur'da yeniden ayrıştırma belirsiz kalmaz ve operatör yorumlanan değeri görür
 * ("1.500" yazan 1500 → "1500"; "1,5" → "1,5").
 */
export function formatDecimalInput(n: number | '' | null | undefined): string {
  if (n === '' || n == null || !Number.isFinite(n)) return ''
  return n.toLocaleString('tr-TR', { useGrouping: false, maximumFractionDigits: 6 })
}

/** Salt-okunur sayı gösterimi (binlikli, 2 hane). */
export function formatNumberTR(n: number | null | undefined, digits = 2): string {
  if (n == null || !Number.isFinite(n)) return '-'
  return n.toLocaleString('tr-TR', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

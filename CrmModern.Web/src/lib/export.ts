/**
 * E-7 — "Görünümü Excel'e aktar": ekrandaki filtreli satırlar + görünür
 * kolonlar. Excel'in TR yerel ayarıyla doğrudan açtığı CSV üretilir
 * (UTF-8 BOM, ';' ayırıcı, ondalık virgül). Ek bağımlılık gerektirmez.
 */
export function downloadCsv(fileName: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const esc = (v: string | number | null | undefined) => {
    if (v == null) return ''
    const s = typeof v === 'number'
      ? v.toLocaleString('tr-TR', { useGrouping: false, maximumFractionDigits: 6 })
      : String(v)
    return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [headers, ...rows].map((r) => r.map(esc).join(';'))
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName.endsWith('.csv') ? fileName : `${fileName}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Para birimine göre ara toplam (karışık döviz asla tek toplamda birleşmez).
 * Döner: [['Euro', 1234.5], ['Dolar', 300]] — sıra ilk görülme sırasıdır.
 */
export function sumByCurrency<T>(rows: T[], amount: (r: T) => number | null | undefined, currency: (r: T) => string | null | undefined): [string, number][] {
  const map = new Map<string, number>()
  for (const r of rows) {
    const a = Number(amount(r))
    if (!Number.isFinite(a)) continue
    const c = currency(r) || '—'
    map.set(c, (map.get(c) ?? 0) + a)
  }
  return [...map.entries()]
}

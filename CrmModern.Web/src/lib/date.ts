/**
 * Yerel saat dilimine göre <input type="date|datetime-local"> değerleri (F0-6).
 * `new Date().toISOString().slice(...)` UTC üretir: TR'de saat 3 saat geride,
 * 00:00-03:00 arasında tarih bir gün geride çıkıyordu.
 */
function localIso(d: Date): string {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString()
}

/** yyyy-MM-dd (yerel). */
export const localDateInput = (d: Date = new Date()): string => localIso(d).slice(0, 10)

/** yyyy-MM-ddTHH:mm (yerel). */
export const localDateTimeInput = (d: Date = new Date()): string => localIso(d).slice(0, 16)

/** Verilen tarihten bugüne tam gün (Bekleyen İşler / önceki aşama yaşı); geçersizse null. */
export function ageDays(since?: string | null): number | null {
  if (!since) return null
  const d = new Date(since)
  if (Number.isNaN(d.getTime())) return null
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86_400_000))
}

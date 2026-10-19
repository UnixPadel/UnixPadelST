/**
 * Para birimi çevirisi — TL bazlı kurlar (1 birim döviz = N TL, TCMB "Döviz Satış").
 *
 * Bileşen kataloğu fiyatı kendi para biriminde tutar (BilesenBilgileri.Currency:
 * EUR/USD/TRY — Panoramic Padel Court listesi TL); sipariş ise Para Tipi
 * (Euro/Dolar/TL/Sterlin) üzerinden çalışır. Çeviri her zaman TL üzerinden yapılır.
 */
export type IsoCurrency = 'TRY' | 'EUR' | 'USD' | 'GBP'

/** 1 birim → TL. TRY her zaman 1 kabul edilir; eksik kur = çeviri yapılamaz. */
export type Rates = Partial<Record<IsoCurrency, number>>

export const ISO_CURRENCIES: IsoCurrency[] = ['EUR', 'USD', 'GBP', 'TRY']

const PARA_TIPI_ISO: Record<string, IsoCurrency> = {
  Euro: 'EUR', Dolar: 'USD', TL: 'TRY', Sterlin: 'GBP',
}

/** Sipariş Para Tipi (Euro/Dolar/TL/Sterlin) → ISO kodu. Bilinmeyen değerde EUR. */
export const paraTipiToIso = (paraTipi: string): IsoCurrency => PARA_TIPI_ISO[paraTipi] ?? 'EUR'

/** API'den gelen serbest metin para birimi → ISO (TL/TRY, Euro/EUR …). */
export function normalizeIso(v: string | null | undefined): IsoCurrency {
  const s = (v ?? '').trim().toUpperCase()
  if (s === 'EUR' || s === 'EURO') return 'EUR'
  if (s === 'USD' || s === 'DOLAR') return 'USD'
  if (s === 'GBP' || s === 'STERLIN') return 'GBP'
  return 'TRY'
}

export function isoSymbol(c: IsoCurrency): string {
  switch (c) {
    case 'EUR': return '€'
    case 'USD': return '$'
    case 'GBP': return '£'
    case 'TRY': return '₺'
  }
}

const tlPer = (c: IsoCurrency, rates: Rates): number | null =>
  c === 'TRY' ? 1 : (rates[c] && rates[c]! > 0 ? rates[c]! : null)

/** amount (from) → to. Gerekli kur yoksa null. */
export function convert(amount: number, from: IsoCurrency, to: IsoCurrency, rates: Rates): number | null {
  if (from === to) return amount
  const a = tlPer(from, rates), b = tlPer(to, rates)
  if (a == null || b == null) return null
  return amount * a / b
}

/** Sipariş satırı fiyatları DB'de decimal(10,2) — kuruşa yuvarla. */
export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

import api from '@/lib/axios'
import type { Rates } from '@/lib/currency'

export interface ExchangeRates {
  tarih: string | null   // 'YYYY-MM-DD' (TCMB bülten tarihi)
  kaynak: string
  rates: Rates           // 1 birim → TL; TRY = 1
}

/** GET /api/exchange-rates — TCMB günlük kurları (backend 1 saat önbellekler). */
export const getExchangeRates = () =>
  api.get<{ data: ExchangeRates }>('/api/exchange-rates').then((r) => r.data.data)

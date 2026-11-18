import api from '@/lib/axios'
import type { ApiResponse, OrderSearchResult, UnifiedSearchResult } from '@/types'

export interface OrderSearchParams {
  q?: string
  tur?: string
  asama?: string
  kontrol?: string
  ulke?: string
  baslangic?: string
  bitis?: string
}

/** Tek kutudan sipariş ve teklif araması (Sipariş Ara ekranı). */
export const findOrders = async (params: OrderSearchParams, signal?: AbortSignal): Promise<OrderSearchResult> => {
  const res = await api.get<ApiResponse<OrderSearchResult>>('/api/search/orders', { params, signal })
  return res.data.data
}

// ── Faz 7 unified topbar search ─────────────────────────────────────────────

// SR-10 — signal: yeni tuş vuruşu önceki isteği iptal eder (yarış koşulu yok).
export const unifiedSearch = async (q: string, signal?: AbortSignal): Promise<UnifiedSearchResult> => {
  const res = await api.get<ApiResponse<UnifiedSearchResult>>('/api/search/unified', { params: { q }, signal })
  return res.data.data
}

import api from '@/lib/axios'
import type { ApiResponse, SearchResultDto, UnifiedSearchResult } from '@/types'

export interface SearchParams {
  siparisNo?: string
  musteriAd?: string
  kullaniciID?: number
  ulke?: string
  asama?: string
  kontrol?: string
  odemeDurum?: string
  baslangic?: string
  bitis?: string
}

export const searchOrders = async (params: SearchParams): Promise<SearchResultDto[]> => {
  const res = await api.get<ApiResponse<SearchResultDto[]>>('/api/search', { params })
  return res.data.data
}

// ── Faz 7 unified topbar search ─────────────────────────────────────────────

// SR-10 — signal: yeni tuş vuruşu önceki isteği iptal eder (yarış koşulu yok).
export const unifiedSearch = async (q: string, signal?: AbortSignal): Promise<UnifiedSearchResult> => {
  const res = await api.get<ApiResponse<UnifiedSearchResult>>('/api/search/unified', { params: { q }, signal })
  return res.data.data
}

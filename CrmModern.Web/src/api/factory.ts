import api from '@/lib/axios'
import type { ApiResponse, FactoryOrderListDto, MoveToProductionDto } from '@/types'

// Faz-fix 2.2 — Fabrika.cs araButtonInTab_Click filtrelerinin portu.
// Tüm alanlar opsiyonel; query string'e sadece set olanlar gider.
export interface FactoryFilter {
  siparisNo?:      string
  musteriAd?:      string
  mUlke?:          string
  kullaniciID?:    number
  asama?:          string
  baslangicTarih?: string  // ISO date (yyyy-MM-dd)
  bitisTarih?:     string
}

export const getFactoryOrders = async (filter: FactoryFilter = {}): Promise<FactoryOrderListDto[]> => {
  // undefined / '' / 0 değerleri params'tan at — boş query param backend'i karıştırmasın.
  const params: Record<string, string | number> = {}
  for (const [k, v] of Object.entries(filter)) {
    if (v === undefined || v === null || v === '') continue
    if (typeof v === 'number' && v === 0) continue
    params[k] = v as string | number
  }
  const res = await api.get<ApiResponse<FactoryOrderListDto[]>>('/api/factory', { params })
  return res.data.data
}

export const moveToProduction = async (siparisNo: string, dto: MoveToProductionDto): Promise<void> => {
  await api.put(`/api/factory/${siparisNo}/move-to-production`, dto)
}

export const markReady = async (siparisNo: string): Promise<void> => {
  await api.put(`/api/factory/${siparisNo}/mark-ready`)
}

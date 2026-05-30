import api from '@/lib/axios'
import type { ApiResponse, FactoryOrderListDto, MoveToProductionDto } from '@/types'

// Paket 2 — opsiyonel `asama` filtresi
export const getFactoryOrders = async (asama?: string): Promise<FactoryOrderListDto[]> => {
  const params = asama ? { asama } : undefined
  const res = await api.get<ApiResponse<FactoryOrderListDto[]>>('/api/factory', { params })
  return res.data.data
}

export const moveToProduction = async (siparisNo: string, dto: MoveToProductionDto): Promise<void> => {
  await api.put(`/api/factory/${siparisNo}/move-to-production`, dto)
}

export const markReady = async (siparisNo: string): Promise<void> => {
  await api.put(`/api/factory/${siparisNo}/mark-ready`)
}

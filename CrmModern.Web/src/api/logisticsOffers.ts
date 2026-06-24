import api from '@/lib/axios'
import type {
  ApiResponse,
  LogisticsOffer,
  LogisticsOfferQueueItem,
  SubmitLogisticsOfferRequest,
} from '@/types'

// ── Lojistik Teklif akışı ─────────────────────────────────────────────────────
// Yalnız Lojistik + Yönetici. Onay/iptal yalnız Yönetici (backend [Authorize] ile).

export const getOfferQueue = async (): Promise<LogisticsOfferQueueItem[]> => {
  const res = await api.get<ApiResponse<LogisticsOfferQueueItem[]>>('/api/logistics/offers/queue')
  return res.data.data
}

export const getOffers = async (siparisNo: string): Promise<LogisticsOffer[]> => {
  const res = await api.get<ApiResponse<LogisticsOffer[]>>(`/api/logistics/offers/${siparisNo}`)
  return res.data.data
}

export const submitOffer = async (siparisNo: string, dto: SubmitLogisticsOfferRequest): Promise<void> => {
  await api.post(`/api/logistics/offers/${siparisNo}`, dto)
}

export const approveOffer = async (teklifId: number): Promise<void> => {
  await api.post(`/api/logistics/offers/${teklifId}/approve`)
}

export const revokeOffer = async (teklifId: number): Promise<void> => {
  await api.post(`/api/logistics/offers/${teklifId}/revoke`)
}

export const rejectOffer = async (teklifId: number, redNotu: string): Promise<void> => {
  await api.post(`/api/logistics/offers/${teklifId}/reject`, { redNotu })
}

import api from '@/lib/axios'
import type {
  ApiResponse,
  LogisticsHistoryDto,
  LogisticsOrderListDto,
  LogisticsPendingApprovalDto,
  MoveToLogisticsDto,
} from '@/types'

// ── Lists ────────────────────────────────────────────────────────────────────

export const getLogisticsOrders = async (): Promise<LogisticsOrderListDto[]> => {
  const res = await api.get<ApiResponse<LogisticsOrderListDto[]>>('/api/logistics')
  return res.data.data
}

export const getReadyForShipment = async (): Promise<LogisticsOrderListDto[]> => {
  const res = await api.get<ApiResponse<LogisticsOrderListDto[]>>('/api/logistics/ready')
  return res.data.data
}

export const getLogisticsHistory = async (siparisNo?: string, firmaAdi?: string): Promise<LogisticsHistoryDto[]> => {
  const res = await api.get<ApiResponse<LogisticsHistoryDto[]>>('/api/logistics/history', {
    params: { siparisNo, firmaAdi },
  })
  return res.data.data
}

export const getCarriers = async (): Promise<string[]> => {
  const res = await api.get<ApiResponse<string[]>>('/api/logistics/carriers')
  return res.data.data
}

export const getCesitler = async (): Promise<string[]> => {
  const res = await api.get<ApiResponse<string[]>>('/api/logistics/cesitler')
  return res.data.data
}

// ── Mutations ────────────────────────────────────────────────────────────────

export interface CreateShipmentRequest {
  siparisNo: string
  firmaAdi: string
  lojistikCesit: string
  fiyat: number
  lNot?: string
  sTarih: string  // ISO yyyy-mm-dd
  lojistikNot?: string
}

export const createShipment = async (req: CreateShipmentRequest): Promise<void> => {
  await api.post('/api/logistics', req)
}

export const moveToLogistics = async (siparisNo: string, dto: MoveToLogisticsDto): Promise<void> => {
  await api.put(`/api/logistics/${siparisNo}/move-to-logistics`, dto)
}

export const completeShipment = async (sevkId: number, not?: string): Promise<void> => {
  await api.post(`/api/logistics/${sevkId}/complete`, { not })
}

export const cancelShipment = async (sevkId: number, sebep: string): Promise<void> => {
  await api.post(`/api/logistics/${sevkId}/cancel`, { sebep })
}

export const completeOrder = async (siparisNo: string): Promise<void> => {
  await api.put(`/api/logistics/${siparisNo}/complete`)
}

// ── Paket 3: Muhasebe Onay Zinciri ───────────────────────────────────────────

export const getPendingMuhasebeApproval = async (): Promise<LogisticsPendingApprovalDto[]> => {
  const res = await api.get<ApiResponse<LogisticsPendingApprovalDto[]>>(
    '/api/logistics/pending-muhasebe-approval',
  )
  return res.data.data
}

export const muhasebeApproveLogistics = async (sevkId: number, aciklama?: string): Promise<void> => {
  await api.post(`/api/logistics/${sevkId}/muhasebe-approve`, { aciklama })
}

export const muhasebeRejectLogistics = async (sevkId: number, redNotu: string): Promise<void> => {
  await api.post(`/api/logistics/${sevkId}/muhasebe-reject`, { redNotu })
}

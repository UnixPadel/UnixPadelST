import api from '@/lib/axios'
import type { ApiResponse, QualityControlListDto, OrderDetail } from '@/types'

export const getPendingQC = async (): Promise<QualityControlListDto[]> => {
  const res = await api.get<ApiResponse<QualityControlListDto[]>>('/api/quality-control/pending')
  return res.data.data
}

export const getQCById = async (siparisNo: string): Promise<OrderDetail> => {
  const res = await api.get<ApiResponse<OrderDetail>>(`/api/quality-control/${siparisNo}`)
  return res.data.data
}

export interface QCHistoryItem {
  onayID: number
  siparisNo: string
  kullaniciID: number
  kullaniciAdi?: string
  onayDurumu: string
  aciklama?: string
  onayTarih?: string
}

export const getQCHistory = async (siparisNo: string): Promise<QCHistoryItem[]> => {
  const res = await api.get<ApiResponse<QCHistoryItem[]>>(`/api/quality-control/${siparisNo}/history`)
  return res.data.data
}

export const approveQC = async (siparisNo: string, kontrolNot?: string): Promise<void> => {
  await api.post(`/api/quality-control/${siparisNo}/approve`, { kontrolNot })
}

export const rejectQC = async (siparisNo: string, red: string): Promise<void> => {
  await api.post(`/api/quality-control/${siparisNo}/reject`, { red })
}

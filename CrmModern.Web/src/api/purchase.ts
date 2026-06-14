import api from '@/lib/axios'
import type { ApiResponse, CreatePurchaseRequestDto, PurchaseRequestListDto } from '@/types'

// ── Listeler ────────────────────────────────────────────────────────────────

export const getPurchaseByDepartman = async (departman: string, isGozlemci = false): Promise<PurchaseRequestListDto[]> => {
  const res = await api.get<ApiResponse<PurchaseRequestListDto[]>>('/api/purchase', { params: { departman, isGozlemci } })
  return res.data.data
}

export const getMyPurchaseRequests = async (): Promise<PurchaseRequestListDto[]> => {
  const res = await api.get<ApiResponse<PurchaseRequestListDto[]>>('/api/purchase/my')
  return res.data.data
}

export interface PurchaseFilter {
  talepEden?: string
  departman?: string
  durum?: string
  talepTipi?: string
  baslangicTarih?: string
  bitisTarih?: string
  page?: number
  pageSize?: number
}

export interface PurchasePage {
  items: PurchaseRequestListDto[]
  totalCount: number
  page: number
  pageSize: number
}

export const getAllPurchaseRequests = async (filter: PurchaseFilter = {}): Promise<PurchasePage> => {
  const res = await api.get<ApiResponse<PurchasePage>>('/api/purchase/all', { params: filter })
  return res.data.data
}

// ── Detay ───────────────────────────────────────────────────────────────────

export interface PurchaseRequestDetail extends PurchaseRequestListDto {
  notlar?: string
  onIzlemeYapan?: string
  onIzlemeTarihi?: string
  odemeTuru?: string
  odenenTutar?: number
  odemeTutari?: number
  odemeVadeSuresi?: string
  odemeVadeTutari?: number
  odemeVadeTarihi?: string
  odemeBelgeNo?: string
  odemeBankaAdi?: string
  odemeIslemTarihi?: string
  odemeKartTipi?: string
  odemeTaksitSayisi?: number
  odemeAciklama?: string
  muhasebeYapanKullanici?: string
  muhasebeTarihi?: string
}

export const getPurchaseById = async (talepId: number): Promise<PurchaseRequestDetail> => {
  const res = await api.get<ApiResponse<PurchaseRequestDetail>>(`/api/purchase/${talepId}`)
  return res.data.data
}

// ── Aşama listeleri ─────────────────────────────────────────────────────────

export const getPendingPreApproval = async (): Promise<PurchaseRequestListDto[]> => {
  const res = await api.get<ApiResponse<PurchaseRequestListDto[]>>('/api/purchase/pending-preapproval')
  return res.data.data
}

export const getPendingPayment = async (): Promise<PurchaseRequestListDto[]> => {
  const res = await api.get<ApiResponse<PurchaseRequestListDto[]>>('/api/purchase/pending-payment')
  return res.data.data
}

export const getPendingFinal = async (): Promise<PurchaseRequestListDto[]> => {
  const res = await api.get<ApiResponse<PurchaseRequestListDto[]>>('/api/purchase/pending-final')
  return res.data.data
}

// Geriye uyum
export const getPendingPurchases = async (): Promise<PurchaseRequestListDto[]> => {
  const res = await api.get<ApiResponse<PurchaseRequestListDto[]>>('/api/purchase/pending')
  return res.data.data
}

export const getPurchaseHistory = async (page = 1, pageSize = 50): Promise<PurchaseRequestListDto[]> => {
  const res = await api.get<ApiResponse<PurchaseRequestListDto[]>>('/api/purchase/history', { params: { page, pageSize } })
  return res.data.data
}

// ── Mutations ───────────────────────────────────────────────────────────────

export const createPurchaseRequest = async (dto: CreatePurchaseRequestDto): Promise<void> => {
  await api.post('/api/purchase', dto)
}

export const preApprovePurchase = (talepId: number, aciklama?: string) =>
  api.post(`/api/purchase/${talepId}/preapprove`, { aciklama }).then((r) => r.data)

export const preRejectPurchase = (talepId: number, redNotu: string) =>
  api.post(`/api/purchase/${talepId}/prereject`, { redNotu }).then((r) => r.data)

export interface SetPaymentDetailsRequest {
  odemeTuru: string
  odenenTutar?: number
  odemeTutari?: number
  odemeVadeSuresi?: string
  odemeVadeTutari?: number
  odemeVadeTarihi?: string
  odemeBelgeNo?: string
  odemeBankaAdi?: string
  odemeIslemTarihi?: string
  odemeKartTipi?: string
  odemeTaksitSayisi?: number
  odemeAciklama?: string
}

export const setPaymentDetails = (talepId: number, dto: SetPaymentDetailsRequest) =>
  api.post(`/api/purchase/${talepId}/payment-details`, dto).then((r) => r.data)

export const finalApprovePurchase = (talepId: number, aciklama?: string) =>
  api.post(`/api/purchase/${talepId}/final-approve`, { aciklama }).then((r) => r.data)

export const finalRejectPurchase = (talepId: number, redNotu: string) =>
  api.post(`/api/purchase/${talepId}/final-reject`, { redNotu }).then((r) => r.data)

// PROMPT-v7 §2: override onayı — yalnız elshan.rasulov (backend gate).
export const overrideApprovePurchase = (talepId: number, aciklama?: string) =>
  api.post(`/api/purchase/${talepId}/override-approve`, { aciklama }).then((r) => r.data)

// Geriye uyum (Faz 5 öncesi)
export const approvePurchase = async (talepId: number, islemYapanKullanici: string): Promise<void> => {
  await api.put(`/api/purchase/${talepId}/approve`, null, { params: { islemYapanKullanici } })
}
export const rejectPurchase = async (talepId: number, islemYapanKullanici: string, redNotu: string): Promise<void> => {
  await api.put(`/api/purchase/${talepId}/reject`, { redNotu }, { params: { islemYapanKullanici } })
}

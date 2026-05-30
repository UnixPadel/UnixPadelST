import api from '@/lib/axios'
import type {
  ApiResponse, OrderListDto, OrderDetail, CreateOrderDto,
} from '@/types'

// ── List & search (Faz 3 multi-filter) ──────────────────────────────────────

export interface OrderFilter {
  siparisNo?: string
  musteriAd?: string
  kullaniciID?: number
  mUlke?: string
  asama?: string
  paraTipi?: string
  baslangicTarih?: string
  bitisTarih?: string
  page?: number
  pageSize?: number
}

export interface OrderListPage {
  items: OrderListDto[]
  totalCount: number
  page: number
  pageSize: number
}

export const getOrders = async (filter: OrderFilter = {}): Promise<OrderListPage> => {
  const res = await api.get<ApiResponse<OrderListPage>>('/api/orders', { params: filter })
  return res.data.data
}

// Paket 2 — opsiyonel `asama` filtresi
export const getMyOrders = async (asama?: string): Promise<OrderListDto[]> => {
  const params = asama ? { asama } : undefined
  const res = await api.get<ApiResponse<OrderListDto[]>>('/api/orders/my', { params })
  return res.data.data
}

export interface OrderTotals {
  euro: number
  dolar: number
  tl: number
  sterlin: number
  orderCount: number
}

export const getOrderTotals = async (filter: OrderFilter = {}): Promise<OrderTotals> => {
  const res = await api.get<ApiResponse<OrderTotals>>('/api/orders/totals', { params: filter })
  return res.data.data
}

// ── Single record + history ─────────────────────────────────────────────────

export const getOrderDetail = (no: string) =>
  api.get<ApiResponse<OrderDetail>>(`/api/orders/${no}`).then((r) => r.data.data)

export const getRejectionNote = (no: string) =>
  api.get<ApiResponse<{ red: string }>>(`/api/orders/${no}/rejection-note`).then((r) => r.data.data)

export interface OrderApproval {
  onayID: number
  siparisNo: string
  kullaniciID: number
  kullaniciAdi?: string
  onayDurumu: string
  aciklama?: string
  onayTarih?: string
}

export const getApprovals = async (no: string): Promise<OrderApproval[]> => {
  const res = await api.get<ApiResponse<OrderApproval[]>>(`/api/orders/${no}/approvals`)
  return res.data.data
}

export interface MaterialCostLine { kategoriID: number; kategoriAdi?: string; malzeme: number; iscilik: number; nakliye: number; diger: number; toplam: number }
export interface MaterialCost { siparisNo: string; genelToplam: number; kategoriler: MaterialCostLine[] }

export const getMaterialCost = async (no: string): Promise<MaterialCost> => {
  const res = await api.get<ApiResponse<MaterialCost>>(`/api/orders/${no}/material-cost`)
  return res.data.data
}

// ── Create / revise / clone ─────────────────────────────────────────────────

export const createQuote = (dto: CreateOrderDto) =>
  api.post<ApiResponse<string>>('/api/orders/quote', dto).then((r) => r.data.data)

export const createOrder = (dto: CreateOrderDto) =>
  api.post<ApiResponse<string>>('/api/orders/order', dto).then((r) => r.data.data)

export const reviseOrder = (eskiNo: string, dto: CreateOrderDto) =>
  api.post<ApiResponse<string>>(`/api/orders/${eskiNo}/revise`, dto).then((r) => r.data.data)

export const cloneOrder = (sourceNo: string) =>
  api.post<ApiResponse<string>>(`/api/orders/${sourceNo}/clone`).then((r) => r.data.data)

// ── Status transitions ──────────────────────────────────────────────────────

export const convertToOrder = (teklifNo: string) =>
  api.put(`/api/orders/${teklifNo}/convert-to-order`).then((r) => r.data)

export const submitForApproval = (no: string) =>
  api.post(`/api/orders/${no}/submit`).then((r) => r.data)

export const approveOrder = (no: string, aciklama?: string) =>
  api.post(`/api/orders/${no}/approve`, { aciklama }).then((r) => r.data)

export const rejectOrder = (no: string, aciklama: string) =>
  api.post(`/api/orders/${no}/reject`, { aciklama }).then((r) => r.data)

// ── Recipe expansion ────────────────────────────────────────────────────────

export const expandRecipe = (no: string, kategoriID: number, adet: number) =>
  api.post(`/api/orders/${no}/expand-recipe`, { kategoriID, adet }).then((r) => r.data)

// ── Attachments ─────────────────────────────────────────────────────────────

export const uploadAttachment = (no: string, type: 'ek' | 'muhasebeek', file: File) => {
  const fd = new FormData()
  fd.append('file', file)
  return api.post(`/api/orders/${no}/attachments?type=${type}`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data)
}

export const attachmentUrl = (no: string, type: 'ek' | 'muhasebeek') =>
  `/api/orders/${no}/attachments/${type}`

// ── Excel ───────────────────────────────────────────────────────────────────

export const excelUrl = (no: string) => `/api/orders/${no}/excel`

export const downloadExcel = async (no: string) => {
  const res = await api.get(`/api/orders/${no}/excel`, { responseType: 'blob' })
  const url = URL.createObjectURL(res.data as Blob)
  const a = document.createElement('a')
  a.href = url; a.download = `siparis_${no}.xlsx`; a.click()
  URL.revokeObjectURL(url)
}

// ── Catalog helpers ─────────────────────────────────────────────────────────

export const getCategories = () =>
  api.get<{ data: { kategoriID: number; kategoriAdi: string; fiyat: number | null }[] }>(
    '/api/orders/categories'
  ).then((r) => r.data.data)

export const getComponentsByCategory = (kategoriID: number) =>
  api.get<{ data: any[] }>(`/api/orders/categories/${kategoriID}/components`).then((r) => r.data.data)

export const getDeliveryAddresses = () =>
  api.get<{ data: any[] }>('/api/orders/delivery-addresses').then((r) => r.data.data)

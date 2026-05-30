import api from '@/lib/axios'
import type { AccountingOrderListDto, AccountingTransactionDto, ApiResponse } from '@/types'

// ── Lists ───────────────────────────────────────────────────────────────────

export const getAccountingOrders = async (): Promise<AccountingOrderListDto[]> => {
  const res = await api.get<ApiResponse<AccountingOrderListDto[]>>('/api/accounting/orders')
  return res.data.data
}

export const getAccountingOrderDetail = async (no: string): Promise<AccountingOrderListDto> => {
  const res = await api.get<ApiResponse<AccountingOrderListDto>>(`/api/accounting/orders/${no}`)
  return res.data.data
}

export const getTransactionsForOrder = async (no: string): Promise<AccountingTransactionDto[]> => {
  const res = await api.get<ApiResponse<AccountingTransactionDto[]>>(`/api/accounting/orders/${no}/transactions`)
  return res.data.data
}

export const getTransactions = async (): Promise<AccountingTransactionDto[]> => {
  const res = await api.get<ApiResponse<AccountingTransactionDto[]>>('/api/accounting/transactions')
  return res.data.data
}

// ── History (filtered + paged) ──────────────────────────────────────────────

export interface TransactionFilter {
  siparisNo?: string
  musteriAd?: string
  kullaniciID?: number
  baslangicTarih?: string
  bitisTarih?: string
  page?: number
  pageSize?: number
}

export interface TransactionListItem {
  id: number
  siparisNo: string
  musteriID: number
  musteriAd?: string
  kullaniciID: number
  kullanici?: string
  paraTipi?: string
  odenenMiktar: number | null
  tarih: string
}

export interface TransactionPage {
  items: TransactionListItem[]
  totalCount: number
  page: number
  pageSize: number
}

export const getTransactionHistory = async (filter: TransactionFilter = {}): Promise<TransactionPage> => {
  const res = await api.get<ApiResponse<TransactionPage>>('/api/accounting/transactions/history', { params: filter })
  return res.data.data
}

// ── Customer balance ────────────────────────────────────────────────────────

export interface CurrencyBalanceLine {
  paraTipi: string
  toplam: number
  odenen: number
  kalan: number
}

export interface CustomerBalance {
  musteriID: number
  musteriAd: string
  lines: CurrencyBalanceLine[]
}

export const getCustomerBalance = async (musteriId: number): Promise<CustomerBalance> => {
  const res = await api.get<ApiResponse<CustomerBalance>>(`/api/accounting/customers/${musteriId}/balance`)
  return res.data.data
}

// ── Mutations ───────────────────────────────────────────────────────────────

export interface AddTransactionRequest {
  siparisNo: string
  odenenMiktar: number
  tarih?: string
}

export const addTransaction = async (dto: AddTransactionRequest): Promise<AccountingTransactionDto> => {
  const res = await api.post<ApiResponse<AccountingTransactionDto>>('/api/accounting/transactions', dto)
  return res.data.data
}

export const downloadAccountingExcel = async (filter: TransactionFilter = {}) => {
  const res = await api.get('/api/accounting/excel', { params: filter, responseType: 'blob' })
  const url = URL.createObjectURL(res.data as Blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'muhasebe.xlsx'; a.click()
  URL.revokeObjectURL(url)
}

export const uploadMuhasebeEk = async (siparisNo: string, file: File) => {
  const fd = new FormData()
  fd.append('file', file)
  return api.post(`/api/accounting/orders/${siparisNo}/muhasebe-ek`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data)
}

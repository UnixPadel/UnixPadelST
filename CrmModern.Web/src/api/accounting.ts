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
  // PROMPT.md ACCOUNTING #15 — legacy MuhasebeGecmis.cs filter strip parity.
  mUlke?: string
  odenenMiktar?: number
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
  // PROMPT-v2 §10.1: SiparisNo başına 1-based; 0 = sahipsiz (SiparisNo boş).
  installmentIndex: number
}

export interface TransactionPage {
  items: TransactionListItem[]
  totalCount: number
  page: number
  pageSize: number
  // Sum of OdenenMiktar per ParaTipi over the FULL filtered set (not the
  // current page). Keys: "Euro" | "Dolar" | "TL" | "Sterlin".
  currencyTotals: Record<string, number>
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
  // PROMPT.md ACCOUNTING #7: Muhasebe Geçmiş Excel export was broken.
  // Three issues fixed below:
  //   1) `page` / `pageSize` from the list-view filter leaked into the excel
  //      endpoint, which the server uses to slice rows — strip them so the
  //      export always covers the full filtered result.
  //   2) Some browsers (Safari, certain Chromium versions) require the
  //      anchor to be attached to the DOM before `.click()` fires.
  //   3) Anchor and URL cleanup deferred so the download has time to start.
  const { page: _p, pageSize: _ps, ...exportFilter } = filter
  const res = await api.get('/api/accounting/excel', {
    params: exportFilter,
    responseType: 'blob',
  })
  const blob = new Blob([res.data as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `muhasebe_${new Date().toISOString().slice(0, 10)}.xlsx`
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 0)
}

// ── PROMPT.md ACCOUNTING #14 ────────────────────────────────────────────────

export interface SubmitMaliyetRequest {
  maliyet: number
  maliyetDetayi?: string
  toplamSiparis?: number
  kaporaBakiyesi?: number
  kalanBakiyeTalep?: number
  pesinYuzde?: number
}

/** Muhasebe ekranı "Talep Gönder" — Muhasebe-tipi SatinAlmaTalep upsert. */
export const submitMaliyetTalep = (siparisNo: string, dto: SubmitMaliyetRequest) =>
  api.post(`/api/accounting/orders/${siparisNo}/maliyet`, dto).then((r) => r.data)

/** Muhasebe ekranı "Muhasebe Onayla" — Siparis → Planlama transition. */
export const approveMuhasebeAndMoveToPlanning = (siparisNo: string) =>
  api.put(`/api/accounting/orders/${siparisNo}/approve-and-move-to-planning`)
    .then((r) => r.data)

export const uploadMuhasebeEk = async (siparisNo: string, file: File) => {
  const fd = new FormData()
  fd.append('file', file)
  return api.post(`/api/accounting/orders/${siparisNo}/muhasebe-ek`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data)
}

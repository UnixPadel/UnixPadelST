import axios from '@/lib/axios'
import i18n from '@/i18n/i18n'
import type {
  ApiResponse, DashboardKpi, OrderTrendPoint,
  StageDistribution, TopCustomer, CurrencyDistribution, RepPerformance, RepDetail,
} from '@/types'

// §18 — proforma dili canlı UI dilinden türetilir (export = görünen dil).
const proformaLang = (): 'tr' | 'en' =>
  (i18n.language || localStorage.getItem('i18nextLng') || 'tr').toLowerCase().startsWith('en') ? 'en' : 'tr'

// ─── Faz 7 Dashboard ────────────────────────────────────────────────────────

export async function getDashboardKpis(): Promise<DashboardKpi> {
  const res = await axios.get<ApiResponse<DashboardKpi>>('/api/reporting/dashboard/kpis')
  return res.data.data
}

export async function getOrdersByMonth(months = 12): Promise<OrderTrendPoint[]> {
  const res = await axios.get<ApiResponse<OrderTrendPoint[]>>(
    '/api/reporting/dashboard/orders-by-month', { params: { months } })
  return res.data.data
}

export async function getOrdersByStage(): Promise<StageDistribution[]> {
  const res = await axios.get<ApiResponse<StageDistribution[]>>(
    '/api/reporting/dashboard/orders-by-stage')
  return res.data.data
}

export async function getTopCustomers(days = 90, limit = 10): Promise<TopCustomer[]> {
  const res = await axios.get<ApiResponse<TopCustomer[]>>(
    '/api/reporting/dashboard/top-customers', { params: { days, limit } })
  return res.data.data
}

export async function getCurrencyDistribution(days = 90): Promise<CurrencyDistribution[]> {
  const res = await axios.get<ApiResponse<CurrencyDistribution[]>>(
    '/api/reporting/dashboard/currency-distribution', { params: { days } })
  return res.data.data
}

// Round-8 §13 — Temsilci performans raporu (Yönetici-only). ISO tarih (yyyy-MM-dd).
export async function getRepPerformance(baslangic: string, bitis: string): Promise<RepPerformance[]> {
  const res = await axios.get<ApiResponse<RepPerformance[]>>(
    '/api/reporting/rep-performance', { params: { baslangic, bitis } })
  return res.data.data
}

// §19 — tek temsilci detay analizi
export async function getRepDetail(kullaniciID: number, baslangic: string, bitis: string): Promise<RepDetail> {
  const res = await axios.get<ApiResponse<RepDetail>>(
    `/api/reporting/rep-performance/${kullaniciID}/detail`, { params: { baslangic, bitis } })
  return res.data.data
}

// §19 — temsilci 5-sayfalık markalı Excel raporu (doğrudan indirir)
export async function exportRepReport(
  kullaniciID: number, baslangic: string, bitis: string, adSoyad: string,
): Promise<void> {
  const response = await axios.get(
    `/api/reporting/rep-performance/${kullaniciID}/export`,
    { params: { baslangic, bitis }, responseType: 'blob' })
  const url = URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href = url
  link.download = `temsilci_raporu_${adSoyad.replace(/\s+/g, '_') || kullaniciID}_${baslangic}.xlsx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ─── Excel exports (existing) ───────────────────────────────────────────────

export async function exportAccountingOrders(): Promise<void> {
  const response = await axios.get('/api/reporting/accounting/export', {
    responseType: 'blob',
  })
  const url = URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href = url
  link.download = `muhasebe_${new Date().toISOString().slice(0, 10)}.xlsx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export async function exportOrderProforma(siparisNo: string): Promise<void> {
  const response = await axios.get(`/api/reporting/orders/${siparisNo}/proforma`, {
    params: { lang: proformaLang() },
    responseType: 'blob',
  })
  const url = URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href = url
  link.download = `proforma_${siparisNo}.xlsx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

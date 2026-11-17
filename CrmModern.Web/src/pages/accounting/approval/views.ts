import type { AccountingOrderListDto } from '@/types'

/**
 * Muhasebe · Onaylar görünümleri: üç iş kuyruğu + "Tüm siparişler"in ödeme
 * durumu filtreleri (legacy hızlı filtre üçlüsü). Değerler Bekleyen İşler'in
 * `?view=…` bağlantısında kullanıldığı için değişmez.
 */
export type ViewId = 'cariQueue' | 'lojistikQueue' | 'tamamlanmaQueue' | 'hepsi' | 'beklenen' | 'onaylanan'

export const VIEWS: ViewId[] = ['cariQueue', 'lojistikQueue', 'tamamlanmaQueue', 'hepsi', 'beklenen', 'onaylanan']
export const QUEUE_VIEWS = ['cariQueue', 'lojistikQueue', 'tamamlanmaQueue'] as const
export type QueueView = (typeof QUEUE_VIEWS)[number]
export const ALL_VIEWS = ['hepsi', 'beklenen', 'onaylanan'] as const

export const isQueueView = (v: ViewId): v is QueueView => (QUEUE_VIEWS as readonly string[]).includes(v)

export function matchesView(o: AccountingOrderListDto, view: ViewId): boolean {
  switch (view) {
    // Kontrol='Onay' listede zaten garanti (GetAccountingOrdersAsync filtresi).
    case 'cariQueue':     return o.siparisMiTeklifMi === 'Siparis'
    case 'lojistikQueue': return o.siparisMiTeklifMi === 'Hazir' && o.lojistikOnay === 'Bekliyor'
    // Round-9 §19 — sevkiyat tamamlandı, muhasebe kapanışı bekliyor.
    case 'tamamlanmaQueue': return o.siparisMiTeklifMi === 'TamamlanmaBekliyor'
    case 'hepsi':         return o.siparisMiTeklifMi !== 'Teklif'
    case 'beklenen':      return o.odemeDurum === 'Beklemede' && o.siparisMiTeklifMi === 'Siparis'
    case 'onaylanan':     return o.odemeDurum === 'Ödendi' && o.siparisMiTeklifMi === 'Siparis'
  }
}

/** Seçili siparişte yapılabilecek tek iş (karar panelinin formu ve ana butonu buna göre). */
export type StepMode = 'cari' | 'lojistik' | 'kapanis' | 'ek' | 'none'

export function stepModeOf(o: AccountingOrderListDto | null): StepMode {
  if (!o) return 'none'
  if (matchesView(o, 'cariQueue')) return 'cari'
  if (matchesView(o, 'lojistikQueue')) return 'lojistik'
  if (matchesView(o, 'tamamlanmaQueue')) return 'kapanis'
  // Kuyruk dışı (Planlama, Üretim, Lojistik, Tamamlandı…): yalnız sonradan tahsilat eklenir.
  return ['Teklif', 'Iptal'].includes(o.siparisMiTeklifMi ?? '') ? 'none' : 'ek'
}

export interface PesinatForm { pesinat: number | null; pesinatTarihi: string }
export interface FinalizeForm extends PesinatForm { finalMaliyet: number | null; maliyetDetayi: string }

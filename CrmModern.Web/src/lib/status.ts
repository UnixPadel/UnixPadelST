// Round-8 §2.1 — Tek merkezi TR-enum → i18n-key eşlemesi.
// KRİTİK: DB her zaman Türkçe discriminator saklar (SiparisMiTeklifMi, Kontrol,
// OdemeDurum, SatınAlma Durum). Burada SADECE görünen etiket çevrilir; badge'e
// gelen / DB'ye giden değer Türkçe literal olarak kalır.
import type { TFunction } from 'i18next'

// SiparisMiTeklifMi (aşama)
const STAGE: Record<string, string> = {
  Teklif: 'quote',
  Siparis: 'order',
  Planlama: 'planning',
  Uretim: 'production',
  Hazir: 'ready',
  Lojistik: 'logistics',
  TamamlanmaBekliyor: 'pendingCompletion',
  Tamamlandi: 'completed',
  Iptal: 'cancelled',
}

// Kontrol
const KONTROL: Record<string, string> = {
  Kontrol: 'pendingControl',
  Onay: 'approved',
  Reddet: 'rejected',
}

// OdemeDurum
const ODEME: Record<string, string> = {
  'Ödendi': 'paid',
  'Beklemede': 'pending',
}

// Kullanıcı durumu (Aktif/Pasif) — common.* anahtarlarını yeniden kullanır
const AKTIF: Record<string, string> = {
  Aktif: 'active',
  Pasif: 'passive',
}

// Satın alma Durum
const PURCHASE: Record<string, string> = {
  'Bekliyor': 'waiting',
  'Onay Bekliyor': 'awaitingApproval',
  'Ön Onaylandı': 'preApproved',
  'Muhasebe Tamamlandı': 'accountingDone',
  'Onaylandı': 'approved',
  'Reddedildi': 'rejected',
}

/**
 * StatusBadge / inline aşama-durum hücreleri için. Değerin hangi enum'a ait
 * olduğunu otomatik çözer (değerler enum'lar arası benzersizdir). Bilinmeyen
 * değer olduğu gibi döner.
 */
export function statusLabel(t: TFunction, value?: string | null): string {
  if (value == null || value === '') return ''
  const v = String(value)
  if (v in STAGE) return t(`status.stage.${STAGE[v]}`)
  if (v in KONTROL) return t(`status.kontrol.${KONTROL[v]}`)
  if (v in ODEME) return t(`status.odeme.${ODEME[v]}`)
  if (v in AKTIF) return t(`common.${AKTIF[v]}`)
  return v
}

/** Yalnız aşama (SiparisMiTeklifMi) için açık çağrı. */
export function stageLabel(t: TFunction, value?: string | null): string {
  if (value == null || value === '') return ''
  const v = String(value)
  return v in STAGE ? t(`status.stage.${STAGE[v]}`) : v
}

/** Yalnız Kontrol için açık çağrı. */
export function kontrolLabel(t: TFunction, value?: string | null): string {
  if (value == null || value === '') return ''
  const v = String(value)
  return v in KONTROL ? t(`status.kontrol.${KONTROL[v]}`) : v
}

/** Satın alma Durum için. PurchaseStatusBadge ve inline hücreler kullanır. */
export function purchaseStatusLabel(t: TFunction, value?: string | null): string {
  if (value == null || value === '') return ''
  const v = String(value)
  return v in PURCHASE ? t(`status.purchase.${PURCHASE[v]}`) : v
}

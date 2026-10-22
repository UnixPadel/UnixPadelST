// Round-8 §2.1 — Tek merkezi TR-enum → i18n-key eşlemesi.
// KRİTİK: DB her zaman Türkçe discriminator saklar (SiparisMiTeklifMi, Kontrol,
// OdemeDurum, SatınAlma Durum). Burada SADECE görünen etiket çevrilir; badge'e
// gelen / DB'ye giden değer Türkçe literal olarak kalır.
//
// QW-2 — aynı kayıt artık rozet TONUNU da taşır. StatusBadge, LogisticsStatusBadge,
// OrderKontrolBadge ve PurchaseStatusBadge bu kaydı okuyan ince sarmalayıcılardır;
// renk kararı tek yerde verilir (önceden "Onay" bir yerde sarı, bir yerde yeşildi).
import type { TFunction } from 'i18next'

export type StatusTone = 'neutral' | 'info' | 'progress' | 'success' | 'warning' | 'danger'
export type StatusContext = 'stage' | 'kontrol' | 'odeme' | 'aktif' | 'purchase' | 'logistics'

interface StatusDef { key: string; tone: StatusTone }

// SiparisMiTeklifMi (aşama)
const STAGE: Record<string, StatusDef> = {
  Teklif:             { key: 'status.stage.quote',             tone: 'neutral' },
  Siparis:            { key: 'status.stage.order',             tone: 'info' },
  Planlama:           { key: 'status.stage.planning',          tone: 'info' },
  Uretim:             { key: 'status.stage.production',        tone: 'progress' },
  Hazir:              { key: 'status.stage.ready',             tone: 'success' },
  Lojistik:           { key: 'status.stage.logistics',         tone: 'info' },
  TamamlanmaBekliyor: { key: 'status.stage.pendingCompletion', tone: 'warning' },
  Tamamlandi:         { key: 'status.stage.completed',         tone: 'success' },
  Iptal:              { key: 'status.stage.cancelled',         tone: 'danger' },
}

// Kontrol
const KONTROL: Record<string, StatusDef> = {
  Kontrol: { key: 'status.kontrol.pendingControl', tone: 'warning' },
  Onay:    { key: 'status.kontrol.approved',       tone: 'success' },
  Reddet:  { key: 'status.kontrol.rejected',       tone: 'danger' },
}

// OdemeDurum
const ODEME: Record<string, StatusDef> = {
  'Ödendi':    { key: 'status.odeme.paid',    tone: 'success' },
  'Beklemede': { key: 'status.odeme.pending', tone: 'warning' },
}

// Kullanıcı durumu (Aktif/Pasif) — common.* anahtarlarını yeniden kullanır
const AKTIF: Record<string, StatusDef> = {
  Aktif: { key: 'common.active',  tone: 'success' },
  Pasif: { key: 'common.passive', tone: 'neutral' },
}

// Satın alma Durum — tonlar legacy WinForms hücre renkleriyle birebir
// (Onaylandı yeşil, Muhasebe/Ön mavi, Reddedildi kırmızı, diğer sarı).
const PURCHASE: Record<string, StatusDef> = {
  'Bekliyor':            { key: 'status.purchase.waiting',          tone: 'warning' },
  'Onay Bekliyor':       { key: 'status.purchase.awaitingApproval', tone: 'warning' },
  'Ön Onaylandı':        { key: 'status.purchase.preApproved',      tone: 'info' },
  'Muhasebe Tamamlandı': { key: 'status.purchase.accountingDone',   tone: 'info' },
  'Onaylandı':           { key: 'status.purchase.approved',         tone: 'success' },
  'Reddedildi':          { key: 'status.purchase.rejected',         tone: 'danger' },
}

// Lojistik bağlamı: sevk satırının durumu aşamadan türetilir (Paket 3 / §16).
const LOGISTICS: Record<string, StatusDef> = {
  Hazir:              { key: 'status.logistics.awaitingAccounting', tone: 'warning' },
  Lojistik:           { key: 'status.logistics.inTransit',          tone: 'info' },
  TamamlanmaBekliyor: { key: 'status.logistics.awaitingCompletion', tone: 'warning' },
  Tamamlandi:         { key: 'status.logistics.completed',          tone: 'success' },
}

const BY_CONTEXT: Record<StatusContext, Record<string, StatusDef>> = {
  stage: STAGE, kontrol: KONTROL, odeme: ODEME, aktif: AKTIF, purchase: PURCHASE, logistics: LOGISTICS,
}
// Otomatik çözümleme sırası (değerler bu enum'lar arasında benzersizdir).
const AUTO_ORDER: StatusContext[] = ['stage', 'kontrol', 'odeme', 'aktif', 'purchase']

function resolve(value: string, context?: StatusContext): StatusDef | undefined {
  if (context) return BY_CONTEXT[context][value]
  for (const c of AUTO_ORDER) {
    const d = BY_CONTEXT[c][value]
    if (d) return d
  }
  return undefined
}

/** Rozet tonu; bilinmeyen değer → neutral. */
export function statusTone(value?: string | null, context?: StatusContext): StatusTone {
  if (!value) return 'neutral'
  return resolve(String(value), context)?.tone ?? 'neutral'
}

/**
 * StatusBadge / inline aşama-durum hücreleri için. Değerin hangi enum'a ait
 * olduğunu otomatik çözer (değerler enum'lar arası benzersizdir). Bilinmeyen
 * değer olduğu gibi döner.
 */
export function statusLabel(t: TFunction, value?: string | null, context?: StatusContext): string {
  if (value == null || value === '') return ''
  const v = String(value)
  const d = resolve(v, context)
  return d ? t(d.key) : v
}

/** Yalnız aşama (SiparisMiTeklifMi) için açık çağrı. */
export function stageLabel(t: TFunction, value?: string | null): string {
  return statusLabel(t, value, 'stage')
}

/** Yalnız Kontrol için açık çağrı. */
export function kontrolLabel(t: TFunction, value?: string | null): string {
  return statusLabel(t, value, 'kontrol')
}

/** Satın alma Durum için. PurchaseStatusBadge ve inline hücreler kullanır. */
export function purchaseStatusLabel(t: TFunction, value?: string | null): string {
  return statusLabel(t, value, 'purchase')
}

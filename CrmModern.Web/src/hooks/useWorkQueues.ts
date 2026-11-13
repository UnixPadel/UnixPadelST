import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { visibleNavItems } from '@/lib/navigation'
import { isSuperAdmin } from '@/lib/permissions'
import { getPendingQC } from '@/api/qualityControl'
import { getAccountingOrders } from '@/api/accounting'
import { getFactoryOrders } from '@/api/factory'
import { getReadyForShipment, getLogisticsHistory } from '@/api/logistics'
import { getPendingFinal, getPendingPayment } from '@/api/purchase'
import { getMyOrders } from '@/api/orders'
import { useInboxSummary } from '@/hooks/useInboxSummary'

/**
 * E-10 — rol bazlı iş kuyrukları (Bekleyen İşler sayfası). Her kuyruk yalnız
 * kullanıcının ilgili ekrana erişimi varsa yüklenir (menü kuralıyla aynı).
 * Salt-okunur Gözlemci'ye iş kuyruğu atanmaz (Fabrika kuyrukları onun işi değil).
 * Query key'ler sabit: aynı veriyi kullanan ekranlar önbelleği paylaşır.
 */
export type QueueId =
  | 'qc' | 'cari' | 'lojistikOnay' | 'tamamlanma' | 'planning' | 'production'
  | 'shipment' | 'inTransit' | 'finalApproval' | 'payment' | 'rejected'

/** Sabit iş akışı sırası — Bekleyen İşler ve Ana Sayfa paneli aynı sırayı kullanır. */
export const QUEUE_ORDER: QueueId[] = [
  'qc', 'cari', 'lojistikOnay', 'tamamlanma', 'planning', 'production',
  'shipment', 'inTransit', 'finalApproval', 'payment', 'rejected',
]

/** Kuyruğun iş ekranı (kuyruk filtrelenmiş açılır). */
export const QUEUE_PATH: Record<QueueId, string> = {
  qc: '/quality-control',
  cari: '/accounting/approval?view=cariQueue',
  lojistikOnay: '/accounting/approval?view=lojistikQueue',
  tamamlanma: '/accounting/approval?view=tamamlanmaQueue',
  planning: '/factory',
  production: '/factory',
  shipment: '/logistics/ready',
  inTransit: '/logistics/history',
  finalApproval: '/approval/final',
  payment: '/approval/payment',
  rejected: '/orders/mine',
}

export interface InboxItem {
  key: string
  no: string
  title: string
  subtitle?: string
  since?: string | null
  status?: { value: string; context?: 'stage' | 'kontrol' | 'purchase' | 'logistics' }
  actionPath: string
  orderNo?: string
}

export interface WorkQueue {
  id: QueueId
  titleKey: string
  hintKey: string
  items: InboxItem[]
  loading: boolean
  /** Sorgu hatası — "bekleyen iş yok" ile karıştırılmasın. */
  error: boolean
  path: string
  refetch: () => void
}

/** Kullanıcının sahip olduğu kuyruk kimlikleri (veri yüklemeden; backend özetiyle aynı kural). */
export function useQueueAccess() {
  const { getUser } = useAuth()
  const user = getUser()
  return useMemo(() => {
    const paths = new Set(visibleNavItems(user).map((n) => n.path))
    const can = (p: string) => paths.has(p)
    const observer = user?.yetkiTuru === 'Gozlemci'
    const isApprover = !!user && (user.kullaniciAdi === 'burcu.karaman' || user.kullaniciAdi === 'elshan.rasulov' || isSuperAdmin(user))
    const has: Record<QueueId, boolean> = {
      qc: can('/quality-control'),
      cari: isApprover && can('/accounting/approval'),
      lojistikOnay: isApprover && can('/accounting/approval'),
      tamamlanma: isApprover && can('/accounting/approval'),
      planning: can('/factory') && !observer,
      production: can('/factory') && !observer,
      shipment: can('/logistics/ready'),
      inTransit: can('/logistics/history') && !observer,
      finalApproval: can('/approval/final'),
      payment: can('/approval/payment'),
      rejected: user?.yetkiTuru === 'Temsilci',
    }
    return { has, ids: QUEUE_ORDER.filter((id) => has[id]) }
  }, [user])
}

export function useWorkQueues() {
  const { has } = useQueueAccess()
  const common = { refetchInterval: 60_000, retry: false } as const

  const qcQ = useQuery({ queryKey: ['quality-control', 'inbox'], queryFn: getPendingQC, enabled: has.qc, ...common })
  const accQ = useQuery({ queryKey: ['accounting-orders', 'inbox'], queryFn: getAccountingOrders, enabled: has.cari, ...common })
  const facQ = useQuery({ queryKey: ['factory', 'inbox'], queryFn: () => getFactoryOrders({}), enabled: has.planning, ...common })
  const readyQ = useQuery({ queryKey: ['logistics-ready', 'inbox'], queryFn: getReadyForShipment, enabled: has.shipment, ...common })
  const histQ = useQuery({ queryKey: ['logistics-history', 'inbox'], queryFn: () => getLogisticsHistory(), enabled: has.inTransit, ...common })
  const finalQ = useQuery({ queryKey: ['final-pending', 'inbox'], queryFn: getPendingFinal, enabled: has.finalApproval, ...common })
  const payQ = useQuery({ queryKey: ['payment-pending', 'inbox'], queryFn: getPendingPayment, enabled: has.payment, ...common })
  const mineQ = useQuery({ queryKey: ['my-orders', 'inbox'], queryFn: () => getMyOrders(), enabled: has.rejected, ...common })

  const queues: WorkQueue[] = []
  const push = (id: QueueId, q: { isLoading: boolean; isError: boolean; refetch: () => unknown }, items: InboxItem[]) =>
    queues.push({
      id, titleKey: `inbox.queues.${id}`, hintKey: `inbox.hints.${id}`, path: QUEUE_PATH[id],
      items, loading: q.isLoading, error: q.isError, refetch: () => { void q.refetch() },
    })

  if (has.qc) {
    push('qc', qcQ, (qcQ.data ?? []).filter((r) => r.kontrol === 'Kontrol').map((r) => ({
      key: `qc-${r.siparisNo}`, no: r.siparisNo, title: r.musteriAd, subtitle: r.mUlke, since: r.tarih,
      status: { value: r.siparisMiTeklifMi, context: 'stage' }, actionPath: `/quality-control?sel=${encodeURIComponent(r.siparisNo)}`, orderNo: r.siparisNo,
    })))
  }
  if (has.cari) {
    const rows = accQ.data ?? []
    const mk = (id: QueueId, filter: (o: typeof rows[number]) => boolean, view: string) =>
      push(id, accQ, rows.filter(filter).map((o) => ({
        key: `${id}-${o.siparisNo}`, no: o.siparisNo, title: o.musteriAd, subtitle: o.mUlke, since: o.tarih,
        status: { value: o.siparisMiTeklifMi, context: 'stage' as const },
        actionPath: `/accounting/approval?view=${view}&sel=${encodeURIComponent(o.siparisNo)}`, orderNo: o.siparisNo,
      })))
    mk('cari', (o) => o.siparisMiTeklifMi === 'Siparis', 'cariQueue')
    mk('lojistikOnay', (o) => o.siparisMiTeklifMi === 'Hazir' && o.lojistikOnay === 'Bekliyor', 'lojistikQueue')
    mk('tamamlanma', (o) => o.siparisMiTeklifMi === 'TamamlanmaBekliyor', 'tamamlanmaQueue')
  }
  if (has.planning) {
    const rows = facQ.data ?? []
    push('planning', facQ, rows.filter((r) => r.siparisMiTeklifMi === 'Planlama').map((r) => ({
      key: `pl-${r.siparisNo}`, no: r.siparisNo, title: r.musteriAd, subtitle: r.kullanici, since: r.cariOnayTarih ?? r.tarih,
      status: { value: r.siparisMiTeklifMi, context: 'stage' }, actionPath: `/factory?sel=${encodeURIComponent(r.siparisNo)}`, orderNo: r.siparisNo,
    })))
    push('production', facQ, rows.filter((r) => r.siparisMiTeklifMi === 'Uretim').map((r) => ({
      key: `pr-${r.siparisNo}`, no: r.siparisNo, title: r.musteriAd, subtitle: r.kullanici, since: r.sTarih,
      status: { value: r.siparisMiTeklifMi, context: 'stage' }, actionPath: `/factory?sel=${encodeURIComponent(r.siparisNo)}`, orderNo: r.siparisNo,
    })))
  }
  if (has.shipment) {
    push('shipment', readyQ, (readyQ.data ?? []).filter((r) => r.siparisMiTeklifMi === 'Hazir').map((r) => ({
      key: `sh-${r.siparisNo}`, no: r.siparisNo, title: r.musteriAd, subtitle: r.mUlke, since: r.sTarih ?? r.tarih,
      status: { value: r.siparisMiTeklifMi, context: 'stage' }, actionPath: `/logistics/ready?sel=${encodeURIComponent(r.siparisNo)}`, orderNo: r.siparisNo,
    })))
  }
  if (has.inTransit) {
    push('inTransit', histQ, (histQ.data ?? []).filter((r) => r.siparisMiTeklifMi === 'Lojistik').map((r) => ({
      key: `tr-${r.id}`, no: r.siparisNo, title: r.firmaAdi, subtitle: r.lojistikCesit, since: null,
      status: { value: 'Lojistik', context: 'logistics' }, actionPath: `/logistics/history?f.siparisNo=${encodeURIComponent(r.siparisNo)}`, orderNo: r.siparisNo,
    })))
  }
  if (has.finalApproval) {
    push('finalApproval', finalQ, (finalQ.data ?? []).map((r) => ({
      key: `fa-${r.talepID}`, no: `#${r.talepID}`, title: r.urunAdi, subtitle: r.talepEdenKullaniciAdi, since: r.talepTarihi,
      status: { value: r.durum, context: 'purchase' }, actionPath: `/approval/final?sel=${r.talepID}`,
    })))
  }
  if (has.payment) {
    push('payment', payQ, (payQ.data ?? []).map((r) => ({
      key: `pd-${r.talepID}`, no: `#${r.talepID}`, title: r.urunAdi, subtitle: r.talepEdenKullaniciAdi, since: r.talepTarihi,
      status: { value: r.durum, context: 'purchase' }, actionPath: `/approval/payment?sel=${r.talepID}`,
    })))
  }
  if (has.rejected) {
    push('rejected', mineQ, (mineQ.data ?? []).filter((o) => o.kontrol === 'Reddet' && !o.silindi).map((o) => ({
      key: `rj-${o.siparisAlID}`, no: o.siparisNo || o.teklifNo, title: o.musteriAd, subtitle: o.mUlke, since: o.tarih,
      status: { value: o.kontrol, context: 'kontrol' }, actionPath: `/orders/new?revise=${encodeURIComponent(o.siparisNo || o.teklifNo)}`, orderNo: o.siparisNo || o.teklifNo,
    })))
  }

  const total = queues.reduce((a, q) => a + q.items.length, 0)
  const anyLoading = queues.some((q) => q.loading)
  const anyError = queues.some((q) => q.error)
  const refetchAll = () => [qcQ, accQ, facQ, readyQ, histQ, finalQ, payQ, mineQ].forEach((q) => { if (q.isFetched || q.isError) void q.refetch() })

  return { queues, total, anyLoading, anyError, refetchAll }
}

/**
 * Ana Sayfa paneli için kuyruk özeti (GET /api/inbox/summary — tek istek; menü
 * rozetiyle aynı önbellek). `ids` — kullanıcının kuyrukları, veri gelmeden
 * bilinir (iskelet satır sayısı, panelin çizilip çizilmeyeceği). Sunucu aynı
 * kuralı `InboxQueues.For` ile uygular.
 */
export function useWorkQueueSummary() {
  const { ids } = useQueueAccess()
  const q = useInboxSummary(ids.length > 0)
  const rows = (q.data?.queues ?? []).map((s) => ({ id: s.queueId, count: s.count, oldestSince: s.oldestSince, error: s.error }))
  return {
    ids,
    rows,
    total: q.data?.total ?? 0,
    loading: q.isLoading,
    /** İstek tamamen başarısız (panel tek hata satırı çizer). */
    failed: q.isError,
    /** En az bir kuyruk sayılamadı — toplam "en az N" olarak okunur. */
    anyError: q.isError || rows.some((r) => r.error),
    refetch: () => { void q.refetch() },
  }
}

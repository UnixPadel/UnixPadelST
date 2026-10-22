import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Eye, Inbox, RefreshCw } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/StatusBadge'
import { AgeChip } from '@/components/AgeChip'
import { useAuth } from '@/hooks/useAuth'
import { visibleNavItems } from '@/lib/navigation'
import { isSuperAdmin } from '@/lib/permissions'
import { getPendingQC } from '@/api/qualityControl'
import { getAccountingOrders } from '@/api/accounting'
import { getFactoryOrders } from '@/api/factory'
import { getReadyForShipment, getLogisticsHistory } from '@/api/logistics'
import { getPendingFinal, getPendingPayment } from '@/api/purchase'
import { getMyOrders } from '@/api/orders'

/**
 * E-10 — Fiori "My Inbox" / Worklist: role göre birleşik Bekleyen İşler. Her kuyruk
 * yalnız kullanıcının ilgili ekrana erişimi varsa yüklenir (menü kuralıyla aynı).
 * Her kalemde yaş ("3 gün", AgeChip) — eşik aşılınca uyarı tonu — ve satır içi birincil
 * aksiyon: ilgili ekranı o kayıt seçili olarak açar (?sel=NO) ya da detayı
 * (Belge Akışı dahil) bulunduğu yerde gösterir (?order=NO).
 */
interface InboxItem {
  key: string
  no: string
  title: string
  subtitle?: string
  since?: string | null
  status?: { value: string; context?: 'stage' | 'kontrol' | 'purchase' | 'logistics' }
  actionPath: string
  orderNo?: string
}

interface Queue {
  id: string
  titleKey: string
  hintKey: string
  items: InboxItem[]
  loading: boolean
  /** Sorgu hatası — "bekleyen iş yok" ile karıştırılmasın. */
  error?: boolean
  path: string
}

export function WorkInboxPage() {
  const { t } = useTranslation()
  const { getUser } = useAuth()
  const user = getUser()
  const [, setParams] = useSearchParams()
  const paths = useMemo(() => new Set(visibleNavItems(user).map((n) => n.path)), [user])
  const can = (p: string) => paths.has(p)
  const isApprover = !!user && (user.kullaniciAdi === 'burcu.karaman' || user.kullaniciAdi === 'elshan.rasulov' || isSuperAdmin(user))
  const isTemsilci = user?.yetkiTuru === 'Temsilci'
  const common = { refetchInterval: 60_000, retry: false } as const

  const qcQ = useQuery({ queryKey: ['quality-control', 'inbox'], queryFn: getPendingQC, enabled: can('/quality-control'), ...common })
  const accQ = useQuery({ queryKey: ['accounting-orders', 'inbox'], queryFn: getAccountingOrders, enabled: isApprover && can('/accounting/approval'), ...common })
  const facQ = useQuery({ queryKey: ['factory', 'inbox'], queryFn: () => getFactoryOrders({}), enabled: can('/factory'), ...common })
  const readyQ = useQuery({ queryKey: ['logistics-ready', 'inbox'], queryFn: getReadyForShipment, enabled: can('/logistics/ready'), ...common })
  const histQ = useQuery({ queryKey: ['logistics-history', 'inbox'], queryFn: () => getLogisticsHistory(), enabled: can('/logistics/history') && user?.yetkiTuru !== 'Gozlemci', ...common })
  const finalQ = useQuery({ queryKey: ['final-pending', 'inbox'], queryFn: getPendingFinal, enabled: can('/approval/final'), ...common })
  const payQ = useQuery({ queryKey: ['payment-pending', 'inbox'], queryFn: getPendingPayment, enabled: can('/approval/payment'), ...common })
  const mineQ = useQuery({ queryKey: ['my-orders', 'inbox'], queryFn: () => getMyOrders(), enabled: isTemsilci, ...common })

  const queues: Queue[] = []
  if (can('/quality-control')) {
    queues.push({
      id: 'qc', titleKey: 'inbox.queues.qc', hintKey: 'inbox.hints.qc', path: '/quality-control', loading: qcQ.isLoading, error: qcQ.isError,
      items: (qcQ.data ?? []).filter((r) => r.kontrol === 'Kontrol').map((r) => ({
        key: `qc-${r.siparisNo}`, no: r.siparisNo, title: r.musteriAd, subtitle: r.mUlke, since: r.tarih,
        status: { value: r.siparisMiTeklifMi, context: 'stage' }, actionPath: `/quality-control?sel=${encodeURIComponent(r.siparisNo)}`, orderNo: r.siparisNo,
      })),
    })
  }
  if (isApprover && can('/accounting/approval')) {
    const rows = accQ.data ?? []
    const mk = (id: string, filter: (o: typeof rows[number]) => boolean, view: string) => ({
      id, titleKey: `inbox.queues.${id}`, hintKey: `inbox.hints.${id}`, path: '/accounting/approval', loading: accQ.isLoading, error: accQ.isError,
      items: rows.filter(filter).map((o) => ({
        key: `${id}-${o.siparisNo}`, no: o.siparisNo, title: o.musteriAd, subtitle: o.mUlke, since: o.tarih,
        status: { value: o.siparisMiTeklifMi, context: 'stage' as const },
        actionPath: `/accounting/approval?view=${view}&sel=${encodeURIComponent(o.siparisNo)}`, orderNo: o.siparisNo,
      })),
    })
    queues.push(mk('cari', (o) => o.siparisMiTeklifMi === 'Siparis', 'cariQueue'))
    queues.push(mk('lojistikOnay', (o) => o.siparisMiTeklifMi === 'Hazir' && o.lojistikOnay === 'Bekliyor', 'lojistikQueue'))
    queues.push(mk('tamamlanma', (o) => o.siparisMiTeklifMi === 'TamamlanmaBekliyor', 'tamamlanmaQueue'))
  }
  if (can('/factory')) {
    const rows = facQ.data ?? []
    queues.push({
      id: 'planning', titleKey: 'inbox.queues.planning', hintKey: 'inbox.hints.planning', path: '/factory', loading: facQ.isLoading, error: facQ.isError,
      items: rows.filter((r) => r.siparisMiTeklifMi === 'Planlama').map((r) => ({
        key: `pl-${r.siparisNo}`, no: r.siparisNo, title: r.musteriAd, subtitle: r.kullanici, since: r.cariOnayTarih ?? r.tarih,
        status: { value: r.siparisMiTeklifMi, context: 'stage' }, actionPath: `/factory?sel=${encodeURIComponent(r.siparisNo)}`, orderNo: r.siparisNo,
      })),
    })
    queues.push({
      id: 'production', titleKey: 'inbox.queues.production', hintKey: 'inbox.hints.production', path: '/factory', loading: facQ.isLoading, error: facQ.isError,
      items: rows.filter((r) => r.siparisMiTeklifMi === 'Uretim').map((r) => ({
        key: `pr-${r.siparisNo}`, no: r.siparisNo, title: r.musteriAd, subtitle: r.kullanici, since: r.sTarih,
        status: { value: r.siparisMiTeklifMi, context: 'stage' }, actionPath: `/factory?sel=${encodeURIComponent(r.siparisNo)}`, orderNo: r.siparisNo,
      })),
    })
  }
  if (can('/logistics/ready')) {
    queues.push({
      id: 'shipment', titleKey: 'inbox.queues.shipment', hintKey: 'inbox.hints.shipment', path: '/logistics/ready', loading: readyQ.isLoading, error: readyQ.isError,
      items: (readyQ.data ?? []).filter((r) => r.siparisMiTeklifMi === 'Hazir').map((r) => ({
        key: `sh-${r.siparisNo}`, no: r.siparisNo, title: r.musteriAd, subtitle: r.mUlke, since: r.sTarih ?? r.tarih,
        status: { value: r.siparisMiTeklifMi, context: 'stage' }, actionPath: `/logistics/ready?sel=${encodeURIComponent(r.siparisNo)}`, orderNo: r.siparisNo,
      })),
    })
  }
  if (can('/logistics/history') && user?.yetkiTuru !== 'Gozlemci') {
    queues.push({
      id: 'inTransit', titleKey: 'inbox.queues.inTransit', hintKey: 'inbox.hints.inTransit', path: '/logistics/history', loading: histQ.isLoading, error: histQ.isError,
      items: (histQ.data ?? []).filter((r) => r.siparisMiTeklifMi === 'Lojistik').map((r) => ({
        key: `tr-${r.id}`, no: r.siparisNo, title: r.firmaAdi, subtitle: r.lojistikCesit, since: null,
        status: { value: 'Lojistik', context: 'logistics' }, actionPath: `/logistics/history?f.siparisNo=${encodeURIComponent(r.siparisNo)}`, orderNo: r.siparisNo,
      })),
    })
  }
  if (can('/approval/final')) {
    queues.push({
      id: 'finalApproval', titleKey: 'inbox.queues.finalApproval', hintKey: 'inbox.hints.finalApproval', path: '/approval/final', loading: finalQ.isLoading, error: finalQ.isError,
      items: (finalQ.data ?? []).map((r) => ({
        key: `fa-${r.talepID}`, no: `#${r.talepID}`, title: r.urunAdi, subtitle: r.talepEdenKullaniciAdi, since: r.talepTarihi,
        status: { value: r.durum, context: 'purchase' }, actionPath: `/approval/final?sel=${r.talepID}`,
      })),
    })
  }
  if (can('/approval/payment')) {
    queues.push({
      id: 'payment', titleKey: 'inbox.queues.payment', hintKey: 'inbox.hints.payment', path: '/approval/payment', loading: payQ.isLoading, error: payQ.isError,
      items: (payQ.data ?? []).map((r) => ({
        key: `pd-${r.talepID}`, no: `#${r.talepID}`, title: r.urunAdi, subtitle: r.talepEdenKullaniciAdi, since: r.talepTarihi,
        status: { value: r.durum, context: 'purchase' }, actionPath: `/approval/payment?sel=${r.talepID}`,
      })),
    })
  }
  if (isTemsilci) {
    queues.push({
      id: 'rejected', titleKey: 'inbox.queues.rejected', hintKey: 'inbox.hints.rejected', path: '/orders/mine', loading: mineQ.isLoading, error: mineQ.isError,
      items: (mineQ.data ?? []).filter((o) => o.kontrol === 'Reddet' && !o.silindi).map((o) => ({
        key: `rj-${o.siparisAlID}`, no: o.siparisNo || o.teklifNo, title: o.musteriAd, subtitle: o.mUlke, since: o.tarih,
        status: { value: o.kontrol, context: 'kontrol' }, actionPath: `/orders/new?revise=${encodeURIComponent(o.siparisNo || o.teklifNo)}`, orderNo: o.siparisNo || o.teklifNo,
      })),
    })
  }

  const total = queues.reduce((a, q) => a + q.items.length, 0)
  const anyLoading = queues.some((q) => q.loading || q.error)
  const refetchAll = () => [qcQ, accQ, facQ, readyQ, histQ, finalQ, payQ, mineQ].forEach((q) => { if (q.isFetched || q.isError) void q.refetch() })

  return (
    <div>
      <PageHeader
        title={t('inbox.title')}
        description={t('inbox.description')}
        meta={!anyLoading ? <Badge variant={total ? 'warning' : 'success'}>{t('inbox.total', { count: total })}</Badge> : undefined}
        actions={<Button size="sm" variant="outline" onClick={refetchAll}><RefreshCw className="h-4 w-4" /> {t('common.refresh')}</Button>}
      />
      <div className="grid gap-4 p-4 lg:p-6 xl:grid-cols-2">
        {queues.length === 0 && (
          <div className="col-span-full flex flex-col items-center gap-2 py-16 text-muted-foreground">
            <Inbox className="h-10 w-10 opacity-40" />
            <p>{t('inbox.noQueues')}</p>
          </div>
        )}
        {queues.map((q) => (
          <section key={q.id} className="flex flex-col rounded-md border bg-card" aria-labelledby={`q-${q.id}`}>
            <header className="flex items-center gap-2 border-b px-3 py-2">
              <h2 id={`q-${q.id}`} className="text-sm font-semibold">{t(q.titleKey)}</h2>
              {!q.loading && !q.error && <Badge variant={q.items.length ? 'warning' : 'neutral'}>{q.items.length}</Badge>}
              <Link to={q.path} className="ml-auto text-xs text-primary hover:underline">{t('inbox.openScreen')}</Link>
            </header>
            <p className="px-3 pt-2 text-xs text-muted-foreground">{t(q.hintKey)}</p>
            <ul className="max-h-80 divide-y overflow-y-auto p-1">
              {q.loading && Array.from({ length: 3 }).map((_, i) => (
                <li key={i} className="px-2 py-2"><div className="h-4 animate-pulse rounded bg-muted" /></li>
              ))}
              {!q.loading && q.error && (
                <li className="px-2 py-4 text-center text-xs text-destructive">{t('inbox.loadError')}</li>
              )}
              {!q.loading && !q.error && q.items.length === 0 && (
                <li className="px-2 py-4 text-center text-xs text-muted-foreground">{t('inbox.empty')}</li>
              )}
              {q.items.map((it) => (
                <li key={it.key} className="flex items-center gap-2 px-2 py-1.5 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">{it.no}</span>
                      {it.status && <StatusBadge value={it.status.value} context={it.status.context} />}
                    </div>
                    <p className="truncate">{it.title}{it.subtitle ? <span className="text-muted-foreground"> · {it.subtitle}</span> : null}</p>
                  </div>
                  <AgeChip since={it.since} />
                  {it.orderNo && (
                    <Button size="icon-sm" variant="ghost" aria-label={t('common.details')}
                      onClick={() => setParams((p) => { const np = new URLSearchParams(p); np.set('order', it.orderNo!); return np })}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  <Button size="xs" asChild>
                    <Link to={it.actionPath}>{t('inbox.process')} <ArrowRight className="h-3.5 w-3.5" /></Link>
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}

import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { Link } from 'react-router-dom'
import { FileText, ShieldCheck, Wallet, Factory, Truck, CheckCircle2, XCircle } from 'lucide-react'
import { getApprovals } from '@/api/orders'
import { getTransactionsForOrder } from '@/api/accounting'
import { getOffers } from '@/api/logisticsOffers'
import { getOrderStep } from '@/api/workflow'
import { departmentLabelKey, stepLabelKey } from '@/lib/workflow'
import { AgeChip } from '@/components/AgeChip'
import { formatDate } from '@/lib/utils'
import { formatMoney } from '@/lib/currency'
import { stageLabel, statusTone, type StatusTone } from '@/lib/status'
import { useAuth } from '@/hooks/useAuth'
import { hideMoneyFor } from '@/lib/visibility'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { OrderDetail } from '@/types'

/**
 * E-8 — "Sipariş Geçmişi" sekmesi (SAP "Belge Akışı" / LOGO "bağlantılı belgeler" esinli): siparişin tüm hayatı tek
 * dikey akışta. Veri mevcut uçlardan birleştirilir (yeni backend gerekmez):
 *   getOrderDetail (Teklif/Sipariş, kontrol, fabrika tarihleri, aşama)
 *   getApprovals (onay geçmişi) · getTransactionsForOrder (tahsilatlar, iptaller dahil)
 *   getOffers (lojistik teklifleri — yalnız yetkili rollerde; 403 sessizce boş)
 * Her düğüm: ikon, etiket+ton, tarih, kullanıcı, kısa açıklama ve ilgili ekrana link.
 */
export function approvalTone(durum?: string | null): StatusTone {
  if (durum === 'Onaylandi' || durum === 'Onaylandı') return 'success'
  if (durum === 'Reddedildi') return 'danger'
  return 'warning'
}
export function approvalLabel(t: TFunction, durum?: string | null): string {
  if (durum === 'Onaylandi' || durum === 'Onaylandı') return t('docFlow.approval.approved')
  if (durum === 'Reddedildi') return t('docFlow.approval.rejected')
  return durum ? t('docFlow.approval.pending') : '—'
}

interface FlowNode {
  key: string
  at?: string | null
  icon: React.ReactNode
  title: string
  tone: StatusTone
  meta?: string | null
  body?: React.ReactNode
  link?: string
  done: boolean
}

const STAGE_ORDER = ['Teklif', 'Siparis', 'Planlama', 'Uretim', 'Hazir', 'Lojistik', 'TamamlanmaBekliyor', 'Tamamlandi']

export function DocumentFlow({ order }: { order: OrderDetail }) {
  const { t } = useTranslation()
  const { getUser } = useAuth()
  const hideMoney = hideMoneyFor(getUser())
  const no = order.siparisNo

  const { data: approvals = [] } = useQuery({
    queryKey: ['approvals', no], queryFn: () => getApprovals(no), enabled: !!no,
  })
  const { data: txs = [] } = useQuery({
    queryKey: ['order-tx', no, 'flow'], queryFn: () => getTransactionsForOrder(no, true),
    enabled: !!no && !hideMoney, retry: false,
  })
  const { data: offers = [] } = useQuery({
    queryKey: ['logistics-offers', no, 'flow'], queryFn: () => getOffers(no),
    enabled: !!no, retry: false,
  })
  // İç denetim — siparişin şu an beklediği adım (tek tanım: backend OrderWorkflow).
  const { data: step } = useQuery({
    queryKey: ['workflow-step', no], queryFn: () => getOrderStep(no),
    enabled: !!no, retry: false,
  })

  const stageIdx = STAGE_ORDER.indexOf(order.siparisMiTeklifMi)
  const reached = (s: string) => stageIdx >= STAGE_ORDER.indexOf(s)

  const nodes: FlowNode[] = []
  nodes.push({
    key: 'doc',
    at: order.tarih,
    icon: <FileText className="h-3.5 w-3.5" />,
    title: order.teklifNo && order.siparisMiTeklifMi === 'Teklif'
      ? t('docFlow.quoteCreated', { no: order.teklifNo })
      : t('docFlow.orderCreated', { no: order.siparisNo || order.teklifNo }),
    tone: 'info',
    meta: order.kullaniciAdi,
    link: `/orders/mine?f.siparisNo=${encodeURIComponent(no)}`,
    done: true,
  })
  if (order.teklifNo && order.siparisNo && order.siparisMiTeklifMi !== 'Teklif') {
    nodes.push({
      key: 'conv', icon: <FileText className="h-3.5 w-3.5" />, tone: 'info', done: true,
      title: t('docFlow.convertedFromQuote', { no: order.teklifNo }),
    })
  }
  // Kontrol
  nodes.push({
    key: 'qc',
    icon: order.kontrol === 'Reddet' ? <XCircle className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />,
    title: `${t('docFlow.qc')}: ${t(`status.kontrol.${order.kontrol === 'Onay' ? 'approved' : order.kontrol === 'Reddet' ? 'rejected' : 'pendingControl'}`)}`,
    tone: statusTone(order.kontrol, 'kontrol'),
    body: order.kontrol === 'Reddet' && order.red ? order.red : undefined,
    link: '/quality-control',
    done: order.kontrol === 'Onay' || order.kontrol === 'Reddet',
  })
  for (const a of approvals) {
    nodes.push({
      key: `ap-${a.onayID}`, at: a.onayTarih, icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      title: `${t('docFlow.approvalStep')}: ${approvalLabel(t, a.onayDurumu)}`,
      tone: approvalTone(a.onayDurumu), meta: a.kullaniciAdi, body: a.aciklama, done: true,
    })
  }
  // Tahsilatlar
  txs.forEach((x, i) => {
    nodes.push({
      key: `tx-${x.id}`, at: x.tarih, icon: <Wallet className="h-3.5 w-3.5" />,
      title: x.iptal
        ? t('docFlow.paymentCancelled', { n: i + 1 })
        : t('docFlow.payment', { n: i + 1, amount: formatMoney(x.odenenMiktar, order.paraTipi) }),
      tone: x.iptal ? 'danger' : 'success',
      meta: x.iptal ? x.iptalKullaniciAdSoyad : undefined,
      body: x.iptal ? x.iptalGerekce : undefined,
      link: '/accounting',
      done: true,
    })
  })
  // Erken tamamlanma kontrolü: üretim veya lojistiğe girmeden erken kapatıldı mı?
  const isEarlyCompleted = order.siparisMiTeklifMi === 'Tamamlandi' &&
    !!order.tamamlanmaOncekiAsama &&
    order.tamamlanmaOncekiAsama !== 'TamamlanmaBekliyor' &&
    order.tamamlanmaOncekiAsama !== 'Lojistik'
  const factorySkipped = isEarlyCompleted && (order.tamamlanmaOncekiAsama === 'Siparis' || order.tamamlanmaOncekiAsama === 'Planlama') && !order.sTarih && !order.fabrikaNot
  const shipSkipped = isEarlyCompleted && !order.lojistikNot && (order.tamamlanmaOncekiAsama !== 'Hazir' || !offers.length)

  // Üretim
  nodes.push({
    key: 'factory', at: reached('Uretim') && !factorySkipped ? order.sTarih : undefined, icon: <Factory className="h-3.5 w-3.5" />,
    title: factorySkipped
      ? 'Üretim Atlandı (Erken Kapatıldı)'
      : reached('Hazir') ? t('docFlow.productionDone') : reached('Uretim') ? t('docFlow.inProduction') : t('docFlow.awaitingProduction'),
    tone: factorySkipped ? 'neutral' : reached('Hazir') ? 'success' : reached('Uretim') ? 'progress' : 'neutral',
    body: order.fabrikaNot, link: '/factory', done: reached('Uretim') && !factorySkipped,
  })
  // Lojistik teklifleri
  for (const o of offers) {
    nodes.push({
      key: `lo-${o.teklifID}`, at: o.olusturmaTarihi, icon: <Truck className="h-3.5 w-3.5" />,
      title: `${t('docFlow.logisticsOffer', { firma: o.firmaAdi })}${hideMoney ? '' : ` · ${formatMoney(o.fiyat, o.paraBirimi)}`}`,
      tone: approvalTone(o.durum === 'Beklemede' ? null : o.durum),
      meta: o.kullaniciAdSoyad, body: o.redNotu, link: '/logistics/offers', done: true,
    })
  }
  nodes.push({
    key: 'ship', icon: <Truck className="h-3.5 w-3.5" />,
    title: shipSkipped
      ? 'Sevkiyat Atlandı (Erken Kapatıldı)'
      : reached('Lojistik') ? t('docFlow.shipped') : t('docFlow.awaitingShipment'),
    tone: shipSkipped ? 'neutral' : reached('Lojistik') ? 'info' : 'neutral', body: order.lojistikNot,
    link: '/logistics/history', done: reached('Lojistik') && !shipSkipped,
  })
  if (order.siparisMiTeklifMi === 'Iptal') {
    nodes.push({ key: 'cancel', icon: <XCircle className="h-3.5 w-3.5" />, title: stageLabel(t, 'Iptal'), tone: 'danger', done: true })
  }
  nodes.push({
    key: 'done',
    at: order.tamamlanmaTarihi || undefined,
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    title: stageLabel(t, reached('Tamamlandi') ? 'Tamamlandi' : 'TamamlanmaBekliyor'),
    tone: reached('Tamamlandi') ? 'success' : reached('TamamlanmaBekliyor') ? 'warning' : 'neutral',
    meta: order.tamamlayanAdSoyad ? `Kapatan: ${order.tamamlayanAdSoyad}` : undefined,
    body: order.tamamlanmaNotu || (order.tamamlanmaOncekiAsama && order.tamamlanmaOncekiAsama !== 'TamamlanmaBekliyor' ? `${order.tamamlanmaOncekiAsama} aşamasından doğrudan tamamlandı` : undefined),
    done: reached('Tamamlandi') || reached('TamamlanmaBekliyor'),
  })

  // Kronolojik (tarihli düğümler) + mantıksal sıra (tarihsizler yerinde kalır).
  return (
    <>
    {step?.stepCode && step.department && (
      <p className="mb-2 flex flex-wrap items-center gap-2 rounded-md border border-warning/30 bg-warning-soft px-2 py-1.5 text-xs text-warning-soft-foreground">
        <span className="font-semibold">{t('workflow.currentStep')}:</span>
        <span>{t(stepLabelKey(step.stepCode))}</span>
        <span className="opacity-80">· {t(departmentLabelKey(step.department))}</span>
        <AgeChip since={step.waitingSince} className="ml-auto" />
      </p>
    )}
    <ol className="relative ml-3 space-y-0 border-l" aria-label={t('docFlow.title')}>
      {nodes.map((n) => {
        const inner = (
          <div className={cn('flex flex-col gap-0.5 rounded-md px-2 py-1.5', n.link && 'hover:bg-accent')}>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={n.done ? n.tone : 'neutral'}>{n.title}</Badge>
              {n.at && <span className="text-xs tabular-nums text-muted-foreground">{formatDate(n.at)}</span>}
              {n.meta && <span className="text-xs text-muted-foreground">· {n.meta}</span>}
            </div>
            {n.body && <p className="text-xs text-muted-foreground whitespace-pre-wrap">{n.body}</p>}
          </div>
        )
        return (
          <li key={n.key} className={cn('relative pb-1 pl-5', !n.done && 'opacity-60')}>
            <span className={cn(
              'absolute -left-[0.8rem] top-1.5 flex h-6 w-6 items-center justify-center rounded-full border bg-background',
              n.done ? 'text-foreground' : 'text-muted-foreground border-dashed',
            )}>
              {n.icon}
            </span>
            {n.link ? <Link to={n.link} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md">{inner}</Link> : inner}
          </li>
        )
      })}
    </ol>
    </>
  )
}

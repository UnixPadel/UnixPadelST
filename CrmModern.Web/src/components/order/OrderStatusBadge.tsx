import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { StatusBadge } from '@/components/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { kontrolLabel, stageLabel } from '@/lib/status'
import type { OrderHitSummary } from '@/types'

type OrderStatus = Pick<OrderHitSummary, 'asama' | 'kontrol' | 'silindi'>

/**
 * Tür rozetinin yanındaki durum. Teklif ve Sipariş aşamasında aşama adı türü
 * tekrarlardı; orada kontrol durumu, sonraki aşamalarda aşama adı gösterilir.
 */
const showsControl = (order: OrderStatus) => order.asama === 'Teklif' || order.asama === 'Siparis'

export function orderStatusText(t: TFunction, order: OrderStatus): string {
  if (order.silindi) return t('search.deleted')
  return showsControl(order) ? kontrolLabel(t, order.kontrol) : stageLabel(t, order.asama)
}

export function OrderStatusBadge({ order, className }: { order: OrderStatus; className?: string }) {
  const { t } = useTranslation()
  if (order.silindi) return <Badge variant="danger" className={className}>{t('search.deleted')}</Badge>
  return showsControl(order)
    ? <StatusBadge value={order.kontrol} context="kontrol" className={className} />
    : <StatusBadge value={order.asama} context="stage" className={className} />
}

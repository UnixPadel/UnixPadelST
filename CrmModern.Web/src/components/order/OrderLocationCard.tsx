import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { getOrderStep } from '@/api/workflow'
import { AgeChip } from '@/components/AgeChip'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { locateOrder } from '@/lib/orderLocation'
import { cn } from '@/lib/utils'
import { departmentLabelKey, stepLabelKey } from '@/lib/workflow'
import type { OrderSearchHit } from '@/types'

const TONE = {
  waiting: 'border-warning/40 bg-warning-soft text-warning-soft-foreground',
  done: 'border-success/40 bg-success-soft text-success-soft-foreground',
  stopped: 'border-danger/40 bg-danger-soft text-danger-soft-foreground',
  idle: 'border-border bg-muted text-foreground',
}

/**
 * "Şu an nerede?" — siparişin kimde beklediği, hangi ekranda bulunacağı ve sonraki
 * adım. Ekran kullanıcıya kapalıysa bağlantı verilmez, sorumlu departman yazılır.
 */
export function OrderLocationCard({ order }: { order: OrderSearchHit }) {
  const { t } = useTranslation()
  const { getUser } = useAuth()
  const location = locateOrder(order, getUser())

  // Bekleme süresi ve sonraki adım; gelmezse kart temel bilgiyle kalır.
  const { data: step } = useQuery({
    queryKey: ['workflow-step', order.siparisNo],
    queryFn: () => getOrderStep(order.siparisNo),
    enabled: !!order.stepCode,
    retry: false,
    staleTime: 30_000,
  })

  const screenName = (s: { labelKey: string; queueKey?: string }) =>
    s.queueKey ? `${t(s.labelKey)} · ${t(s.queueKey)}` : t(s.labelKey)

  const department = order.department ? t(departmentLabelKey(order.department)) : null

  let headline: string
  let tone: keyof typeof TONE
  if (order.silindi) { headline = t('search.location.deleted'); tone = 'stopped' }
  else if (order.stepCode) { headline = t(stepLabelKey(order.stepCode)); tone = 'waiting' }
  else if (order.asama === 'Tamamlandi') { headline = t('search.location.completed'); tone = 'done' }
  else if (order.asama === 'Iptal') { headline = t('search.location.cancelled'); tone = 'stopped' }
  else { headline = t('search.location.idle'); tone = 'idle' }

  const { work, link, linkIsWork } = location

  return (
    <section aria-label={t('search.location.title')} className={cn('space-y-1 rounded-md border px-3 py-2 text-sm', TONE[tone])}>
      <h3 className="text-xs font-semibold">{t('search.location.title')}</h3>
      <p className="font-semibold">{headline}</p>

      {department && (
        <p className="flex flex-wrap items-center gap-2">
          <span>{t('search.location.owner', { department })}</span>
          <AgeChip since={step?.waitingSince} />
        </p>
      )}
      {step?.nextStepCode && (
        <p>{t('search.location.next', { step: t(stepLabelKey(step.nextStepCode)) })}</p>
      )}

      {work && !linkIsWork && (
        <p>{t('search.location.screenClosed', { screen: screenName(work) })}</p>
      )}
      {!link && department && <p>{t('search.location.noAccess', { department })}</p>}

      {link && (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
          <span className="min-w-0">
            {t(linkIsWork ? 'search.location.screen' : 'search.location.viewAt', { screen: screenName(link) })}
          </span>
          <Button asChild size="xs" variant="outline" className="bg-background text-foreground">
            <Link to={link.to}>
              {t('search.location.go')} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </Button>
        </div>
      )}
    </section>
  )
}

import { useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronRight, Hourglass } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Popover } from '@/components/ui/popover'
import { AgeChip } from '@/components/AgeChip'
import { getWaiting } from '@/api/workflow'
import { departmentLabelKey, stepLabelKey } from '@/lib/workflow'
import { readJSON, userKey, writeJSON } from '@/lib/storage'
import { cn } from '@/lib/utils'
import type { WaitingOrderDto, WorkflowScreen } from '@/types'

/**
 * İç denetim — "Önceki aşamada bekleyenler": sipariş neden henüz bu ekrana
 * düşmedi? Yalnız bir önceki adım gösterilir (ör. Lojistik Hazır'da
 * "Muhasebe lojistik onayı bekleniyor (2. peşinat)"; 1. peşinat görünmez).
 * Adım tanımı backend'de tek yerde: OrderWorkflow.cs.
 *
 * `inline`: listenin üstünde katlanabilir kart (açık/kapalı ekran başına hatırlanır).
 * `button`: kalabalık ekranlarda (Kontrol, Muhasebe Onay) başlıkta buton + popover.
 */
export function WaitingUpstreamPanel({ screen, variant = 'inline', className }: {
  screen: WorkflowScreen | undefined
  variant?: 'inline' | 'button'
  className?: string
}) {
  const { t } = useTranslation()
  const q = useQuery({
    queryKey: ['workflow-waiting', screen],
    queryFn: () => getWaiting(screen!),
    enabled: !!screen,
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
  const rows = q.data ?? []
  const step = rows[0]

  if (!screen) return null
  if (variant === 'button') return <WaitingButton rows={rows} loading={q.isLoading} error={q.isError} />

  return <WaitingInline screen={screen} rows={rows} loading={q.isLoading} error={q.isError} className={className}
    subtitle={step ? `${t(departmentLabelKey(step.department))} · ${t(stepLabelKey(step.stepCode))}` : undefined} />
}

function WaitingInline({ screen, rows, loading, error, subtitle, className }: {
  screen: WorkflowScreen
  rows: WaitingOrderDto[]
  loading: boolean
  error: boolean
  subtitle?: string
  className?: string
}) {
  const { t } = useTranslation()
  const storeKey = userKey('waiting-open', screen)
  // Kullanıcı seçmediyse: bekleyen varsa açık.
  const [stored, setStored] = useState<boolean | null>(() => readJSON<boolean | null>(storeKey, null))
  const open = stored ?? rows.length > 0
  const toggle = () => { const next = !open; setStored(next); writeJSON(storeKey, next) }
  const bodyId = `waiting-${screen}`

  return (
    <section className={cn('rounded-md border border-dashed bg-muted/30', className)} aria-labelledby={`${bodyId}-h`}>
      <button
        type="button"
        id={`${bodyId}-h`}
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={toggle}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm"
      >
        {open ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
        <Hourglass className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="font-semibold">{t('workflow.panelTitle')}</span>
        {!loading && !error && <Badge variant={rows.length ? 'warning' : 'neutral'}>{rows.length}</Badge>}
        {subtitle && <span className="hidden min-w-0 truncate text-xs text-muted-foreground sm:inline">{subtitle}</span>}
      </button>
      {open && (
        <div id={bodyId} className="border-t px-1 pb-1">
          <p className="px-2 pt-2 text-xs text-muted-foreground">{t('workflow.panelHint')}</p>
          <WaitingList rows={rows} loading={loading} error={error} className="max-h-56" />
        </div>
      )}
    </section>
  )
}

function WaitingButton({ rows, loading, error }: { rows: WaitingOrderDto[]; loading: boolean; error: boolean }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLButtonElement>(null)
  return (
    <>
      <Button ref={ref} size="xs" variant="outline" aria-expanded={open} aria-haspopup="dialog"
        title={t('workflow.panelTitle')} onClick={() => setOpen((o) => !o)}>
        <Hourglass className="h-3.5 w-3.5" /> {t('workflow.buttonLabel')}
        {!loading && !error && <Badge variant={rows.length ? 'warning' : 'neutral'} className="ml-1 px-1.5 py-0">{rows.length}</Badge>}
      </Button>
      <Popover open={open} onOpenChange={setOpen} anchorRef={ref} align="end" className="w-[30rem] max-w-[calc(100vw-2rem)]">
        <p className="px-2 pt-1 text-sm font-semibold">{t('workflow.panelTitle')}</p>
        <p className="px-2 pb-1 text-xs text-muted-foreground">{t('workflow.panelHint')}</p>
        <WaitingList rows={rows} loading={loading} error={error} onOpenOrder={() => setOpen(false)} />
      </Popover>
    </>
  )
}

function WaitingList({ rows, loading, error, className, onOpenOrder }: {
  rows: WaitingOrderDto[]
  loading: boolean
  error: boolean
  className?: string
  onOpenOrder?: () => void
}) {
  const { t } = useTranslation()
  const [, setParams] = useSearchParams()
  // Global sipariş detayı (Layout ?order=NO) — Belge Akışı dahil, ekrandan ayrılmadan.
  const openOrder = (no: string) => {
    onOpenOrder?.()
    setParams((p) => { const np = new URLSearchParams(p); np.set('order', no); return np })
  }

  return (
    <ul className={cn('divide-y overflow-y-auto', className)}>
      {loading && Array.from({ length: 2 }).map((_, i) => (
        <li key={i} className="px-2 py-2"><div className="h-4 animate-pulse rounded bg-muted" /></li>
      ))}
      {!loading && error && <li className="px-2 py-3 text-center text-xs text-destructive">{t('workflow.loadError')}</li>}
      {!loading && !error && rows.length === 0 && (
        <li className="px-2 py-3 text-center text-xs text-muted-foreground">{t('workflow.empty')}</li>
      )}
      {rows.map((r) => (
        <li key={r.siparisNo} className="flex flex-wrap items-center gap-x-2 gap-y-1 px-2 py-1.5 text-sm">
          <button type="button" className="font-mono text-xs text-primary hover:underline" onClick={() => openOrder(r.siparisNo)}>
            {r.siparisNo}
          </button>
          {/* Dar alanda (popover) neden etiketi alt satıra iner; müşteri adı kesilmez. */}
          <span className="min-w-[12rem] flex-1 truncate">
            {r.musteriAd}
            {r.mUlke ? <span className="text-muted-foreground"> · {r.mUlke}</span> : null}
            {r.temsilci ? <span className="text-muted-foreground"> · {r.temsilci}</span> : null}
          </span>
          <Badge variant="warning" className="whitespace-normal text-left font-normal">{t(stepLabelKey(r.stepCode))}</Badge>
          <AgeChip since={r.waitingSince} />
        </li>
      ))}
    </ul>
  )
}

import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, ArrowRight, CheckCircle2, RefreshCw } from 'lucide-react'
import { AGE_WARN_DAYS } from '@/components/AgeChip'
import { ageDays } from '@/lib/date'
import { cn, formatDate } from '@/lib/utils'
import { QUEUE_PATH, type QueueId } from '@/hooks/useWorkQueues'

/**
 * Ana Sayfa — "Sıradaki işlerin". Kuyruk başına tek satır (kalem listesi
 * Bekleyen İşler'de), yalnız dolu kuyruklar, sabit iş akışı sırası, en fazla
 * MAX_ROWS satır. Satırın tamamı tek hedef: kuyruğun iş ekranı. Gecikme yalnız
 * renkle değil, ikon + metinle de verilir. Veri kaynağından bağımsızdır.
 */
export interface QueueSummaryRow {
  id: QueueId
  count: number
  oldestSince?: string | null
  error?: boolean
}

interface WorkQueuePanelProps {
  rows: QueueSummaryRow[]
  loading: boolean
  /** Yüklenirken ayrılacak satır sayısı (alttaki içerik kaymasın). */
  expectedRows: number
  /** Özet isteği tamamen başarısız — tek hata satırı. */
  failed?: boolean
  onRetry?: () => void
}

const MAX_ROWS = 6
const ROW = 'flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm'

export function WorkQueuePanel({ rows, loading, expectedRows, failed, onRetry }: WorkQueuePanelProps) {
  const { t } = useTranslation()
  const retryButton = onRetry && (
    <button
      type="button"
      onClick={onRetry}
      className="flex min-h-8 items-center gap-1 rounded px-2 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> {t('inbox.panel.retry')}
    </button>
  )
  const visible = failed ? [] : rows.filter((r) => r.error || r.count > 0)
  const shown = visible.slice(0, MAX_ROWS)
  const hidden = visible.length - shown.length

  return (
    <section aria-labelledby="work-queue-title" className="mx-6 mt-6 rounded-lg border bg-card">
      <header className="flex items-center gap-2 border-b px-4 py-2">
        <h2 id="work-queue-title" className="text-sm font-semibold">{t('inbox.panel.title')}</h2>
        <Link
          to="/inbox"
          className="ml-auto flex min-h-8 items-center gap-1 rounded px-1 text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t('inbox.panel.seeAll')} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </header>

      <ul className="space-y-0.5 p-1" aria-busy={loading || undefined}>
        {loading && Array.from({ length: Math.max(1, Math.min(expectedRows, 4)) }).map((_, i) => (
          <li key={i} className={ROW} aria-hidden="true">
            <div className="h-4 w-48 animate-pulse rounded bg-muted motion-reduce:animate-none" />
            <div className="ml-auto h-4 w-16 animate-pulse rounded bg-muted motion-reduce:animate-none" />
          </li>
        ))}

        {!loading && failed && (
          <li className={ROW}>
            <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
            <span className="min-w-0 flex-1 text-destructive">{t('inbox.panel.failed')}</span>
            {retryButton}
          </li>
        )}

        {!loading && !failed && visible.length === 0 && (
          <li className={cn(ROW, 'text-muted-foreground')}>
            <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
            {t('inbox.panel.empty')}
          </li>
        )}

        {!loading && shown.map((r) => {
          const title = t(`inbox.queues.${r.id}`)
          if (r.error) {
            return (
              <li key={r.id} className={ROW}>
                <span className="min-w-0 flex-1 truncate">{title}</span>
                <span className="text-xs text-destructive">{t('inbox.panel.loadError')}</span>
                {retryButton}
              </li>
            )
          }
          const age = ageDays(r.oldestSince)
          const late = age != null && age > AGE_WARN_DAYS
          const ageText = age != null ? t('inbox.age', { count: age }) : null
          const label = [
            title,
            t('inbox.panel.itemCount', { count: r.count }),
            ageText && t('inbox.panel.oldestAria', { age: ageText }),
            late && t('inbox.panel.late'),
          ].filter(Boolean).join(', ')
          return (
            <li key={r.id}>
              <Link
                to={QUEUE_PATH[r.id]}
                aria-label={label}
                className={cn(
                  ROW,
                  'group transition-colors duration-150 active:bg-accent/80',
                  '[@media(hover:hover)]:hover:bg-accent',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                )}
              >
                <span className="min-w-0 flex-1 truncate font-medium">{title}</span>
                <span className="min-w-[1.75rem] rounded-full bg-warning-soft px-2 py-0.5 text-center text-xs font-semibold tabular-nums text-warning-soft-foreground">
                  {r.count}
                </span>
                <span
                  className={cn(
                    'hidden w-32 shrink-0 items-center justify-end gap-1 text-xs tabular-nums sm:flex',
                    late ? 'font-medium text-warning-soft-foreground' : 'text-muted-foreground',
                  )}
                  title={r.oldestSince ? formatDate(r.oldestSince) : undefined}
                >
                  {late && <AlertTriangle className="h-3.5 w-3.5 text-warning" aria-hidden="true" />}
                  {ageText && t('inbox.panel.oldest', { age: ageText })}
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </Link>
            </li>
          )
        })}

        {!loading && hidden > 0 && (
          <li>
            <Link
              to="/inbox"
              className={cn(ROW, 'text-xs text-muted-foreground [@media(hover:hover)]:hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring')}
            >
              {t('inbox.panel.more', { count: hidden })}
            </Link>
          </li>
        )}
      </ul>
    </section>
  )
}

import { useTranslation } from 'react-i18next'
import { ageDays } from '@/lib/date'
import { cn, formatDate } from '@/lib/utils'

/** Bekleme yaşı eşiği: aşılınca uyarı tonu (Bekleyen İşler, önceki aşama paneli). */
export const AGE_WARN_DAYS = 3

/** "3 gün" çipi; tarih yoksa hiçbir şey çizmez. Üzerine gelince tam tarih. */
export function AgeChip({ since, className }: { since?: string | null; className?: string }) {
  const { t } = useTranslation()
  const age = ageDays(since)
  if (age == null) return null
  return (
    <span
      className={cn(
        'shrink-0 rounded-full px-2 py-0.5 text-[11px] tabular-nums',
        age > AGE_WARN_DAYS ? 'bg-warning-soft text-warning-soft-foreground' : 'bg-muted text-muted-foreground',
        className,
      )}
      title={since ? formatDate(since) : undefined}
    >
      {t('inbox.age', { count: age })}
    </span>
  )
}

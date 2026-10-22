import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { statusLabel, statusTone, type StatusContext } from '@/lib/status'

interface StatusBadgeProps {
  value?: string | null
  /** Aynı değer bağlama göre farklı anlam taşıyabilir (örn. Hazir: aşama vs lojistik). */
  context?: StatusContext
  className?: string
}

// QW-2 — renk ve etiket tek kayıttan (lib/status.ts). Renk asla tek başına
// bilgi taşımaz: etiket her zaman çevrilmiş metindir.
export function StatusBadge({ value, context, className }: StatusBadgeProps) {
  const { t } = useTranslation()
  if (!value) return <span className="text-muted-foreground">—</span>
  return (
    <Badge variant={statusTone(value, context)} className={className}>
      {statusLabel(t, value, context)}
    </Badge>
  )
}

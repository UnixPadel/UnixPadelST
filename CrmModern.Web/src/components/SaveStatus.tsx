import { useTranslation } from 'react-i18next'
import { Check, Loader2, CircleDot } from 'lucide-react'
import { cn } from '@/lib/utils'

import { formatTime } from '@/lib/format'
/**
 * 40+ ergonomi (K6) — "Kaydedildi mi?" şüphesini gidermek için işlemin yanında
 * duran, kaybolmayan kayıt durumu. Başarı toast'unun yerini alır: ekranda
 * sonucu görünen işlemlerde kullanıcı köşeye bakmak zorunda kalmaz.
 *
 *   <SaveStatus savedAt={savedAt} saving={mut.isPending} dirty={dirty} />
 */
export function SaveStatus({ savedAt, saving, dirty, kind = 'saved', className }: {
  savedAt: Date | null
  /** 'draft': yalnız bu bilgisayara yazılan taslak ("Taslak kaydedildi"). */
  kind?: 'saved' | 'draft'
  saving?: boolean
  dirty?: boolean
  className?: string
}) {
  const { t } = useTranslation()
  if (!saving && !dirty && !savedAt) return null
  const time = savedAt ? formatTime(savedAt) : undefined

  return (
    <span role="status" aria-live="polite"
      className={cn('inline-flex items-center gap-1.5 text-sm font-medium',
        saving ? 'text-muted-foreground' : dirty ? 'text-warning-soft-foreground' : 'text-success-soft-foreground',
        className)}>
      {saving
        ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden />{t('saveStatus.saving')}</>
        : dirty
          ? <><CircleDot className="h-4 w-4" aria-hidden />{t('saveStatus.unsaved')}</>
          : <><Check className="h-4 w-4" aria-hidden />{t(kind === 'draft' ? 'saveStatus.draftSaved' : 'saveStatus.saved', { time })}</>}
    </span>
  )
}

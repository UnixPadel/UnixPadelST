import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * SR-6 — salt-okunur alan gösterimi. AA ROField/CariRow, CTD, MRD/ODM/FA `Row`
 * ve AP KeyValueGrid kopyalarının tek hali.
 *
 *  • <ReadOnlyField label value />  → küçük etiket + kutu (yoğun paneller)
 *  • <KeyValue label value />       → yatay "Etiket ........ Değer" satırı
 */
export function ReadOnlyField({
  label, value, className, multiline, mono, align,
}: {
  label: React.ReactNode
  value: React.ReactNode
  className?: string
  multiline?: boolean
  mono?: boolean
  align?: 'left' | 'right'
}) {
  const empty = value == null || value === ''
  return (
    <div className={cn('min-w-0 space-y-0.5', className)}>
      <div className="text-[11px] font-medium text-muted-foreground">{label}</div>
      <div
        className={cn(
          'rounded border bg-field-readonly px-1.5 py-1 text-xs min-h-[1.625rem]',
          multiline ? 'whitespace-pre-wrap break-words' : 'truncate',
          mono && 'font-mono',
          align === 'right' && 'text-right tabular-nums',
        )}
        title={typeof value === 'string' ? value : undefined}
      >
        {empty ? '—' : value}
      </div>
    </div>
  )
}

export function KeyValue({
  label, value, className, emphasis, valueClassName,
}: {
  label: React.ReactNode
  value: React.ReactNode
  className?: string
  emphasis?: boolean
  valueClassName?: string
}) {
  const empty = value == null || value === ''
  return (
    <div className={cn('flex items-baseline justify-between gap-4 text-sm', emphasis && 'font-semibold', className)}>
      <span className={cn(!emphasis && 'text-muted-foreground')}>{label}</span>
      <span className={cn('text-right break-words', valueClassName)}>{empty ? '—' : value}</span>
    </div>
  )
}

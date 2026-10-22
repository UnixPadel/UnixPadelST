import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Search } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { trLower } from '@/components/ui/combobox'
import { cn } from '@/lib/utils'

/**
 * E-4 — SAP F4 değer yardımı / LOGO "…" liste penceresi: çok kolonlu, aranabilir
 * seçim. Combobox'ta F4 veya büyüteç ile açılır. ↑/↓ gez, Enter seç, Esc kapat.
 */
export interface LookupColumn<T> {
  key: string
  header: string
  value: (row: T) => React.ReactNode
  /** Aramaya dahil edilecek metin (varsayılan: value String'i). */
  text?: (row: T) => string
  className?: string
}

export function LookupDialog<T>({
  open, onOpenChange, title, rows, columns, getKey, onSelect, initialQuery = '',
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  rows: T[]
  columns: LookupColumn<T>[]
  getKey: (row: T) => string | number
  onSelect: (row: T) => void
  initialQuery?: string
}) {
  const { t } = useTranslation()
  const [q, setQ] = React.useState(initialQuery)
  const [active, setActive] = React.useState(0)
  React.useEffect(() => { if (open) { setQ(initialQuery); setActive(0) } }, [open, initialQuery])

  const filtered = React.useMemo(() => {
    const terms = trLower(q.trim()).split(/\s+/).filter(Boolean)
    if (terms.length === 0) return rows.slice(0, 500)
    return rows.filter((r) => {
      const hay = trLower(columns.map((c) => c.text?.(r) ?? String(c.value(r) ?? '')).join(' '))
      return terms.every((x) => hay.includes(x))
    }).slice(0, 500)
  }, [rows, columns, q])

  React.useEffect(() => { setActive(0) }, [q])

  const pick = (r: T | undefined) => {
    if (!r) return
    onSelect(r)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" className="gap-3">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            className="pl-8"
            value={q}
            placeholder={t('lookup.searchPlaceholder')}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(filtered.length - 1, a + 1)) }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)) }
              else if (e.key === 'Enter') { e.preventDefault(); pick(filtered[active]) }
            }}
          />
        </div>
        <div className="max-h-[55vh] overflow-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted">
              <tr>
                {columns.map((c) => <th key={c.key} className={cn('px-2 py-1.5 text-left text-xs font-medium text-muted-foreground', c.className)}>{c.header}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={columns.length} className="px-2 py-8 text-center text-muted-foreground">{t('common.noData')}</td></tr>
              )}
              {filtered.map((r, i) => (
                <tr
                  key={getKey(r)}
                  ref={(el) => { if (i === active) el?.scrollIntoView({ block: 'nearest' }) }}
                  aria-selected={i === active}
                  className={cn('cursor-pointer border-t', i === active ? 'bg-accent' : 'hover:bg-muted/40')}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(r)}
                >
                  {columns.map((c) => <td key={c.key} className={cn('px-2 py-1.5', c.className)}>{c.value(r)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-muted-foreground">{t('lookup.hint', { count: filtered.length })}</p>
      </DialogContent>
    </Dialog>
  )
}

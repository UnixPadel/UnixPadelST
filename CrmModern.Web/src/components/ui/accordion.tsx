import * as React from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Basit, bağımlılıksız açılır/kapanır bölüm. Başlık bir <button>
 * (aria-expanded/aria-controls) — klavye ile Enter/Space açar.
 * `summary` kapalıyken başlığın yanında özet gösterir ("17 şart seçili").
 */
export function CollapsibleSection({
  title, summary, actions, defaultOpen = false, open: openProp, onOpenChange, children, className, id,
}: {
  title: React.ReactNode
  summary?: React.ReactNode
  actions?: React.ReactNode
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
  className?: string
  id?: string
}) {
  const [inner, setInner] = React.useState(defaultOpen)
  const open = openProp ?? inner
  const setOpen = (v: boolean) => { setInner(v); onOpenChange?.(v) }
  const contentId = React.useId()
  return (
    <section id={id} className={cn('rounded-md border bg-card scroll-mt-16', className)}>
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          className="flex flex-1 items-center gap-2 text-left text-sm font-semibold"
          aria-expanded={open}
          aria-controls={contentId}
          onClick={() => setOpen(!open)}
        >
          <ChevronRight className={cn('h-4 w-4 shrink-0 transition-transform', open && 'rotate-90')} />
          <span>{title}</span>
          {summary && <span className="text-xs font-normal text-muted-foreground">· {summary}</span>}
        </button>
        {actions}
      </div>
      <div id={contentId} hidden={!open} className="border-t">
        {open && children}
      </div>
    </section>
  )
}

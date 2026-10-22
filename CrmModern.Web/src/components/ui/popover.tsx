import * as React from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

/**
 * Hafif popover (ek bağımlılık yok): tetikleyiciye göre konumlanır, dışarı
 * tıklama ve Esc ile kapanır, portal ile overflow kesilmesinden etkilenmez.
 * Kolon seçici, görünüm menüsü ve Combobox listesi bunu kullanır.
 */
export function usePopoverPosition(
  anchor: React.RefObject<HTMLElement>, open: boolean, align: 'start' | 'end' = 'start', matchWidth = false,
) {
  const [pos, setPos] = React.useState<{ top: number; left: number; width?: number; maxHeight: number } | null>(null)
  React.useLayoutEffect(() => {
    if (!open) return
    const update = () => {
      const r = anchor.current?.getBoundingClientRect()
      if (!r) return
      const below = window.innerHeight - r.bottom - 8
      const above = r.top - 8
      const openUp = below < 200 && above > below
      setPos({
        top: openUp ? Math.max(8, r.top - Math.min(above, 360)) : r.bottom + 4,
        left: align === 'end' ? Math.max(8, r.right) : r.left,
        width: matchWidth ? r.width : undefined,
        maxHeight: Math.min(openUp ? above : below, 360),
      })
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [anchor, open, align, matchWidth])
  return pos
}

export function Popover({
  open, onOpenChange, anchorRef, align = 'start', matchWidth, className, children, role = 'dialog', id,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  anchorRef: React.RefObject<HTMLElement>
  align?: 'start' | 'end'
  matchWidth?: boolean
  className?: string
  children: React.ReactNode
  role?: string
  id?: string
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  const pos = usePopoverPosition(anchorRef, open, align, matchWidth)

  React.useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (ref.current?.contains(t) || anchorRef.current?.contains(t)) return
      onOpenChange(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onOpenChange(false); anchorRef.current?.focus() }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [open, onOpenChange, anchorRef])

  if (!open || !pos) return null
  return createPortal(
    <div
      ref={ref}
      id={id}
      role={role}
      style={{
        position: 'fixed', top: pos.top, left: pos.left, width: pos.width, maxHeight: pos.maxHeight,
        transform: align === 'end' ? 'translateX(-100%)' : undefined,
      }}
      className={cn(
        'z-[70] min-w-[10rem] overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95',
        className,
      )}
    >
      {children}
    </div>,
    document.body,
  )
}

import * as React from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

/**
 * E-7 — LOGO liste penceresi tarzı sağ tık menüsü. Satır aksiyonları bir kez
 * tanımlanır (RowAction[]); hem bağlam menüsünde hem araç çubuğunda aynı kayıt
 * kullanılır. Klavye: ↑/↓ gez, Enter seç, Esc kapat; satırda Shift+F10 /
 * ContextMenu tuşu menüyü açar.
 */
export interface RowAction<T = unknown> {
  key: string
  label: string
  icon?: React.ReactNode
  onSelect: (row: T) => void
  disabled?: boolean | ((row: T) => boolean)
  hidden?: boolean | ((row: T) => boolean)
  destructive?: boolean
  shortcut?: string
  /** Bu aksiyondan önce ayırıcı çizgi. */
  separatorBefore?: boolean
}

export function ContextMenu<T>({
  x, y, row, actions, onClose,
}: {
  x: number
  y: number
  row: T
  actions: RowAction<T>[]
  onClose: () => void
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  const visible = actions.filter((a) => !(typeof a.hidden === 'function' ? a.hidden(row) : a.hidden))
  const isDisabled = (a: RowAction<T>) => (typeof a.disabled === 'function' ? a.disabled(row) : !!a.disabled)
  const [idx, setIdx] = React.useState(() => visible.findIndex((a) => !isDisabled(a)))

  React.useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    if (r.right > window.innerWidth) el.style.left = `${Math.max(4, window.innerWidth - r.width - 4)}px`
    if (r.bottom > window.innerHeight) el.style.top = `${Math.max(4, window.innerHeight - r.height - 4)}px`
    el.focus()
  }, [])

  React.useEffect(() => {
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) onClose() }
    const onScroll = () => onClose()
    document.addEventListener('mousedown', onDown)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('blur', onClose)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('blur', onClose)
    }
  }, [onClose])

  const run = (a: RowAction<T>) => {
    if (isDisabled(a)) return
    onClose()
    a.onSelect(row)
  }

  const move = (dir: 1 | -1) => {
    if (visible.length === 0) return
    let i = idx
    for (let n = 0; n < visible.length; n++) {
      i = (i + dir + visible.length) % visible.length
      if (!isDisabled(visible[i])) { setIdx(i); return }
    }
  }

  return createPortal(
    <div
      ref={ref}
      role="menu"
      tabIndex={-1}
      style={{ position: 'fixed', top: y, left: x }}
      className="z-[80] min-w-[12rem] rounded-md border bg-popover p-1 text-sm text-popover-foreground shadow-lg outline-none animate-in fade-in-0 zoom-in-95"
      onKeyDown={(e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); move(1) }
        else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1) }
        else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (visible[idx]) run(visible[idx]) }
        else if (e.key === 'Escape' || e.key === 'Tab') { e.preventDefault(); onClose() }
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {visible.map((a, i) => (
        <React.Fragment key={a.key}>
          {a.separatorBefore && i > 0 && <div className="-mx-1 my-1 h-px bg-border" role="separator" />}
          <button
            type="button"
            role="menuitem"
            disabled={isDisabled(a)}
            onMouseEnter={() => setIdx(i)}
            onClick={() => run(a)}
            className={cn(
              'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left outline-none disabled:pointer-events-none disabled:opacity-40',
              i === idx && 'bg-accent text-accent-foreground',
              a.destructive && 'text-destructive',
            )}
          >
            <span className="flex h-4 w-4 items-center justify-center">{a.icon}</span>
            <span className="flex-1">{a.label}</span>
            {a.shortcut && <kbd className="text-[10px] text-muted-foreground">{a.shortcut}</kbd>}
          </button>
        </React.Fragment>
      ))}
    </div>,
    document.body,
  )
}

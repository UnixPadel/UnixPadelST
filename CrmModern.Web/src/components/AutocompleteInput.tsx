import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/**
 * Minimal typeable-combobox. Used by PROMPT.md ACCOUNTING #15 to mirror the
 * legacy ComboBox.Text behaviour (Style=DropDown — both pickable and
 * free-typable) for the MüsteriAdı filter.
 *
 * Behaviour:
 *  - User types → input value updates AND a popover lists matching options
 *    (case-insensitive substring match). Click on an option fills the input
 *    with that exact text.
 *  - Free typing is preserved — onChange always fires with the raw text, so
 *    a partial-name string travels through as the filter value.
 *  - Closes on outside click or Escape; keyboard up/down + Enter to pick.
 *  - SR-3: Enter yalnız liste AÇIKKEN seçer (önceden kapalı listede de
 *    filtered[hover] yazılan metni eziyordu); ARIA combobox/listbox rolleri.
 */
export interface AutocompleteInputProps {
  value: string
  onChange: (val: string) => void
  options: string[]
  placeholder?: string
  className?: string
  disabled?: boolean
  /** Max items to show in the popover (default 50). */
  maxItems?: number
}

export function AutocompleteInput({
  value, onChange, options,
  placeholder, className, disabled, maxItems = 50,
}: AutocompleteInputProps) {
  const [open, setOpen] = useState(false)
  const [hover, setHover] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)
  const listId = useId()

  const filtered = useMemo(() => {
    const q = value.trim().toLocaleLowerCase('tr-TR')
    const src = q
      ? options.filter((o) => o.toLocaleLowerCase('tr-TR').includes(q))
      : options
    return src.slice(0, maxItems)
  }, [options, value, maxItems])

  // Reset hover when filter changes.
  useEffect(() => { setHover(0) }, [filtered.length])

  // Close on outside click.
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true); return
    }
    if (e.key === 'Escape') { setOpen(false); return }
    if (!open || !filtered.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHover((i) => Math.min(filtered.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHover((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      onChange(filtered[hover])
      setOpen(false)
    }
  }

  return (
    <div ref={wrapRef} className={cn('relative', className)}>
      <Input
        role="combobox"
        aria-expanded={open && filtered.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && filtered.length > 0 ? `${listId}-${hover}` : undefined}
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKey}
      />
      {open && filtered.length > 0 && (
        <div id={listId} role="listbox" className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-60 overflow-y-auto">
          {filtered.map((opt, i) => (
            <button
              type="button"
              role="option"
              id={`${listId}-${i}`}
              aria-selected={i === hover}
              tabIndex={-1}
              key={`${opt}-${i}`}
              className={cn(
                'w-full text-left px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground',
                i === hover && 'bg-accent text-accent-foreground',
              )}
              onMouseDown={(e) => { e.preventDefault(); onChange(opt); setOpen(false) }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

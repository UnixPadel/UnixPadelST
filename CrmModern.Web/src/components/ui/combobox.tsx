import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Check, ChevronsUpDown, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Popover } from '@/components/ui/popover'

/**
 * SR-3 / E-4 — aranabilir seçim kutusu (Radix Select yerine uzun listeler için:
 * müşteri, ülke, ana ürün…). Yazdıkça Türkçe büyük/küçük harf duyarsız süzer.
 *
 *  • ↑/↓ gez · Enter seç (tek eşleşme varsa doğrudan) · Esc kapat/geri al
 *  • F4 → `onLookup` (çok kolonlu arama penceresi, SAP F4 / LOGO "…")
 *  • `allowCustom` → listede olmayan serbest metin de kabul edilir
 *  • ARIA combobox/listbox + aria-activedescendant
 */
export interface ComboOption {
  value: string
  label: string
  description?: string
  /** Aramaya dahil edilen ek metin (VAT, telefon, kod…). */
  keywords?: string
}

export const trLower = (s: string) => s.toLocaleLowerCase('tr')

export function filterOptions(options: ComboOption[], query: string, limit = 200): ComboOption[] {
  const q = trLower(query.trim())
  if (!q) return options.slice(0, limit)
  const terms = q.split(/\s+/)
  const out: ComboOption[] = []
  for (const o of options) {
    const hay = trLower(`${o.label} ${o.description ?? ''} ${o.keywords ?? ''} ${o.value}`)
    if (terms.every((t) => hay.includes(t))) {
      out.push(o)
      if (out.length >= limit) break
    }
  }
  return out
}

export interface ComboboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'size'> {
  options: ComboOption[]
  value: string | null | undefined
  onValueChange: (value: string, option: ComboOption | null) => void
  placeholder?: string
  emptyText?: string
  allowCustom?: boolean
  onLookup?: () => void
  inputSize?: 'default' | 'sm'
  loading?: boolean
}

export const Combobox = React.forwardRef<HTMLInputElement, ComboboxProps>(function Combobox({
  options, value, onValueChange, placeholder, emptyText, allowCustom, onLookup, inputSize = 'default',
  loading, disabled, className, id, onKeyDown, onBlur, ...rest
}, ref) {
  const { t } = useTranslation()
  const inputRef = React.useRef<HTMLInputElement>(null)
  React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement)
  const wrapRef = React.useRef<HTMLDivElement>(null)
  const listId = React.useId()
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState<string | null>(null) // null → yazmıyor
  const [active, setActive] = React.useState(0)

  const selected = options.find((o) => o.value === value) ?? null
  const display = query ?? (selected?.label ?? (allowCustom ? (value ?? '') : ''))
  const filtered = React.useMemo(() => filterOptions(options, query ?? ''), [options, query])

  React.useEffect(() => { setActive(0) }, [query, open])

  const commit = (o: ComboOption | null, custom?: string) => {
    if (o) onValueChange(o.value, o)
    else if (custom != null && allowCustom) onValueChange(custom, null)
    setQuery(null)
    setOpen(false)
  }

  const scrollActive = (i: number) => {
    document.getElementById(`${listId}-${i}`)?.scrollIntoView({ block: 'nearest' })
  }

  return (
    <div ref={wrapRef} className={cn('relative', className)}>
      <input
        ref={inputRef}
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && filtered[active] ? `${listId}-${active}` : undefined}
        autoComplete="off"
        disabled={disabled}
        placeholder={placeholder ?? t('combobox.placeholder')}
        value={display}
        className={cn(
          'flex w-full rounded-md border border-input bg-background pl-3 pr-8 text-sm ring-offset-background placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          'aria-[invalid=true]:border-destructive',
          inputSize === 'sm' ? 'h-8 text-xs' : 'h-10',
        )}
        onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
        onFocus={(e) => e.currentTarget.select()}
        onClick={() => setOpen(true)}
        onBlur={(e) => {
          // Liste içine tıklama blur'u sayılmasın (mousedown preventDefault ediliyor).
          if (query != null) {
            if (allowCustom) commit(null, query)
            else { setQuery(null) }
          }
          setOpen(false)
          onBlur?.(e)
        }}
        onKeyDown={(e) => {
          if (e.key === 'F4' && onLookup) { e.preventDefault(); setOpen(false); onLookup(); return }
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            if (!open) { setOpen(true); return }
            const n = Math.min(filtered.length - 1, active + 1); setActive(n); scrollActive(n)
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            const n = Math.max(0, active - 1); setActive(n); scrollActive(n)
          } else if (e.key === 'Enter') {
            if (open && filtered.length > 0 && (query != null || filtered[active])) {
              e.preventDefault()
              commit(filtered[active] ?? null)
              return
            }
            if (query != null && allowCustom) { e.preventDefault(); commit(null, query); return }
          } else if (e.key === 'Escape') {
            if (open || query != null) { e.preventDefault(); e.stopPropagation(); setQuery(null); setOpen(false) }
          } else if (e.key === 'Tab' && open && query != null && filtered.length === 1) {
            commit(filtered[0])
          }
          onKeyDown?.(e)
        }}
        {...rest}
      />
      <button
        type="button"
        tabIndex={-1}
        disabled={disabled}
        aria-label={onLookup ? t('combobox.lookup') : t('combobox.toggle')}
        title={onLookup ? 'F4' : undefined}
        className="absolute inset-y-0 right-0 flex w-8 items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-50"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          if (onLookup) { onLookup(); return }
          setOpen((o) => !o); inputRef.current?.focus()
        }}
      >
        {onLookup ? <Search className="h-3.5 w-3.5" /> : <ChevronsUpDown className="h-3.5 w-3.5" />}
      </button>
      <Popover open={open && !disabled} onOpenChange={setOpen} anchorRef={wrapRef} matchWidth role="presentation">
        <ul id={listId} role="listbox" className="py-0.5" onMouseDown={(e) => e.preventDefault()}>
          {loading && <li className="px-2 py-1.5 text-xs text-muted-foreground">{t('common.loading')}</li>}
          {!loading && filtered.length === 0 && (
            <li className="px-2 py-1.5 text-xs text-muted-foreground">
              {allowCustom && query ? t('combobox.useCustom', { value: query }) : (emptyText ?? t('combobox.empty'))}
            </li>
          )}
          {filtered.map((o, i) => (
            <li
              key={o.value}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={o.value === value}
              className={cn(
                'flex cursor-pointer items-start gap-2 rounded-sm px-2 py-1.5 text-sm',
                i === active && 'bg-accent text-accent-foreground',
              )}
              onMouseEnter={() => setActive(i)}
              onClick={() => commit(o)}
            >
              <Check className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', o.value === value ? 'opacity-100' : 'opacity-0')} />
              <span className="min-w-0">
                <span className="block truncate">{o.label}</span>
                {o.description && <span className="block truncate text-xs text-muted-foreground">{o.description}</span>}
              </span>
            </li>
          ))}
          {options.length > filtered.length && !query && (
            <li className="px-2 py-1 text-[11px] text-muted-foreground">{t('combobox.typeToFilter')}</li>
          )}
        </ul>
      </Popover>
    </div>
  )
})

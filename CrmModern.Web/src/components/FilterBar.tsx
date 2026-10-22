import * as React from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Bookmark, Check, RotateCcw, Star, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Popover } from '@/components/ui/popover'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { getTableState, setTableState, useTableState, type SavedView } from '@/lib/tableState'
import { cn } from '@/lib/utils'

/**
 * SR-5 — tüm liste ekranlarında tek filtre çubuğu düzeni (önceden 9 farklı
 * düzen: etiketli/etiketsiz, 'all' vs '__all__', canlı vs "Ara" butonu).
 *  • Etiketli alanlar, sağda Sıfırla (+ isteğe bağlı Uygula/Ara).
 *  • Alanlardan birinde Enter → onSubmit (F8 de aynı işi yapar, sayfa bağlar).
 *  • Durum URL'de tutulur (useFilterState) → geri tuşu ve sayfa dönüşünde korunur.
 *  • E-6 — Görünümler: filtre + kolon düzeni + sıralama birlikte kaydedilir.
 */
export const ALL = '__all__'

export function useFilterState<F extends Record<string, string>>(defaults: F, prefix = 'f') {
  const [params, setParams] = useSearchParams()
  const values = React.useMemo(() => {
    const out = { ...defaults }
    for (const k of Object.keys(defaults)) {
      const v = params.get(`${prefix}.${k}`)
      if (v != null) (out as Record<string, string>)[k] = v
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, prefix])

  const setAll = React.useCallback((next: Partial<F>) => {
    setParams((p) => {
      const np = new URLSearchParams(p)
      for (const [k, v] of Object.entries({ ...defaults, ...next })) {
        if (v == null || v === '' || v === (defaults as Record<string, string>)[k]) np.delete(`${prefix}.${k}`)
        else np.set(`${prefix}.${k}`, String(v))
      }
      return np
    }, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setParams, prefix])

  const set = React.useCallback(<K extends keyof F>(key: K, value: F[K]) => {
    setAll({ ...values, [key]: value })
  }, [setAll, values])

  const reset = React.useCallback(() => setAll(defaults), [setAll, defaults])
  const isDirty = Object.keys(defaults).some((k) => values[k] !== defaults[k])

  return { values, set, setAll, reset, isDirty }
}

export function FilterBar({
  children, onReset, onSubmit, submitLabel, actions, className, tableId, values, onApplyView,
}: {
  children: React.ReactNode
  onReset?: () => void
  /** Verilirse "Ara/Uygula" butonu ve Enter-ile-uygula etkin. */
  onSubmit?: () => void
  submitLabel?: string
  actions?: React.ReactNode
  className?: string
  /** E-6 — görünüm kaydetme için (DataTable ile aynı tableId). */
  tableId?: string
  values?: Record<string, string>
  onApplyView?: (filters: Record<string, string>) => void
}) {
  const { t } = useTranslation()
  return (
    <form
      role="search"
      className={cn('rounded-md border bg-card p-2', className)}
      onSubmit={(e) => { e.preventDefault(); onSubmit?.() }}
    >
      <div className="flex flex-wrap items-end gap-2">
        <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
          {children}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {tableId && values && onApplyView && <ViewMenu tableId={tableId} values={values} onApply={onApplyView} />}
          {onReset && (
            <Button type="button" size="xs" variant="ghost" onClick={onReset} title={t('filter.reset')}>
              <RotateCcw className="h-3.5 w-3.5" /> {t('filter.reset')}
            </Button>
          )}
          {onSubmit && (
            <Button type="submit" size="xs" title="Enter / F8">{submitLabel ?? t('common.search')}</Button>
          )}
          {actions}
        </div>
      </div>
      {/* Enter'ın formu göndermesi için görünmez submit (onSubmit yoksa no-op). */}
      {!onSubmit && <button type="submit" hidden aria-hidden tabIndex={-1} />}
    </form>
  )
}

export function FilterField({
  label, children, className, htmlFor,
}: { label: string; children: React.ReactNode; className?: string; htmlFor?: string }) {
  return (
    <div className={cn('min-w-0 space-y-0.5', className)}>
      <Label htmlFor={htmlFor} className="text-[11px] font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

function ViewMenu({ tableId, values, onApply }: { tableId: string; values: Record<string, string>; onApply: (f: Record<string, string>) => void }) {
  const { t } = useTranslation()
  const { askReason, confirm } = useConfirm()
  const state = useTableState(tableId)
  const views = state.views ?? []
  const [open, setOpen] = React.useState(false)
  const btn = React.useRef<HTMLButtonElement>(null)

  const apply = (v: SavedView) => {
    setTableState(tableId, { hidden: v.hidden, sort: v.sort ?? null })
    onApply((v.filters ?? {}) as Record<string, string>)
    setOpen(false)
  }

  const save = async () => {
    setOpen(false)
    const name = await askReason({ title: t('views.saveTitle'), label: t('views.name'), confirmLabel: t('common.save') })
    if (!name) return
    const cur = getTableState(tableId)
    const view: SavedView = { name, filters: values, hidden: cur.hidden, sort: cur.sort ?? null }
    setTableState(tableId, (s) => ({ views: [...(s.views ?? []).filter((x) => x.name !== name), view] }))
  }

  const remove = async (name: string) => {
    if (!(await confirm({ title: t('views.deleteTitle'), description: name, destructive: true, confirmLabel: t('common.delete') }))) return
    setTableState(tableId, (s) => ({
      views: (s.views ?? []).filter((x) => x.name !== name),
      defaultView: s.defaultView === name ? null : s.defaultView,
    }))
  }

  return (
    <>
      <Button ref={btn} type="button" size="xs" variant="outline" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Bookmark className="h-3.5 w-3.5" /> {t('views.title')}
      </Button>
      <Popover open={open} onOpenChange={setOpen} anchorRef={btn} align="end" className="w-64">
        {views.length === 0 && <p className="px-2 py-1.5 text-xs text-muted-foreground">{t('views.empty')}</p>}
        {views.map((v) => (
          <div key={v.name} className="group flex items-center gap-1 rounded hover:bg-accent">
            <button type="button" className="flex flex-1 items-center gap-2 px-2 py-1.5 text-left text-sm" onClick={() => apply(v)}>
              {state.defaultView === v.name ? <Star className="h-3.5 w-3.5 fill-current text-warning" /> : <Check className="h-3.5 w-3.5 opacity-0" />}
              <span className="truncate">{v.name}</span>
            </button>
            <button type="button" className="p-1 text-muted-foreground hover:text-foreground" title={t('views.setDefault')}
              onClick={() => setTableState(tableId, { defaultView: state.defaultView === v.name ? null : v.name })}>
              <Star className="h-3.5 w-3.5" />
            </button>
            <button type="button" className="p-1 text-muted-foreground hover:text-destructive" title={t('common.delete')} onClick={() => remove(v.name)}>
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <div className="mt-1 border-t pt-1">
          <button type="button" className="w-full rounded px-2 py-1.5 text-left text-sm hover:bg-accent" onClick={save}>
            + {t('views.saveCurrent')}
          </button>
        </div>
      </Popover>
    </>
  )
}

/**
 * E-6 — sayfa açılışında varsayılan görünümü bir kez uygular (URL'de filtre
 * yoksa). FilterBar kullanan sayfalar çağırır.
 */
export function useDefaultView(tableId: string, hasUrlFilters: boolean, apply: (f: Record<string, string>) => void) {
  const done = React.useRef(false)
  React.useEffect(() => {
    if (done.current) return
    done.current = true
    if (hasUrlFilters) return
    const s = getTableState(tableId)
    const v = s.views?.find((x) => x.name === s.defaultView)
    if (!v) return
    setTableState(tableId, { hidden: v.hidden, sort: v.sort ?? null })
    apply((v.filters ?? {}) as Record<string, string>)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

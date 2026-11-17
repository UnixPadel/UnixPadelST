import * as React from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Bookmark, Check, ChevronDown, ChevronUp, Filter, RotateCcw, Star, Trash2 } from 'lucide-react'
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

/** `primaryKeys` dışındaki filtrelerden kaçı varsayılandan farklı ("Diğer filtreler · n aktif"). */
export function moreFilterCount<F extends Record<string, string>>(values: F, defaults: F, primaryKeys: (keyof F)[]): number {
  return Object.keys(defaults).filter((k) => !primaryKeys.includes(k) && values[k] !== defaults[k]).length
}

export function FilterBar({
  children, onReset, onSubmit, submitLabel, actions, className, tableId, values, onApplyView, collapsible, activeCount = 0,
  primaryCount, moreActiveCount = 0,
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
  /** Scaling Faz 1 — gizlenebilir: kapalıyken tek satır "Filtreler (n aktif)" özeti. */
  collapsible?: boolean
  activeCount?: number
  /**
   * Sade mod (liste + sağ panel ekranları): ilk `primaryCount` alan hep görünür,
   * kalanlar "Diğer filtreler" ile açılır — filtre çubuğu tek satır kalır, liste ve
   * panele yer açılır. Gizli bir filtre etkinse çubuk açık gelir ve sayısı yazar.
   */
  primaryCount?: number
  moreActiveCount?: number
}) {
  const { t } = useTranslation()
  const [hidden, setHidden] = React.useState(false)
  const fields = React.Children.toArray(children)
  const hasMore = primaryCount != null && fields.length > primaryCount
  const [moreOpen, setMoreOpen] = React.useState(moreActiveCount > 0)
  // Kayıtlı görünüm / bağlantı gizli bir filtreyi etkinleştirirse görünmez kalmasın.
  React.useEffect(() => { if (moreActiveCount > 0) setMoreOpen(true) }, [moreActiveCount])
  const shown = hasMore && !moreOpen ? fields.slice(0, primaryCount) : fields
  // Liste sütununun üstünde (dar kap) "Görünümler" ve "Sıfırla" yalnız simge olur;
  // alanlar ve "Diğer filtreler" tek satırda kalsın.
  const formRef = React.useRef<HTMLFormElement>(null)
  const [narrow, setNarrow] = React.useState(false)
  React.useEffect(() => {
    const el = formRef.current
    if (!el) return
    const measure = () => setNarrow(el.clientWidth > 0 && el.clientWidth < 720)
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    measure()
    return () => ro.disconnect()
  }, [])
  return (
    <form
      ref={formRef}
      role="search"
      className={cn('rounded-md border bg-card p-2', className)}
      onSubmit={(e) => { e.preventDefault(); onSubmit?.() }}
    >
      <div className="flex flex-wrap items-end gap-2">
        {collapsible && (
          <Button type="button" size="xs" variant="ghost" className="self-center" onClick={() => setHidden((h) => !h)}
            aria-expanded={!hidden} title={hidden ? t('filter.show') : t('filter.hide')}>
            <Filter className="h-3.5 w-3.5" />
            {hidden && <>{t('filter.title')}{activeCount > 0 && <span className="text-primary">· {t('filter.active', { count: activeCount })}</span>}</>}
            {hidden ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          </Button>
        )}
        {/* Scaling Faz 1 — kolon sayısı viewport'a değil kabın genişliğine göre
            (auto-fill): sidebar açık/kapalı fark etmeksizin sığan kadar alan yan yana. */}
        {/* Alt sınır: dar kapta alanlar alt alta dizilmez, butonlar alt satıra iner. */}
        <div className={cn('grid min-w-[min(100%,17.5rem)] flex-1 grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-2', hidden && 'hidden')}>
          {shown}
        </div>
        <div className={cn('flex flex-wrap items-center gap-1.5', hidden && 'ml-auto')}>
          {hasMore && (
            <Button type="button" size="xs" variant="outline" aria-expanded={moreOpen} onClick={() => setMoreOpen((o) => !o)}>
              <Filter className="h-4 w-4" aria-hidden />
              {moreOpen ? t('filter.less') : t('filter.more')}
              {!moreOpen && moreActiveCount > 0 && <span className="font-semibold text-primary">· {t('filter.active', { count: moreActiveCount })}</span>}
              {moreOpen ? <ChevronUp className="h-4 w-4" aria-hidden /> : <ChevronDown className="h-4 w-4" aria-hidden />}
            </Button>
          )}
          {tableId && values && onApplyView && <ViewMenu tableId={tableId} values={values} onApply={onApplyView} iconOnly={narrow} />}
          {onReset && (
            <Button type="button" size="xs" variant="ghost" onClick={onReset} title={t('filter.reset')} aria-label={t('filter.reset')}>
              <RotateCcw className="h-3.5 w-3.5" aria-hidden /> {!narrow && t('filter.reset')}
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
      <Label htmlFor={htmlFor} className="text-2xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

function ViewMenu({ tableId, values, onApply, iconOnly }: { tableId: string; values: Record<string, string>; onApply: (f: Record<string, string>) => void; iconOnly?: boolean }) {
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
      <Button ref={btn} type="button" size="xs" variant="outline" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        title={t('views.title')} aria-label={t('views.title')}>
        <Bookmark className="h-3.5 w-3.5" aria-hidden /> {!iconOnly && t('views.title')}
      </Button>
      <Popover open={open} onOpenChange={setOpen} anchorRef={btn} align="end" className="w-64">
        {views.length === 0 && <p className="px-2 py-1.5 text-xs text-muted-foreground">{t('views.empty')}</p>}
        {views.map((v) => (
          <div key={v.name} className="flex items-center gap-1 rounded hover:bg-accent">
            <button type="button" className="flex flex-1 items-center gap-2 px-2 py-1.5 text-left text-sm" onClick={() => apply(v)}>
              {state.defaultView === v.name ? <Star className="h-3.5 w-3.5 fill-current text-warning" /> : <Check className="h-3.5 w-3.5 invisible" aria-hidden />}
              <span className="truncate">{v.name}</span>
            </button>
            <button type="button" className="flex min-h-ctl-xs items-center gap-1 rounded px-1.5 text-xs text-foreground hover:bg-background"
              aria-pressed={state.defaultView === v.name}
              onClick={() => setTableState(tableId, { defaultView: state.defaultView === v.name ? null : v.name })}>
              <Star className="h-3.5 w-3.5" aria-hidden /> {t('views.default')}
            </button>
            <button type="button" className="flex min-h-ctl-xs items-center gap-1 rounded px-1.5 text-xs text-danger hover:bg-background" onClick={() => remove(v.name)}>
              <Trash2 className="h-3.5 w-3.5" aria-hidden /> {t('common.delete')}
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

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import {
  ChevronUp, ChevronDown, ChevronsUpDown, Inbox, Columns3, Download, ChevronLeft, ChevronRight, X, AlertTriangle,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover } from '@/components/ui/popover'
import { ContextMenu, type RowAction } from '@/components/ContextMenu'
import { setTableState, useTableState, type SortDir } from '@/lib/tableState'
import { downloadCsv } from '@/lib/export'
import { usePreferences } from '@/lib/preferences'

export type { RowAction }

export interface Column<T> {
  key: keyof T | string
  header: string
  render?: (row: T) => React.ReactNode
  sortable?: boolean
  className?: string
  /**
   * SR-4 — sıralama/dışa aktarma değeri. Verilmezse row[key] kullanılır.
   * Hesaplanan kolonlar (key satırda yoksa) bunu vermelidir.
   */
  sortValue?: (row: T) => string | number | Date | null | undefined
  /** 'number' | 'money' → sayısal sıralama + sağa hizalı tabular-nums; 'date' → tarih sıralaması. */
  type?: 'text' | 'number' | 'money' | 'date'
  align?: 'left' | 'right' | 'center'
  /** false → kolon seçicide gizlenemez (örn. aksiyon kolonu). Varsayılan true. */
  hideable?: boolean
  defaultHidden?: boolean
  /** CSV dışa aktarımında kullanılacak değer; false → kolon dışa aktarılmaz. */
  exportValue?: ((row: T) => string | number | null | undefined) | false
  /** Alt toplam satırı hücresi (görünen/filtrelenmiş satırlar üzerinden). */
  footer?: (rows: T[]) => React.ReactNode
  /**
   * Sabit (dondurulmuş) kolon: yatay kaydırmada kenarda kalır. 'left' yalnız ilk
   * görünür kolon(lar), 'right' yalnız son kolon için anlamlıdır (aksiyonlar).
   */
  pin?: 'left' | 'right'
  /** Uzun metni bu genişlikte "…" ile keser (ör. '16rem'); tam değer title'da. */
  truncate?: string
}

/**
 * Alt toplamı gruplara böler (ör. para birimi): her grup kendi tfoot satırında,
 * Column.footer yalnız o grubun satırlarıyla çağrılır. `order` dışındakiler sona.
 */
export interface FooterGroups<T> {
  by: (row: T) => string
  order?: readonly string[]
}

// Sabit hücre zemini: opak kart rengi + satır durum tonu (--pin-tint, tr'den
// miras) üst katmanda → kaydırılan içerik altından görünmez, satır rengi korunur.
const PIN_BG = { background: 'linear-gradient(var(--pin-tint, transparent), var(--pin-tint, transparent)), hsl(var(--card))' }

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyField: keyof T
  loading?: boolean
  /** Sorgu hatası — boş tablo yerine hata durumu gösterilir. */
  error?: boolean
  emptyMessage?: string
  /**
   * Faz-fix 2.5 — Satır tıklamasıyla detay aç.
   * Buton/link tıklamaları bubble etmesin diye <button> içinden gelen
   * eventler skip edilir.
   */
  onRowClick?: (row: T) => void
  /** PROMPT.md ACCOUNTING #14 — double-click → "Talep Detayları" dialog. */
  onRowDoubleClick?: (row: T) => void
  /**
   * Per-row class hook — used by Muhasebe to colour rows by muhasebeDurumu
   * (legacy SiparisAlDataGridRenklendir).
   */
  rowClassName?: (row: T) => string | undefined
  /**
   * PROMPT-v6 §6 — yoğunluk geçişi. 'compact': px-2 py-2 hücre, text-xs.
   * Verilmezse kullanıcı tercihi (Tercihlerim → tablo yoğunluğu) kullanılır.
   */
  density?: 'normal' | 'compact'
  /**
   * Veri hücrelerini tek satıra zorlar (whitespace-nowrap); taşma yatay
   * kaydırmaya düşer. Başlıklar sarmaya devam eder.
   */
  singleLineRows?: boolean

  // ── SR-4 / E-6 / E-7 / E-9 / E-17 ─────────────────────────────────────
  /** Kalıcı kolon görünürlüğü + sıralama (kullanıcıya özel). Kolon seçiciyi açar. */
  tableId?: string
  /** Tablonun üst çubuğunda sol tarafa (sayaç, filtre özeti vb.). */
  toolbar?: React.ReactNode
  /** Verilirse "Görünümü dışa aktar (CSV/Excel)" butonu görünür. */
  exportFileName?: string
  /** Satır seçimi (toplu işlem). */
  selectable?: boolean | ((row: T) => boolean)
  selectedKeys?: (string | number)[]
  onSelectionChange?: (keys: (string | number)[]) => void
  /** Seçim varken üstte görünen toplu işlem çubuğu içeriği. */
  bulkActions?: (rows: T[], clear: () => void) => React.ReactNode
  /** Sağ tık bağlam menüsü aksiyonları. */
  rowActions?: RowAction<T>[]
  /** Klavye/master-detail için etkin satır (vurgulanır). */
  activeRowKey?: string | number | null
  /** ↑/↓ ile satır değişince (master-detail detayı günceller). */
  onActiveRowChange?: (row: T) => void
  /** Enter tuşu. Verilmezse onRowDoubleClick ?? onRowClick. */
  onRowActivate?: (row: T) => void
  /** İstemci tarafı sayfalama. */
  pageSize?: number
  /** Kaydırma kabı yüksekliği (yapışkan başlık bu kapta çalışır). */
  maxHeight?: string
  /**
   * Scaling Faz 1 — tablo ebeveyninin yüksekliğini doldurur (ebeveyn flex-1 min-h-0
   * olmalı, bkz. FillPage). Dikey kaydırma tablo kabında olur → başlık/alt toplam
   * yapışkan, toolbar ve sayfalama her zaman görünür.
   */
  fill?: boolean
  /** Alt toplam satırı göster (Column.footer). */
  showFooter?: boolean
  /** Alt toplamı gruplara böl (ör. döviz başına ayrı satır). */
  footerGroups?: FooterGroups<T>
}

type SortState = { key: string; dir: SortDir } | null

function cellValue<T>(row: T, col: Column<T>): unknown {
  if (col.sortValue) return col.sortValue(row)
  return (row as Record<string, unknown>)[col.key as string]
}

function compareValues(a: unknown, b: unknown, type: Column<unknown>['type'], locale: string): number {
  if (a == null || a === '') return b == null || b === '' ? 0 : 1
  if (b == null || b === '') return -1
  if (type === 'date' || a instanceof Date) {
    const ta = new Date(a as string).getTime(), tb = new Date(b as string).getTime()
    return (Number.isNaN(ta) ? 0 : ta) - (Number.isNaN(tb) ? 0 : tb)
  }
  if (type === 'number' || type === 'money' || (typeof a === 'number' && typeof b === 'number')) {
    return Number(a) - Number(b)
  }
  return String(a).localeCompare(String(b), locale, { numeric: true, sensitivity: 'base' })
}

export function DataTable<T extends Record<string, unknown>>({
  columns, data, keyField, loading, error, emptyMessage,
  onRowClick, onRowDoubleClick, rowClassName,
  density: densityProp, singleLineRows = false,
  tableId, toolbar, exportFileName, selectable, selectedKeys, onSelectionChange, bulkActions,
  rowActions, activeRowKey, onActiveRowChange, onRowActivate, pageSize, maxHeight, fill = false, showFooter, footerGroups,
}: DataTableProps<T>) {
  const { t, i18n } = useTranslation()
  const prefs = usePreferences()
  const persisted = useTableState(tableId)
  const effectiveEmpty = emptyMessage ?? t('common.noData')
  const density = densityProp ?? prefs.tableDensity
  const compact = density === 'compact'
  const cellPad = compact ? 'px-2 py-1.5' : 'px-3 py-2.5'
  // Compact başlık: iki satıra sarsa da alçak kalsın (fit-first, yatay kaydırma yok).
  const headPad = compact ? 'px-2 py-1 leading-tight' : cellPad
  const locale = i18n.language || 'tr'

  // ── Sıralama (tableId varsa kalıcı) ─────────────────────────────────
  const [localSort, setLocalSort] = useState<SortState>(null)
  const sort: SortState = tableId ? (persisted.sort ?? null) : localSort
  const setSort = (s: SortState) => (tableId ? setTableState(tableId, { sort: s }) : setLocalSort(s))
  const handleSort = (key: string) => {
    if (sort?.key !== key) setSort({ key, dir: 'asc' })
    else if (sort.dir === 'asc') setSort({ key, dir: 'desc' })
    else setSort(null)
  }

  // ── Kolon görünürlüğü ───────────────────────────────────────────────
  const hidden = useMemo(() => new Set(
    persisted.hidden ?? columns.filter((c) => c.defaultHidden).map((c) => String(c.key)),
  ), [persisted.hidden, columns])
  const visibleCols = columns.filter((c) => c.hideable === false || !hidden.has(String(c.key)))
  const toggleColumn = (key: string) => {
    const next = new Set(hidden)
    if (next.has(key)) next.delete(key); else next.add(key)
    setTableState(tableId, { hidden: [...next] })
  }

  const sorted = useMemo(() => {
    if (!sort) return data
    const col = columns.find((c) => String(c.key) === sort.key)
    if (!col) return data
    const dir = sort.dir === 'asc' ? 1 : -1
    return [...data].sort((a, b) => dir * compareValues(cellValue(a, col), cellValue(b, col), col.type, locale))
  }, [data, sort, columns, locale])

  // ── Sayfalama ───────────────────────────────────────────────────────
  const [page, setPage] = useState(0)
  const pageCount = pageSize ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1
  useEffect(() => { if (page >= pageCount) setPage(0) }, [page, pageCount])
  const pageRows = pageSize ? sorted.slice(page * pageSize, (page + 1) * pageSize) : sorted

  // ── Seçim ───────────────────────────────────────────────────────────
  const rowKey = useCallback((row: T) => row[keyField as string] as string | number, [keyField])
  const [innerSel, setInnerSel] = useState<(string | number)[]>([])
  const selection = selectedKeys ?? innerSel
  const setSelection = (keys: (string | number)[]) => { setInnerSel(keys); onSelectionChange?.(keys) }
  const canSelect = (row: T) => (typeof selectable === 'function' ? selectable(row) : !!selectable)
  const selSet = useMemo(() => new Set(selection), [selection])
  const selectableRows = selectable ? sorted.filter(canSelect) : []
  const allSelected = selectableRows.length > 0 && selectableRows.every((r) => selSet.has(rowKey(r)))
  const someSelected = selectableRows.some((r) => selSet.has(rowKey(r)))
  // Veri değişince artık olmayan satırlar seçimden düşer.
  useEffect(() => {
    if (!selectable || selection.length === 0) return
    const present = new Set(data.map(rowKey))
    const kept = selection.filter((k) => present.has(k))
    if (kept.length !== selection.length) setSelection(kept)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])
  const toggleRow = (row: T) => {
    const k = rowKey(row)
    setSelection(selSet.has(k) ? selection.filter((x) => x !== k) : [...selection, k])
  }
  const selectedRows = selectable ? data.filter((r) => selSet.has(rowKey(r))) : []

  // ── Klavye gezintisi (roving tabindex) ──────────────────────────────
  const bodyRef = useRef<HTMLTableSectionElement>(null)
  const [focusIdx, setFocusIdx] = useState(0)
  useEffect(() => {
    if (activeRowKey == null) return
    const i = pageRows.findIndex((r) => rowKey(r) === activeRowKey)
    if (i >= 0) setFocusIdx(i)
  }, [activeRowKey, pageRows, rowKey])
  const focusRow = (i: number) => {
    const clamped = Math.max(0, Math.min(pageRows.length - 1, i))
    setFocusIdx(clamped)
    const tr = bodyRef.current?.querySelectorAll<HTMLTableRowElement>('tr[data-row]')[clamped]
    tr?.focus()
    tr?.scrollIntoView({ block: 'nearest' })
    const row = pageRows[clamped]
    if (row) onActiveRowChange?.(row)
  }
  const activate = onRowActivate ?? onRowDoubleClick ?? onRowClick

  // ── Bağlam menüsü ───────────────────────────────────────────────────
  const [menu, setMenu] = useState<{ x: number; y: number; row: T } | null>(null)

  // ── Kolon seçici / dışa aktarma ─────────────────────────────────────
  const colBtn = useRef<HTMLButtonElement>(null)
  const [colOpen, setColOpen] = useState(false)
  const doExport = () => {
    const cols = visibleCols.filter((c) => c.exportValue !== false && c.header)
    downloadCsv(
      exportFileName!,
      cols.map((c) => c.header),
      sorted.map((r) => cols.map((c) => {
        const v = typeof c.exportValue === 'function' ? c.exportValue(r) : cellValue(r, c)
        if (v instanceof Date) return v.toLocaleDateString('tr-TR')
        return v as string | number | null | undefined
      })),
    )
  }

  const hasToolbar = !!(toolbar || tableId || exportFileName)
  const colCount = visibleCols.length + (selectable ? 1 : 0)
  const alignOf = (c: Column<T>) => c.align ?? (c.type === 'number' || c.type === 'money' ? 'right' : 'left')

  // ── Sabit kolonlar ──────────────────────────────────────────────────
  // Seçim kutusu varken sola sabit kolon onun sağına (w-8) yaslanır.
  const pinLeftOffset = selectable ? 'left-8' : 'left-0'
  const pinClass = (c: Column<T>, part: 'head' | 'body' | 'foot') => {
    if (!c.pin) return undefined
    const side = c.pin === 'left'
      ? cn('sticky', pinLeftOffset, 'shadow-[1px_0_0_hsl(var(--border))]')
      : 'sticky right-0 shadow-[-1px_0_0_hsl(var(--border))]'
    return cn(side, 'z-[1]', part !== 'body' && 'bg-muted')
  }
  const anyLeftPin = visibleCols.some((c) => c.pin === 'left')
  const checkboxPin = (part: 'head' | 'body') => (anyLeftPin ? cn('sticky left-0 z-[1]', part === 'head' && 'bg-muted') : undefined)

  // ── Alt toplam satırları (tek satır ya da grup başına) ──────────────
  const footerRows = useMemo((): { label: string; rows: T[] }[] => {
    if (!footerGroups) return [{ label: t('common.total'), rows: sorted }]
    const groups = new Map<string, T[]>()
    for (const r of sorted) {
      const g = footerGroups.by(r) || '—'
      const list = groups.get(g)
      if (list) list.push(r); else groups.set(g, [r])
    }
    const order = footerGroups.order ?? []
    const rank = (g: string) => { const i = order.indexOf(g); return i === -1 ? order.length : i }
    return [...groups.entries()]
      .sort(([a], [b]) => rank(a) - rank(b))
      .map(([g, rows]) => ({ label: `${t('common.total')} · ${g}`, rows }))
  }, [footerGroups, sorted, t])
  const footPad = compact ? 'px-2 py-1' : cellPad

  return (
    <div className={cn(fill ? 'flex h-full min-h-0 flex-col gap-2' : 'space-y-2')}>
      {hasToolbar && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {toolbar}
            {!loading && <span>{t('table.rowCount', { count: sorted.length })}</span>}
          </div>
          {exportFileName && (
            <Button size="xs" variant="outline" onClick={doExport} disabled={sorted.length === 0} title={t('table.exportHint')}>
              <Download className="h-3.5 w-3.5" /> {t('table.export')}
            </Button>
          )}
          {tableId && (
            <>
              <Button ref={colBtn} size="xs" variant="outline" aria-haspopup="dialog" aria-expanded={colOpen} onClick={() => setColOpen((o) => !o)}>
                <Columns3 className="h-3.5 w-3.5" /> {t('table.columns')}
              </Button>
              <Popover open={colOpen} onOpenChange={setColOpen} anchorRef={colBtn} align="end">
                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">{t('table.columns')}</div>
                {columns.filter((c) => c.hideable !== false && c.header).map((c) => (
                  <label key={String(c.key)} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent">
                    <Checkbox checked={!hidden.has(String(c.key))} onCheckedChange={() => toggleColumn(String(c.key))} />
                    {c.header}
                  </label>
                ))}
                <div className="mt-1 border-t pt-1">
                  <button type="button" className="w-full rounded px-2 py-1 text-left text-xs text-muted-foreground hover:bg-accent"
                    onClick={() => setTableState(tableId, { hidden: undefined, sort: null })}>
                    {t('table.resetLayout')}
                  </button>
                </div>
              </Popover>
            </>
          )}
        </div>
      )}

      {selectable && selectedRows.length > 0 && bulkActions && (
        <div className="sticky top-0 z-20 flex shrink-0 flex-wrap items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-1.5 text-sm" role="region" aria-label={t('table.bulkBar')}>
          <span className="font-medium">{t('table.selected', { count: selectedRows.length })}</span>
          <div className="flex flex-wrap items-center gap-2">{bulkActions(selectedRows, () => setSelection([]))}</div>
          <Button size="xs" variant="ghost" className="ml-auto" onClick={() => setSelection([])}>
            <X className="h-3.5 w-3.5" /> {t('table.clearSelection')}
          </Button>
        </div>
      )}

      <div className={cn('rounded-md border overflow-hidden', fill && 'flex min-h-0 flex-1 flex-col')}>
        {/* Round-11 §2 — fit-first: tablo viewport'a sığsın diye w-full; sütunlar
            daralır, başlıklar gerekirse sarar. maxHeight verilirse dikey kaydırma
            bu kapta olur ve başlık yapışkan kalır. */}
        <div className={cn('overflow-x-auto', (maxHeight || fill) && 'overflow-y-auto', fill && 'min-h-0 flex-1')} style={maxHeight ? { maxHeight } : undefined}>
          <table className={cn('w-full', compact ? 'text-xs' : 'text-sm')}>
            <thead className="sticky top-0 z-10 bg-muted">
              <tr>
                {selectable && (
                  <th className={cn(headPad, 'w-8', checkboxPin('head'))}>
                    <Checkbox
                      aria-label={t('table.selectAll')}
                      checked={allSelected}
                      ref={(el) => { if (el) el.indeterminate = !allSelected && someSelected }}
                      onCheckedChange={(c) => setSelection(c ? selectableRows.map(rowKey) : [])}
                    />
                  </th>
                )}
                {visibleCols.map((col) => {
                  const k = String(col.key)
                  const active = sort?.key === k
                  const align = alignOf(col)
                  return (
                    <th
                      key={k}
                      scope="col"
                      aria-sort={active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                      className={cn(headPad, 'font-medium text-muted-foreground', align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left', col.className, pinClass(col, 'head'))}
                    >
                      {col.sortable ? (
                        <button
                          type="button"
                          onClick={() => handleSort(k)}
                          className={cn('inline-flex items-center gap-1 rounded hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', align === 'right' && 'flex-row-reverse')}
                        >
                          {col.header}
                          <span className="text-muted-foreground/60">
                            {active
                              ? (sort!.dir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)
                              : <ChevronsUpDown className="h-3 w-3" />}
                          </span>
                        </button>
                      ) : col.header}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody ref={bodyRef}>
              {loading && data.length === 0 ? (
                // Faz 8.10 — Skeleton: 5 placeholder satır animasyonlu
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`sk-${i}`} className="border-t">
                    {Array.from({ length: colCount }).map((__, j) => (
                      <td key={j} className={cellPad}>
                        <div className="h-3 rounded bg-muted animate-pulse" style={{ width: `${50 + ((i + j) * 7) % 40}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : error && data.length === 0 ? (
                <tr>
                  <td colSpan={colCount} className="px-4 py-10">
                    <div className="flex flex-col items-center gap-2 text-destructive">
                      <AlertTriangle className="h-7 w-7 opacity-70" />
                      <p className="text-sm">{t('table.loadError')}</p>
                    </div>
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={colCount} className="px-4 py-12">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Inbox className="h-8 w-8 opacity-50" />
                      <p className="text-sm">{effectiveEmpty}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                pageRows.map((row, i) => {
                  const k = rowKey(row)
                  const isActive = activeRowKey != null && k === activeRowKey
                  const isSel = selSet.has(k)
                  // Sabit hücrelere satır tonunu taşır (bkz. PIN_BG); hover sınıfla.
                  const pinTint = isActive ? 'hsl(var(--accent))' : isSel ? 'hsl(var(--primary) / 0.05)' : undefined
                  return (
                    <tr
                      key={String(k)}
                      data-row
                      style={pinTint ? ({ '--pin-tint': pinTint } as React.CSSProperties) : undefined}
                      tabIndex={i === focusIdx ? 0 : -1}
                      aria-selected={selectable ? isSel : isActive || undefined}
                      className={cn(
                        'border-t transition-colors outline-none hover:bg-muted/40 hover:[--pin-tint:hsl(var(--muted)/0.4)] focus-visible:bg-accent/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                        (onRowClick || onRowDoubleClick || onActiveRowChange) && 'cursor-pointer',
                        isSel && 'bg-primary/5',
                        isActive && 'bg-accent ring-2 ring-inset ring-primary',
                        rowClassName?.(row),
                      )}
                      onFocus={() => setFocusIdx(i)}
                      onClick={(e) => {
                        // Buton / link / input içinden gelen click row-click'i tetiklemesin.
                        const el = e.target as HTMLElement
                        if (el.closest('button,a,input,select,textarea,[role="button"]')) return
                        setFocusIdx(i)
                        onActiveRowChange?.(row)
                        onRowClick?.(row)
                      }}
                      onDoubleClick={onRowDoubleClick ? (e) => {
                        const el = e.target as HTMLElement
                        if (el.closest('button,a,input,select,textarea,[role="button"]')) return
                        onRowDoubleClick(row)
                      } : undefined}
                      onContextMenu={rowActions?.length ? (e) => {
                        e.preventDefault()
                        setFocusIdx(i)
                        onActiveRowChange?.(row)
                        setMenu({ x: e.clientX, y: e.clientY, row })
                      } : undefined}
                      onKeyDown={(e) => {
                        if ((e.target as HTMLElement) !== e.currentTarget) return
                        if (e.key === 'ArrowDown') { e.preventDefault(); focusRow(i + 1) }
                        else if (e.key === 'ArrowUp') { e.preventDefault(); focusRow(i - 1) }
                        else if (e.key === 'Home') { e.preventDefault(); focusRow(0) }
                        else if (e.key === 'End') { e.preventDefault(); focusRow(pageRows.length - 1) }
                        else if (e.key === 'Enter' && activate) { e.preventDefault(); activate(row) }
                        else if (e.key === ' ' && selectable && canSelect(row)) { e.preventDefault(); toggleRow(row) }
                        else if ((e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) && rowActions?.length) {
                          e.preventDefault()
                          const r = e.currentTarget.getBoundingClientRect()
                          setMenu({ x: r.left + 24, y: r.bottom - 4, row })
                        }
                      }}
                    >
                      {selectable && (
                        <td className={cn(cellPad, 'w-8', checkboxPin('body'))} style={anyLeftPin ? PIN_BG : undefined}>
                          {canSelect(row) && (
                            <Checkbox aria-label={t('table.selectRow')} checked={isSel} onCheckedChange={() => toggleRow(row)} tabIndex={-1} />
                          )}
                        </td>
                      )}
                      {visibleCols.map((col) => {
                        const align = alignOf(col)
                        return (
                          <td
                            key={String(col.key)}
                            className={cn(
                              cellPad,
                              singleLineRows && 'whitespace-nowrap',
                              align === 'right' && 'text-right tabular-nums',
                              align === 'center' && 'text-center',
                              col.className,
                              pinClass(col, 'body'),
                            )}
                            style={col.pin ? PIN_BG : undefined}
                          >
                            {(() => {
                              let content: React.ReactNode
                              try {
                                if (col.render) content = col.render(row)
                                else {
                                  const v = row[col.key as string]
                                  content = v == null || v === '' ? '-' : String(v)
                                }
                              } catch {
                                content = '-'
                              }
                              if (!col.truncate) return content
                              const raw = cellValue(row, col)
                              return (
                                <div className="truncate" style={{ maxWidth: col.truncate }}
                                  title={raw == null || raw instanceof Date ? undefined : String(raw)}>
                                  {content}
                                </div>
                              )
                            })()}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })
              )}
            </tbody>
            {showFooter && sorted.length > 0 && visibleCols.some((c) => c.footer) && (
              <tfoot className="sticky bottom-0 z-10 bg-muted font-medium">
                {/* Hücreler tek satır (nowrap): dar para kolonunda tutar ile sembol
                    ayrı satırlara kırılmaz; çok dövizde her döviz kendi satırında. */}
                {footerRows.map((fr, gi) => (
                  <tr key={fr.label} className={cn(gi === 0 && 'border-t-2')}>
                    {selectable && <td className={cn(footPad, checkboxPin('head'))} />}
                    {visibleCols.map((col, j) => (
                      <td key={String(col.key)} className={cn(footPad, 'whitespace-nowrap', alignOf(col) === 'right' && 'text-right tabular-nums', col.className, pinClass(col, 'foot'))}>
                        {col.footer ? col.footer(fr.rows) : j === 0 ? fr.label : null}
                      </td>
                    ))}
                  </tr>
                ))}
              </tfoot>
            )}
          </table>
        </div>
        {pageSize && pageCount > 1 && (
          <div className="flex shrink-0 items-center justify-end gap-2 border-t px-3 py-1.5 text-xs text-muted-foreground">
            <span>{t('table.pageOf', { page: page + 1, count: pageCount })}</span>
            <Button size="icon-sm" variant="ghost" aria-label={t('common.previous')} disabled={page === 0} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button size="icon-sm" variant="ghost" aria-label={t('common.next')} disabled={page >= pageCount - 1} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {menu && rowActions && (
        <ContextMenu x={menu.x} y={menu.y} row={menu.row} actions={rowActions} onClose={() => setMenu(null)} />
      )}
    </div>
  )
}

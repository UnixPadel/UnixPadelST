import { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown, Inbox } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

export interface Column<T> {
  key: keyof T | string
  header: string
  render?: (row: T) => React.ReactNode
  sortable?: boolean
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyField: keyof T
  loading?: boolean
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
   * PROMPT-v6 §6 — yoğunluk geçişi. 'compact': px-2 py-2 hücre, text-xs,
   * başlıklar iki satıra sarabilir. Geniş gridler (Kontrol/Tahsilat/Arama/
   * Burcu) opt-in eder; default 'normal' mevcut sayfaları değiştirmez.
   */
  density?: 'normal' | 'compact'
  /**
   * Veri hücrelerini tek satıra zorlar (whitespace-nowrap). Sidebar (hamburger)
   * açılıp yatay alan daralınca yoğun gridlerde hücreler sarıp bir sipariş
   * birden çok satıra yayılıyordu; bu opt-in ile her satır tek satır kalır,
   * taşma overflow-x-auto ile yatay kaydırmaya düşer. Başlıklar sarmaya devam
   * eder (kolonlar dar kalsın diye). Default kapalı → mevcut sayfalar değişmez.
   */
  singleLineRows?: boolean
}

type SortDir = 'asc' | 'desc' | null

export function DataTable<T extends Record<string, unknown>>({
  columns, data, keyField, loading, emptyMessage,
  onRowClick, onRowDoubleClick, rowClassName,
  density = 'normal', singleLineRows = false,
}: DataTableProps<T>) {
  const { t, i18n } = useTranslation()
  const effectiveEmpty = emptyMessage ?? t('common.noData')
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>(null)

  const compact = density === 'compact'
  const cellPad = compact ? 'px-2 py-2' : 'px-4 py-3'

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : d === 'desc' ? null : 'asc'))
      if (sortDir === 'desc') setSortKey(null)
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return data
    return [...data].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      if (av == null) return 1
      if (bv == null) return -1
      const cmp = String(av).localeCompare(String(bv), i18n.language || 'tr', { numeric: true })
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [data, sortKey, sortDir])

  return (
    <div className="rounded-md border overflow-hidden">
      {/* Round-11 §2 — fit-first: tablo viewport'a sığsın diye w-full (min-w-max yok);
          sütunlar daralır, başlıklar gerekirse sarar. Sığmayan aşırı geniş tablolar
          için overflow-x-auto son çare olarak kalır (sayfa düzeyinde scroll çıkmaz). */}
      <div className="overflow-x-auto">
        <table className={cn('w-full', compact ? 'text-xs' : 'text-sm')}>
          <thead className="bg-muted/50">
            <tr>
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className={cn(
                    cellPad,
                    'text-left font-medium text-muted-foreground',
                    // Round-11 §2 — fit-first: başlıklar her yoğunlukta sarabilir ki
                    // sütunlar viewport'a sığsın (eski nowrap geniş min-width dayatıyordu).
                    col.sortable && 'cursor-pointer select-none hover:text-foreground',
                    col.className
                  )}
                  onClick={() => col.sortable && handleSort(String(col.key))}
                >
                  <div className="flex items-center gap-1">
                    {col.header}
                    {col.sortable && (
                      <span className="text-muted-foreground/60">
                        {sortKey === col.key ? (
                          sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronsUpDown className="h-3 w-3" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              // Faz 8.10 — Skeleton: 5 placeholder satır animasyonlu
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`sk-${i}`} className="border-t">
                  {columns.map((c, j) => (
                    <td key={j} className={cellPad}>
                      <div className="h-3 rounded bg-muted animate-pulse" style={{ width: `${50 + ((i + j) * 7) % 40}%` }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Inbox className="h-8 w-8 opacity-50" />
                    <p className="text-sm">{effectiveEmpty}</p>
                  </div>
                </td>
              </tr>
            ) : (
              sorted.map((row) => (
                <tr
                  key={String(row[keyField as string])}
                  className={cn(
                    'border-t hover:bg-muted/30 transition-colors',
                    (onRowClick || onRowDoubleClick) && 'cursor-pointer',
                    rowClassName?.(row),
                  )}
                  onClick={
                    onRowClick
                      ? (e) => {
                          // Buton / link / input içinden gelen click row-click'i tetiklemesin.
                          const el = e.target as HTMLElement
                          if (el.closest('button,a,input,select,textarea,[role="button"]')) return
                          onRowClick(row)
                        }
                      : undefined
                  }
                  onDoubleClick={
                    onRowDoubleClick
                      ? (e) => {
                          const el = e.target as HTMLElement
                          if (el.closest('button,a,input,select,textarea,[role="button"]')) return
                          onRowDoubleClick(row)
                        }
                      : undefined
                  }
                >
                  {columns.map((col) => (
                    <td key={String(col.key)} className={cn(cellPad, singleLineRows && 'whitespace-nowrap', col.className)}>
                      {(() => {
                        try {
                          return col.render
                            ? col.render(row)
                            : String(row[col.key as string] ?? '-')
                        } catch {
                          return '-'
                        }
                      })()}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

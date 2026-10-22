import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { FileSpreadsheet, FileText, Eye } from 'lucide-react'
import { getOrders, downloadExcel, downloadPdf } from '@/api/orders'
import { PageHeader } from '@/components/PageHeader'
import { DataTable, type Column } from '@/components/DataTable'
import { StatusBadge } from '@/components/StatusBadge'
import { MasterDetailLayout } from '@/components/MasterDetailLayout'
import { FilterBar, FilterField, ALL, useFilterState } from '@/components/FilterBar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ToastProvider'
import { toastApiError } from '@/lib/apiError'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import { sumByCurrency } from '@/lib/export'
import { statusLabel } from '@/lib/status'
import { trLower } from '@/components/ui/combobox'
import type { OrderListDto } from '@/types'

type Row = OrderListDto & Record<string, unknown>
const FILTER_DEFAULTS = { q: '', asama: ALL, paraTipi: ALL }

/**
 * Muhasebe — Teklif / Sipariş görüntüleme (salt-okunur).
 * Tüm teklif + siparişler; proforma (Excel/PDF) açılabilir; revize YOK; silinenler gizli.
 * Bu turda: hesaplanan "No" kolonu artık sıralanıyor (sortValue), 1000 satır
 * istemci tarafında sayfalanıyor, indirmeler bekleme/hata geri bildirimi veriyor,
 * detay sağ panelde, döviz bazlı alt toplam ve görünüm dışa aktarma.
 */
export function AccountingOrdersViewPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [activeNo, setActiveNo] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const { values: f, set, setAll, reset } = useFilterState(FILTER_DEFAULTS)

  const { data: page, isLoading, isError } = useQuery({
    queryKey: ['accounting-orders-view'],
    // Geniş sayfa — muhasebe tüm teklif/siparişleri tek listede görür.
    queryFn: () => getOrders({ pageSize: 1000, page: 1 }),
  })

  const no = (r: OrderListDto) => r.siparisNo || r.teklifNo
  const all = useMemo(() => (page?.items ?? []).filter((o) => !o.silindi), [page])
  const stages = useMemo(() => Array.from(new Set(all.map((o) => o.siparisMiTeklifMi))).sort(), [all])
  const rows = useMemo(() => {
    const q = trLower(f.q.trim())
    return all.filter((o) =>
      (!q || [o.siparisNo, o.teklifNo, o.musteriAd].some((x) => trLower(x ?? '').includes(q))) &&
      (f.asama === ALL || o.siparisMiTeklifMi === f.asama) &&
      (f.paraTipi === ALL || o.paraTipi === f.paraTipi))
  }, [all, f])

  const download = async (kind: 'excel' | 'pdf', n: string) => {
    setBusy(kind + n)
    try {
      await (kind === 'excel' ? downloadExcel(n) : downloadPdf(n))
      toast({ title: kind === 'excel' ? t('orderDetail.excelDownloaded') : t('orderDetail.pdfDownloaded'), description: n, variant: 'success' })
    } catch (e) {
      toastApiError(toast, t('common.error'), e)
    } finally {
      setBusy(null)
    }
  }

  const cols: Column<Row>[] = [
    { key: 'no', header: t('common.orderNo'), sortable: true, hideable: false, sortValue: (r) => no(r), exportValue: (r) => no(r),
      render: (r) => <span className="font-mono">{no(r)}</span> },
    { key: 'musteriAd', header: t('common.customer'), sortable: true },
    { key: 'mUlke', header: t('common.country'), sortable: true, render: (r) => (r.mUlke as string) ?? '—' },
    { key: 'siparisMiTeklifMi', header: t('accountingFull.cols.asama'), sortable: true,
      render: (r) => <StatusBadge value={r.siparisMiTeklifMi} context="stage" /> },
    { key: 'paraTipi', header: t('common.currency'), sortable: true },
    { key: 'toplamFiyat', header: t('common.totalAmount'), sortable: true, type: 'money',
      render: (r) => formatCurrency(r.toplamFiyat ?? 0, r.paraTipi),
      footer: (rs) => sumByCurrency(rs, (x) => x.toplamFiyat, (x) => x.paraTipi).map(([c, v]) => formatCurrency(v, c)).join(' · ') },
    { key: 'tarih', header: t('common.date'), sortable: true, type: 'date', render: (r) => formatDateShort(r.tarih ?? '-') },
    {
      key: 'actions', header: t('common.actions'), hideable: false, exportValue: false,
      render: (r) => {
        const n = no(r)
        return (
          <div className="flex gap-1">
            <Button size="icon-sm" variant="outline" title={t('common.excel')} aria-label={t('common.excel')}
              loading={busy === 'excel' + n} onClick={() => download('excel', n)}>{busy !== 'excel' + n && <FileSpreadsheet className="h-3.5 w-3.5" />}</Button>
            <Button size="icon-sm" variant="outline" title="PDF" aria-label="PDF"
              loading={busy === 'pdf' + n} onClick={() => download('pdf', n)}>{busy !== 'pdf' + n && <FileText className="h-3.5 w-3.5" />}</Button>
          </div>
        )
      },
    },
  ]

  return (
    <div>
      <PageHeader title={t('nav.accountingOrders')} description={t('accounting.ordersViewDescription')} />
      <div className="space-y-2 p-3">
        <FilterBar onReset={reset} tableId="accounting-orders-view" values={f} onApplyView={(v) => setAll(v as typeof FILTER_DEFAULTS)}>
          <FilterField label={t('accounting.filter.search')}>
            <Input inputSize="sm" placeholder={t('common.quickFilter')} value={f.q} onChange={(e) => set('q', e.target.value)} />
          </FilterField>
          <FilterField label={t('accountingFull.cols.asama')}>
            <Select value={f.asama} onValueChange={(v) => set('asama', v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('common.all')}</SelectItem>
                {stages.map((s) => <SelectItem key={s} value={s}>{statusLabel(t, s)}</SelectItem>)}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label={t('common.currency')}>
            <Select value={f.paraTipi} onValueChange={(v) => set('paraTipi', v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('common.all')}</SelectItem>
                {['Euro', 'Dolar', 'TL', 'Sterlin'].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </FilterField>
        </FilterBar>
        <MasterDetailLayout siparisNo={activeNo} onClose={() => setActiveNo(null)}>
          <DataTable
            tableId="accounting-orders-view"
            exportFileName="teklif-siparis"
            columns={cols}
            data={rows as Row[]}
            keyField="siparisAlID"
            loading={isLoading}
            error={isError}
            density="compact"
            pageSize={100}
            showFooter
            activeRowKey={rows.find((r) => no(r) === activeNo)?.siparisAlID ?? null}
            onActiveRowChange={(r) => setActiveNo(no(r))}
            rowActions={[
              { key: 'detail', label: t('common.details'), shortcut: 'Enter', icon: <Eye className="h-3.5 w-3.5" />, onSelect: (r) => setActiveNo(no(r)) },
              { key: 'excel', label: t('common.excel'), icon: <FileSpreadsheet className="h-3.5 w-3.5" />, onSelect: (r) => download('excel', no(r)) },
              { key: 'pdf', label: 'PDF', icon: <FileText className="h-3.5 w-3.5" />, onSelect: (r) => download('pdf', no(r)) },
            ]}
          />
        </MasterDetailLayout>
      </div>
    </div>
  )
}

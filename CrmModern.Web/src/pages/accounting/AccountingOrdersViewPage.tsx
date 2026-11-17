import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { FileSpreadsheet, FileText, Eye, FolderOpen, Plus } from 'lucide-react'
import { getOrders, downloadExcel, downloadPdf } from '@/api/orders'
import { PageHeader } from '@/components/PageHeader'
import { FillPage } from '@/components/FillPage'
import { DataTable, type Column } from '@/components/DataTable'
import { StatusBadge } from '@/components/StatusBadge'
import { OrderDetailModal } from '@/components/OrderDetailModal'
import { OrderWorkPanel } from '@/components/order/OrderWorkPanel'
import { MasterDetailLayout } from '@/components/MasterDetailLayout'
import { useAutoSelectFirst } from '@/hooks/useAutoSelectFirst'
import { FilterBar, FilterField, ALL, useFilterState, moreFilterCount } from '@/components/FilterBar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ToastProvider'
import { toastApiError } from '@/lib/apiError'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import { sumOf } from '@/lib/export'
import { PARA_TIPLERI } from '@/lib/orderForm'
import { statusLabel } from '@/lib/status'
import { trLower } from '@/components/ui/combobox'
import type { OrderListDto } from '@/types'
import { AccountingFolderButton, AccountingFolderDialog, useFolderCounts } from '@/components/order/AccountingFolder'
import { canManageAccountingFolder } from '@/lib/permissions'
import { useAuth } from '@/hooks/useAuth'

type Row = OrderListDto & Record<string, unknown>
const FILTER_DEFAULTS = { q: '', asama: ALL, paraTipi: ALL, klasor: ALL }

/**
 * Muhasebe · Klasörler — her teklif/siparişin Muhasebe Klasörü'ne giriş noktası.
 * "Klasör" sütunu muhasebe eki sayısını gösterir (tıklayınca klasör açılır); "+"
 * klasörü dosya seçiciyle birlikte açar (toplu dosyalama). "Klasör: Dosyası
 * olmayan" filtresi belgesi eksik siparişleri bulur. Proforma Excel/PDF klasörün
 * içinde ve sağ tık menüsünde.
 *
 * (Eski açıklama) Muhasebe — Teklif / Sipariş görüntüleme (salt-okunur).
 * Tüm teklif + siparişler; proforma (Excel/PDF) açılabilir; revize YOK; silinenler gizli.
 * Bu turda: hesaplanan "No" kolonu artık sıralanıyor (sortValue), 1000 satır
 * istemci tarafında sayfalanıyor, indirmeler bekleme/hata geri bildirimi veriyor,
 * "Siparişi Aç" / satıra tıklama Sipariş Detayı penceresini açar, döviz bazlı
 * alt toplam ve görünüm dışa aktarma.
 */
export function AccountingOrdersViewPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [activeNo, setActiveNo] = useState<string | null>(null)
  // 4.1 — "Tam ekran": aynı sipariş büyük pencerede.
  const [expandedNo, setExpandedNo] = useState<string | null>(null)
  const [folder, setFolder] = useState<{ no: string; pick: boolean } | null>(null)
  const { getUser } = useAuth()
  const canAdd = canManageAccountingFolder(getUser())
  const { data: counts = {} } = useFolderCounts()
  const countOf = (r: OrderListDto) => counts[r.siparisNo] ?? 0
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
      (f.paraTipi === ALL || o.paraTipi === f.paraTipi) &&
      (f.klasor === ALL || (f.klasor === 'has') === ((counts[o.siparisNo] ?? 0) > 0)))
  }, [all, f, counts])

  const download = async (kind: 'excel' | 'pdf', n: string) => {
    try {
      await (kind === 'excel' ? downloadExcel(n) : downloadPdf(n))
      toast({ title: kind === 'excel' ? t('orderDetail.excelDownloaded') : t('orderDetail.pdfDownloaded'), description: n, variant: 'success' })
    } catch (e) {
      toastApiError(toast, t('common.error'), e)
    }
  }

  const cols: Column<Row>[] = [
    { key: 'no', pin: 'left', header: t('common.orderNo'), sortable: true, hideable: false, sortValue: (r) => no(r), exportValue: (r) => no(r),
      render: (r) => <span className="font-mono">{no(r)}</span> },
    { key: 'musteriAd', truncate: '10rem', header: t('common.customer'), sortable: true },
    { key: 'mUlke', header: t('common.country'), sortable: true, defaultHidden: true, render: (r) => (r.mUlke as string) ?? '—' },
    { key: 'siparisMiTeklifMi', header: t('accountingFull.cols.asama'), sortable: true, defaultHidden: true,
      render: (r) => <StatusBadge value={r.siparisMiTeklifMi} context="stage" /> },
    { key: 'paraTipi', header: t('common.currency'), sortable: true, defaultHidden: true },
    { key: 'toplamFiyat', header: t('common.totalAmount'), sortable: true, type: 'money',
      render: (r) => formatCurrency(r.toplamFiyat ?? 0, r.paraTipi),
      // Döviz başına ayrı alt toplam satırı (footerGroups).
      footer: (rs) => formatCurrency(sumOf(rs, (x) => x.toplamFiyat), rs[0]?.paraTipi) },
    { key: 'tarih', header: t('common.date'), sortable: true, type: 'date', defaultHidden: true, render: (r) => formatDateShort(r.tarih ?? '-') },
    { key: 'klasor', header: t('folder.column'), sortable: true, sortValue: (r) => countOf(r), exportValue: (r) => countOf(r),
      render: (r) => <AccountingFolderButton compact siparisNo={r.siparisNo} onClick={() => setFolder({ no: no(r), pick: false })} /> },
    // Satır başına buton yok: seçili siparişin klasörü sağ panelin altından açılır.
  ]

  // Liste yüklenince ilk sipariş seçilir; sağ panel hep dolu.
  useAutoSelectFirst(rows.map(no), activeNo, setActiveNo, isLoading)
  const activeRow = rows.find((r) => no(r) === activeNo) ?? null
  const activeCount = activeRow ? countOf(activeRow) : 0
  // Bu ekranın işi klasör: tek ana buton klasörü açar; dosya ekleme ikincil.
  const panelFooter = activeRow && activeNo ? (
    // Tek satır: ana buton geniş, "Dosya ekle" yanında ikincil (önceden ayrı satırdı).
    <div className="flex items-center gap-2">
      <Button size="lg" className="min-w-0 flex-1" onClick={() => setFolder({ no: activeNo, pick: false })}>
        <FolderOpen className="h-4 w-4" aria-hidden />
        {activeCount > 0 ? t('folder.buttonWithCount', { count: activeCount }) : t('folder.buttonEmpty')}
      </Button>
      {canAdd && (
        <Button size="lg" variant="outline" className="shrink-0" onClick={() => setFolder({ no: activeNo, pick: true })}>
          <Plus className="h-4 w-4" aria-hidden /> {t('folder.addFile')}
        </Button>
      )}
    </div>
  ) : undefined

  return (
    // Scaling Faz 2 — FillPage: sayfa kaymaz, tablo kalan yüksekliği doldurur
    // (başlık + araç çubuğu yerinde kalır).
    <FillPage>
      <PageHeader density="compact" title={t('nav.accountingOrders')} description={t('accounting.ordersViewDescription')} />
      {/* 4.1 (K7) — liste solda, sipariş detayı sağda (önceden modal listeyi kapatıyordu). */}
      <MasterDetailLayout
        pageId="accounting-orders-view"
        open
        defaultShare={0.42}
        onExpand={activeNo ? () => setExpandedNo(activeNo) : undefined}
        title={activeNo ? t('orderDetail.title', { no: activeNo }) : t('masterDetail.panel')}
        detail={<OrderWorkPanel siparisNo={activeNo} emptyText={t(rows.length ? 'masterDetail.selectHint' : 'masterDetail.emptyList')} footer={panelFooter} />}
        list={<>
        {/* Filtreler yalnız listeyi süzer: liste sütununun üstünde durur, sağ panel sayfa başlığının hemen altından başlar. */}
        <FilterBar className="mb-2 shrink-0" onReset={reset} tableId="accounting-orders-view" values={f} onApplyView={(v) => setAll(v as typeof FILTER_DEFAULTS)}
          primaryCount={2} moreActiveCount={moreFilterCount(f, FILTER_DEFAULTS, ['q', 'asama'])}>
          <FilterField label={t('accounting.filter.search')}>
            <Input inputSize="sm" placeholder={t('common.quickFilter')} value={f.q} onChange={(e) => set('q', e.target.value)} />
          </FilterField>
          <FilterField label={t('accountingFull.cols.asama')}>
            <Select value={f.asama} onValueChange={(v) => set('asama', v)}>
              <SelectTrigger size="sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('common.all')}</SelectItem>
                {stages.map((s) => <SelectItem key={s} value={s}>{statusLabel(t, s)}</SelectItem>)}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label={t('common.currency')}>
            <Select value={f.paraTipi} onValueChange={(v) => set('paraTipi', v)}>
              <SelectTrigger size="sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('common.all')}</SelectItem>
                {['Euro', 'Dolar', 'TL', 'Sterlin'].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label={t('folder.column')}>
            <Select value={f.klasor} onValueChange={(v) => set('klasor', v)}>
              <SelectTrigger size="sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('common.all')}</SelectItem>
                <SelectItem value="has">{t('folder.filterHas')}</SelectItem>
                <SelectItem value="none">{t('folder.filterNone')}</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>
        </FilterBar>
        <DataTable
          fill
          tableId="accounting-orders-view-v2"
          rowGoneNotice={false}
          actionBar={false}
          exportFileName="teklif-siparis"
          columns={cols}
          data={rows as Row[]}
          keyField="siparisAlID"
          loading={isLoading}
          error={isError}
          pageSize={100}
          showFooter
          footerGroups={{ by: (r) => r.paraTipi, order: PARA_TIPLERI }}
          activeRowKey={rows.find((r) => no(r) === activeNo)?.siparisAlID ?? null}
          // Satıra tıklama (ve Enter) "Siparişi Aç" ile aynı: Sipariş Detayı penceresi.
          onRowClick={(r) => setActiveNo(no(r))}
          rowLabel={(r) => `${no(r)} · ${(r as { musteriAd?: string }).musteriAd ?? ''}`}
          rowActions={[
            { key: 'detail', label: t('common.openOrder'), shortcut: 'Enter', icon: <Eye className="h-3.5 w-3.5" />, onSelect: (r) => setActiveNo(no(r)) },
            { key: 'folder', label: t('folder.button'), icon: <FolderOpen className="h-3.5 w-3.5" />, onSelect: (r) => setFolder({ no: no(r), pick: false }) },
            ...(canAdd ? [{ key: 'addFile', label: t('folder.addFile'), icon: <Plus className="h-3.5 w-3.5" />, onSelect: (r: Row) => setFolder({ no: no(r), pick: true }) }] : []),
            { key: 'excel', label: t('common.excel'), icon: <FileSpreadsheet className="h-3.5 w-3.5" />, separatorBefore: true, onSelect: (r) => download('excel', no(r)) },
            { key: 'pdf', label: 'PDF', icon: <FileText className="h-3.5 w-3.5" />, onSelect: (r) => download('pdf', no(r)) },
          ]}
        />
        </>}
      />

      <OrderDetailModal siparisNo={expandedNo} onClose={() => setExpandedNo(null)} />
      <AccountingFolderDialog siparisNo={folder?.no ?? null} autoPick={folder?.pick} onClose={() => setFolder(null)} />
    </FillPage>
  )
}

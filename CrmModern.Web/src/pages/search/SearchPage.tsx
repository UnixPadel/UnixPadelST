import { useEffect, useMemo, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { Eye } from 'lucide-react'
import { findOrders, type OrderSearchParams } from '@/api/search'
import { DataTable, type Column } from '@/components/DataTable'
import { FillPage } from '@/components/FillPage'
import { ALL, FilterBar, FilterField, moreFilterCount, useFilterState } from '@/components/FilterBar'
import { MasterDetailLayout } from '@/components/MasterDetailLayout'
import { OrderDetailModal } from '@/components/OrderDetailModal'
import { OrderStatusBadge, orderStatusText } from '@/components/order/OrderStatusBadge'
import { PageHeader } from '@/components/PageHeader'
import { useShortcutHints } from '@/components/StatusBar'
import { StatusBadge } from '@/components/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/hooks/useAuth'
import { useAutoSelectFirst } from '@/hooks/useAutoSelectFirst'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { kontrolLabel, stageLabel } from '@/lib/status'
import { formatCurrency, formatDate } from '@/lib/utils'
import { hideMoneyFor } from '@/lib/visibility'
import type { OrderSearchHit } from '@/types'
import { SearchResultPanel } from './SearchResultPanel'

type Row = OrderSearchHit & Record<string, unknown>

const TYPES = ['Teklif', 'Siparis']
const STAGES = ['Teklif', 'Siparis', 'Planlama', 'Uretim', 'Hazir', 'Lojistik', 'TamamlanmaBekliyor', 'Tamamlandi', 'Iptal']
const CONTROLS = ['Kontrol', 'Onay', 'Reddet']
const MIN_QUERY = 2

const FILTER_DEFAULTS = { q: '', tur: ALL, asama: ALL, kontrol: ALL, ulke: '', baslangic: '', bitis: '' }
type Filters = typeof FILTER_DEFAULTS

const canSearch = (f: Filters) =>
  f.q.trim().length >= MIN_QUERY
  || f.tur !== ALL || f.asama !== ALL || f.kontrol !== ALL
  || !!f.ulke.trim() || !!f.baslangic || !!f.bitis

const toParams = (f: Filters): OrderSearchParams => ({
  q: f.q.trim() || undefined,
  tur: f.tur !== ALL ? f.tur : undefined,
  asama: f.asama !== ALL ? f.asama : undefined,
  kontrol: f.kontrol !== ALL ? f.kontrol : undefined,
  ulke: f.ulke.trim() || undefined,
  baslangic: f.baslangic || undefined,
  bitis: f.bitis || undefined,
})

/**
 * Sipariş Ara — tek kutudan teklif ve sipariş araması. Liste solda; sağ panel kaydın
 * türünü, aşamasını, kimde beklediğini ve hangi ekranda bulunacağını gösterir.
 * Tüm ayrıntı "Siparişi Aç" penceresindedir (kullanıcı kararı, design.md Bölüm 8).
 */
export function SearchPage() {
  const { t } = useTranslation()
  const { getUser } = useAuth()
  const hideMoney = hideMoneyFor(getUser())
  const [params, setParams] = useSearchParams()
  const { values: f, set, setAll, reset } = useFilterState(FILTER_DEFAULTS)
  const filter = useDebouncedValue(f, 300)
  const searchable = canSearch(filter)

  const [activeNo, setActiveNo] = useState<string | null>(() => params.get('sel'))
  const [openNo, setOpenNo] = useState<string | null>(null)

  // Üst arama kutusundan gelen seçim bir kez uygulanır; sonraki aramaları etkilemez.
  useEffect(() => {
    const sel = params.get('sel')
    if (!sel) return
    setActiveNo(sel)
    setParams((p) => { const np = new URLSearchParams(p); np.delete('sel'); return np }, { replace: true })
  }, [params, setParams])

  const { data, isLoading, isError, isPlaceholderData, dataUpdatedAt, refetch } = useQuery({
    queryKey: ['order-search', filter],
    queryFn: ({ signal }) => findOrders(toParams(filter), signal),
    enabled: searchable,
    placeholderData: keepPreviousData,
    retry: false,
  })

  const rows = useMemo(() => (searchable ? data?.sonuclar ?? [] : []), [searchable, data])
  const total = searchable ? data?.toplam ?? 0 : 0

  useAutoSelectFirst(rows.map((r) => r.siparisNo), activeNo, setActiveNo, isLoading || isPlaceholderData)
  const active = rows.find((r) => r.siparisNo === activeNo) ?? null

  useShortcutHints([
    { keys: '↑↓', label: t('shortcuts.moveRow') },
    { keys: 'Enter', label: t('common.openOrder') },
  ])

  // Arama kutusundan çıkmadan sonuçlar arasında gezilir, Enter seçili kaydı açar.
  const onQueryKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (active) setOpenNo(active.siparisNo)
      return
    }
    if ((e.key !== 'ArrowDown' && e.key !== 'ArrowUp') || rows.length === 0) return
    e.preventDefault()
    const current = rows.findIndex((r) => r.siparisNo === activeNo)
    const next = Math.max(0, Math.min(rows.length - 1, current + (e.key === 'ArrowDown' ? 1 : -1)))
    setActiveNo(rows[next].siparisNo)
  }

  const statusText = (r: OrderSearchHit) => orderStatusText(t, r)
  const matchedText = (r: OrderSearchHit) => r.eslesen.map((code) => t(`search.fields.${code}`)).join(', ')

  const columns: Column<Row>[] = [
    {
      key: 'belgeNo', pin: 'left', hideable: false, sortable: true, header: t('search.documentNo'),
      render: (r) => <span className="font-mono text-xs tracking-tight">{r.belgeNo}</span>,
    },
    { key: 'musteriAd', truncate: '7rem', sortable: true, header: t('common.customer') },
    {
      key: 'tur', sortable: true, header: t('search.type'),
      sortValue: (r) => stageLabel(t, r.tur), exportValue: (r) => stageLabel(t, r.tur),
      render: (r) => <StatusBadge value={r.tur} context="stage" />,
    },
    {
      key: 'durum', sortable: true, header: t('common.status'),
      sortValue: statusText, exportValue: statusText,
      render: (r) => <OrderStatusBadge order={r} />,
    },
    ...(!hideMoney ? [{
      key: 'toplamFiyat', type: 'money', sortable: true, header: t('common.totalAmount'),
      render: (r) => (r.toplamFiyat == null
        ? '—'
        : <span className="whitespace-nowrap">{formatCurrency(r.toplamFiyat, r.paraTipi)}</span>),
    } satisfies Column<Row>] : []),
    { key: 'ulke', sortable: true, defaultHidden: true, header: t('common.country'), render: (r) => r.ulke ?? '—' },
    { key: 'temsilci', sortable: true, defaultHidden: true, truncate: '10rem', header: t('common.representative'), render: (r) => r.temsilci ?? '—' },
    { key: 'tarih', type: 'date', sortable: true, defaultHidden: true, header: t('common.date'), render: (r) => formatDate(r.tarih) },
    {
      key: 'kontrol', sortable: true, defaultHidden: true, header: t('common.control'),
      sortValue: (r) => kontrolLabel(t, r.kontrol), exportValue: (r) => kontrolLabel(t, r.kontrol),
      render: (r) => <StatusBadge value={r.kontrol} context="kontrol" />,
    },
    {
      key: 'eslesen', defaultHidden: true, truncate: '10rem', header: t('search.matchedField'),
      sortValue: matchedText, exportValue: matchedText, render: matchedText,
    },
  ]

  const panelEmpty = !searchable
    ? t('search.startPanel')
    : t(rows.length ? 'masterDetail.selectHint' : 'search.noResults')

  return (
    <FillPage>
      <PageHeader density="compact" title={t('search.title')} description={t('search.subtitle')} />
      <MasterDetailLayout
        pageId="search"
        open
        defaultShare={0.4}
        panelLabel={t('search.panel')}
        title={active ? <span className="font-mono text-xs">{active.belgeNo}</span> : t('search.panel')}
        list={<>
          <FilterBar
            className="mb-2 shrink-0"
            onReset={reset}
            tableId="search"
            values={f}
            onApplyView={(v) => setAll(v as Filters)}
            primaryCount={1}
            moreActiveCount={moreFilterCount(f, FILTER_DEFAULTS, ['q'])}
          >
            <FilterField label={t('search.queryLabel')} className="col-span-2">
              <Input
                inputSize="sm"
                autoFocus
                value={f.q}
                onChange={(e) => set('q', e.target.value)}
                onKeyDown={onQueryKey}
                placeholder={t('search.placeholder')}
                aria-label={t('search.placeholder')}
              />
            </FilterField>
            <FilterField label={t('search.type')}>
              <Select value={f.tur} onValueChange={(v) => set('tur', v)}>
                <SelectTrigger size="sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t('common.all')}</SelectItem>
                  {TYPES.map((s) => <SelectItem key={s} value={s}>{stageLabel(t, s)}</SelectItem>)}
                </SelectContent>
              </Select>
            </FilterField>
            <FilterField label={t('common.stage')}>
              <Select value={f.asama} onValueChange={(v) => set('asama', v)}>
                <SelectTrigger size="sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t('common.all')}</SelectItem>
                  {STAGES.map((s) => <SelectItem key={s} value={s}>{stageLabel(t, s)}</SelectItem>)}
                </SelectContent>
              </Select>
            </FilterField>
            <FilterField label={t('common.control')}>
              <Select value={f.kontrol} onValueChange={(v) => set('kontrol', v)}>
                <SelectTrigger size="sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t('common.all')}</SelectItem>
                  {CONTROLS.map((c) => <SelectItem key={c} value={c}>{kontrolLabel(t, c)}</SelectItem>)}
                </SelectContent>
              </Select>
            </FilterField>
            <FilterField label={t('common.country')}>
              <Input inputSize="sm" value={f.ulke} onChange={(e) => set('ulke', e.target.value)} />
            </FilterField>
            <FilterField label={t('common.startDate')}>
              <Input inputSize="sm" type="date" value={f.baslangic} onChange={(e) => set('baslangic', e.target.value)} />
            </FilterField>
            <FilterField label={t('common.endDate')}>
              <Input inputSize="sm" type="date" value={f.bitis} onChange={(e) => set('bitis', e.target.value)} />
            </FilterField>
          </FilterBar>
          <DataTable
            fill
            // Beş sütun referans ekranda yatay kaymadan sığsın.
            density="compact"
            tableId="search-v2"
            exportFileName="siparis-arama"
            columns={columns}
            data={rows as Row[]}
            keyField="siparisNo"
            loading={searchable && isLoading}
            error={searchable && isError}
            emptyMessage={searchable ? t('search.noResults') : t('search.startHint')}
            updatedAt={searchable ? dataUpdatedAt : undefined}
            onRefresh={searchable ? () => void refetch() : undefined}
            toolbar={total > rows.length
              ? <Badge variant="warning">{t('search.truncated', { shown: rows.length, total })}</Badge>
              : undefined}
            activeRowKey={activeNo}
            onRowClick={(r) => setActiveNo(r.siparisNo)}
            onActiveRowChange={(r) => setActiveNo(r.siparisNo)}
            onRowDoubleClick={(r) => setOpenNo(r.siparisNo)}
            onRowActivate={(r) => setOpenNo(r.siparisNo)}
            actionBar={false}
            rowGoneNotice={false}
            rowActions={[{
              key: 'open', label: t('common.openOrder'), shortcut: 'Enter',
              icon: <Eye className="h-3.5 w-3.5" aria-hidden />, onSelect: (r) => setOpenNo(r.siparisNo),
            }]}
          />
        </>}
        detail={<SearchResultPanel row={active} emptyText={panelEmpty} onOpen={setOpenNo} />}
      />
      <OrderDetailModal siparisNo={openNo} onClose={() => setOpenNo(null)} />
    </FillPage>
  )
}

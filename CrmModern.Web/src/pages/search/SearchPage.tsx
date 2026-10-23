import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { searchOrders } from '@/api/search'
import { PageHeader } from '@/components/PageHeader'
import { FillPage, FillRegion } from '@/components/FillPage'
import { FilterBar, FilterField } from '@/components/FilterBar'
import { DataTable, type Column } from '@/components/DataTable'
import { StatusBadge } from '@/components/StatusBadge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDateShort, formatCurrency } from '@/lib/utils'
import { statusLabel } from '@/lib/status'
import { useAuth } from '@/hooks/useAuth'
import { hideMoneyFor } from '@/lib/visibility'
import type { SearchResultDto } from '@/types'

const STAGES = ['all', 'Teklif', 'Siparis', 'Planlama', 'Uretim', 'Hazir', 'Lojistik', 'Tamamlandi']
const CONTROLS = ['all', 'Kontrol', 'Onay', 'Reddet']

interface Filters {
  siparisNo: string
  musteriAd: string
  ulke: string
  asama: string
  kontrol: string
  baslangic: string
  bitis: string
}

const empty = (): Filters => ({ siparisNo: '', musteriAd: '', ulke: '', asama: 'all', kontrol: 'all', baslangic: '', bitis: '' })

export function SearchPage() {
  const { t } = useTranslation()
  // PROMPT-v5 §2 + Round-11 §3: para kolonları gizleme (Fabrika rolü + omur.caliskan
  // gibi ad-bazlı kullanıcılar). Backend de aynı alanları null/0 dönerek karartır.
  const { getUser } = useAuth()
  const hideMoney = hideMoneyFor(getUser())
  const [filters, setFilters] = useState<Filters>(empty())
  const [submitted, setSubmitted] = useState<Filters | null>(null)

  const { data = [], isLoading } = useQuery({
    queryKey: ['search', submitted],
    queryFn: () => searchOrders({
      siparisNo: submitted?.siparisNo || undefined,
      musteriAd: submitted?.musteriAd || undefined,
      ulke: submitted?.ulke || undefined,
      asama: submitted?.asama === 'all' ? undefined : submitted?.asama || undefined,
      kontrol: submitted?.kontrol === 'all' ? undefined : submitted?.kontrol || undefined,
      baslangic: submitted?.baslangic || undefined,
      bitis: submitted?.bitis || undefined,
    }),
    enabled: submitted !== null,
  })

  const columns: Column<SearchResultDto & Record<string, unknown>>[] = [
    { key: 'siparisNo', pin: 'left', header: t('common.orderNo'),    sortable: true },
    { key: 'teklifNo',          header: t('common.quoteNo'),    sortable: true },
    { key: 'musteriAd', truncate: '16rem', header: t('common.customer'),   sortable: true },
    // Siparişi oluşturan kullanıcı (legacy Ara formu KullaniciBilgileri join'i).
    { key: 'kullaniciAdi',      header: t('common.createdBy'),  sortable: true, render: (r) => (r.kullaniciAdi as string) ?? '—' },
    { key: 'mUlke',             header: t('common.country'),    sortable: true },
    { key: 'paraTipi',          header: t('common.currency'),   sortable: true },
    ...(!hideMoney ? [
      { key: 'toplamFiyat',     header: t('common.totalAmount'),sortable: true, render: (r) => formatCurrency((r.toplamFiyat as number) ?? 0, r.paraTipi as string) },
      { key: 'kaparoFiyat',     header: t('qc.columns.deposit'),render: (r) => formatCurrency((r.kaparoFiyat as number) ?? 0, r.paraTipi as string) },
      { key: 'kalanBakiye',     header: t('qc.columns.remaining'), render: (r) => formatCurrency((r.kalanBakiye as number) ?? 0, r.paraTipi as string) },
    ] satisfies Column<SearchResultDto & Record<string, unknown>>[] : []),
    { key: 'odemeDurum',        header: t('common.status'),     render: (r) => r.odemeDurum ? <StatusBadge value={r.odemeDurum as string} /> : '—' },
    { key: 'siparisMiTeklifMi', header: t('common.stage'),      sortable: true, render: (r) => <StatusBadge value={r.siparisMiTeklifMi as string} /> },
    { key: 'kontrol',           header: t('common.control'),    render: (r) => <StatusBadge value={r.kontrol as string} /> },
    // §6 — yoğun grid: kısa tarih (dd.MM.yy)
    { key: 'tarih',             header: t('common.date'),       sortable: true, render: (r) => formatDateShort((r.tarih as string) ?? '-') },
    { key: 'sirket',            header: t('orders.form.sirket') },
  ]

  const set = (key: keyof Filters) => (val: string) => setFilters((f) => ({ ...f, [key]: val }))

  return (
    // Scaling Faz 2 — FillPage + ortak FilterBar (Enter/F8 arar); sonuç tablosu
    // kalan yüksekliği doldurur, başlığı kaydırmada yerinde kalır.
    <FillPage>
      <PageHeader density="compact" title={t('search.title')} description={t('search.subtitle')} />
      <div className="px-4 pt-2">
        <FilterBar
          onSubmit={() => setSubmitted({ ...filters })}
          submitLabel={isLoading ? t('common.loading') : t('common.search')}
          onReset={() => { setFilters(empty()); setSubmitted(null) }}
        >
          <FilterField label={`${t('common.orderNo')} / ${t('common.quoteNo')}`}>
            <Input inputSize="sm" value={filters.siparisNo} onChange={(e) => set('siparisNo')(e.target.value)} placeholder="S-001..." />
          </FilterField>
          <FilterField label={t('common.customer')}>
            <Input inputSize="sm" value={filters.musteriAd} onChange={(e) => set('musteriAd')(e.target.value)} />
          </FilterField>
          <FilterField label={t('common.country')}>
            <Input inputSize="sm" value={filters.ulke} onChange={(e) => set('ulke')(e.target.value)} />
          </FilterField>
          <FilterField label={t('common.stage')}>
            <Select value={filters.asama} onValueChange={set('asama')}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={t('common.all')} /></SelectTrigger>
              <SelectContent>{STAGES.map((s) => <SelectItem key={s} value={s}>{s === 'all' ? t('common.all') : statusLabel(t, s)}</SelectItem>)}</SelectContent>
            </Select>
          </FilterField>
          <FilterField label={t('common.control')}>
            <Select value={filters.kontrol} onValueChange={set('kontrol')}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={t('common.all')} /></SelectTrigger>
              <SelectContent>{CONTROLS.map((c) => <SelectItem key={c} value={c}>{c === 'all' ? t('common.all') : statusLabel(t, c)}</SelectItem>)}</SelectContent>
            </Select>
          </FilterField>
          <FilterField label={t('common.startDate')}>
            <Input inputSize="sm" type="date" value={filters.baslangic} onChange={(e) => set('baslangic')(e.target.value)} />
          </FilterField>
          <FilterField label={t('common.endDate')}>
            <Input inputSize="sm" type="date" value={filters.bitis} onChange={(e) => set('bitis')(e.target.value)} />
          </FilterField>
        </FilterBar>
      </div>

      {submitted !== null && (
        <FillRegion className="pt-2">
          <DataTable
            fill
            tableId="search"
            columns={columns}
            data={data as (SearchResultDto & Record<string, unknown>)[]}
            keyField="siparisNo"
            loading={isLoading}
            density="compact"
          />
        </FillRegion>
      )}
    </FillPage>
  )
}

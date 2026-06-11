import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { searchOrders } from '@/api/search'
import { PageHeader } from '@/components/PageHeader'
import { DataTable, type Column } from '@/components/DataTable'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { formatDate, formatCurrency } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
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
  // PROMPT-v5 §2: Fabrika sipariş parası görmez — para kolonları gizlenir
  // (backend de aynı alanları null/0 dönerek karartır).
  const { getUser } = useAuth()
  const hideMoney = getUser()?.yetkiTuru === 'Fabrika'
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
    { key: 'siparisNo',         header: t('common.orderNo'),    sortable: true },
    { key: 'teklifNo',          header: t('common.quoteNo'),    sortable: true },
    { key: 'musteriAd',         header: t('common.customer'),   sortable: true },
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
    { key: 'tarih',             header: t('common.date'),       sortable: true, render: (r) => formatDate((r.tarih as string) ?? '-') },
    { key: 'sirket',            header: t('orders.form.sirket') },
  ]

  const set = (key: keyof Filters) => (val: string) => setFilters((f) => ({ ...f, [key]: val }))

  return (
    <div>
      <PageHeader title={t('search.title')} description={t('search.subtitle')} />
      <div className="p-6 space-y-4">
        <Card>
          <CardContent className="pt-5">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div className="space-y-1">
                <Label>{t('common.orderNo')} / {t('common.quoteNo')}</Label>
                <Input value={filters.siparisNo} onChange={(e) => set('siparisNo')(e.target.value)} placeholder="S-001..." />
              </div>
              <div className="space-y-1">
                <Label>{t('common.customer')}</Label>
                <Input value={filters.musteriAd} onChange={(e) => set('musteriAd')(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>{t('common.country')}</Label>
                <Input value={filters.ulke} onChange={(e) => set('ulke')(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>{t('common.stage')}</Label>
                <Select value={filters.asama} onValueChange={set('asama')}>
                  <SelectTrigger><SelectValue placeholder={t('common.all')} /></SelectTrigger>
                  <SelectContent>{STAGES.map((s) => <SelectItem key={s} value={s}>{s === 'all' ? t('common.all') : s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>{t('common.control')}</Label>
                <Select value={filters.kontrol} onValueChange={set('kontrol')}>
                  <SelectTrigger><SelectValue placeholder={t('common.all')} /></SelectTrigger>
                  <SelectContent>{CONTROLS.map((c) => <SelectItem key={c} value={c}>{c === 'all' ? t('common.all') : c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>{t('common.startDate')}</Label>
                <Input type="date" value={filters.baslangic} onChange={(e) => set('baslangic')(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>{t('common.endDate')}</Label>
                <Input type="date" value={filters.bitis} onChange={(e) => set('bitis')(e.target.value)} />
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={() => setSubmitted({ ...filters })} disabled={isLoading} className="flex-1">
                  {isLoading ? `${t('common.loading')}` : t('common.search')}
                </Button>
                <Button variant="outline" onClick={() => { setFilters(empty()); setSubmitted(null) }}>{t('common.clear')}</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {submitted !== null && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{data.length}</p>
            <DataTable
              columns={columns}
              data={data as (SearchResultDto & Record<string, unknown>)[]}
              keyField="siparisNo"
              loading={isLoading}
            />
          </div>
        )}
      </div>
    </div>
  )
}

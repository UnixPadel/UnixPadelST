import { useEffect, useMemo, useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getAllPurchaseRequests, overrideApprovePurchase, type PurchaseFilter } from '@/api/purchase'
import { PageHeader } from '@/components/PageHeader'
import { FillPage, FillRegion } from '@/components/FillPage'
import { ALL, FilterBar, FilterField, useFilterState } from '@/components/FilterBar'
import { DataTable, type Column } from '@/components/DataTable'
import { PurchaseStatusBadge } from '@/components/PurchaseStatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { useAppMutation } from '@/hooks/useAppMutation'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useAuth } from '@/hooks/useAuth'
import { isSuperAdmin } from '@/lib/permissions'
import { hideMoneyFor } from '@/lib/visibility'
import { formatDate, formatCurrency } from '@/lib/utils'
import { purchaseStatusLabel } from '@/lib/status'
import type { PurchaseRequestListDto } from '@/types'

// PROMPT-v7 §2: nihai durumdaki talepler override edilemez (buton gizli).
const FINAL_DURUMLAR = ['Onaylandı', 'Reddedildi']

const DURUMLAR = ['Bekliyor', 'Onay Bekliyor', 'Ön Onaylandı', 'Muhasebe Tamamlandı', 'Onaylandı', 'Reddedildi'] as const
const TIPLER = ['SatinAlma', 'Muhasebe'] as const
// PROMPT.md ACCOUNTING #13: Departman is now a dropdown.
// Values mirror the YetkiTuru set used elsewhere (UsersPage). Strict equality on the
// backend (`p.Departman == departman`) was the root cause of the "kayıt bulunamadı"
// behaviour (#12) — typo'd / case-mismatched free-text values never matched.
const DEPARTMANLAR = ['Yonetici', 'Muhasebe', 'Fabrika', 'Gozlemci', 'Temsilci', 'Lojistik'] as const
const PAGE_SIZE = 50

// Filtreler URL'de: üst arama kutusu bir talebi f.talepNo ile açar.
const FILTER_DEFAULTS = { talepNo: '', talepEden: '', departman: ALL, durum: ALL, talepTipi: ALL, baslangic: '', bitis: '' }
type Filters = typeof FILTER_DEFAULTS

const toPurchaseFilter = (f: Filters, page: number): PurchaseFilter => ({
  talepNo: /^\d{1,9}$/.test(f.talepNo) ? Number(f.talepNo) : undefined,
  talepEden: f.talepEden || undefined,
  departman: f.departman !== ALL ? f.departman : undefined,
  durum: f.durum !== ALL ? f.durum : undefined,
  talepTipi: f.talepTipi !== ALL ? f.talepTipi : undefined,
  baslangicTarih: f.baslangic || undefined,
  bitisTarih: f.bitis || undefined,
  page,
  pageSize: PAGE_SIZE,
})

export function AllPurchaseRequestsPage() {
  const { t } = useTranslation()
  const { confirm } = useConfirm()
  const { getUser } = useAuth()
  const { values: f, set, reset } = useFilterState(FILTER_DEFAULTS)
  const [pageNo, setPageNo] = useState(1)
  useEffect(() => { setPageNo(1) }, [f])
  const filter = useMemo(() => toPurchaseFilter(f, pageNo), [f, pageNo])

  // PROMPT-v7 §2: override "Onayla" yalnız elshan.rasulov'a render edilir.
  // §24 — Admin de override "Onayla" butonunu görür/kullanır.
  const isOverrideUser = getUser()?.kullaniciAdi === 'elshan.rasulov' || isSuperAdmin(getUser())
  // Round-11 §3 — omur.caliskan (Gozlemci) parasal değer görmez.
  const hideMoney = hideMoneyFor(getUser())

  // QW-15 — metin alanı her tuşta sorgu atmasın; yenilemede tablo boşalmasın.
  const debouncedFilter = useDebouncedValue(filter, 300)
  const { data: page, isLoading, isError } = useQuery({
    queryKey: ['purchase-all', debouncedFilter],
    queryFn: () => getAllPurchaseRequests(debouncedFilter),
    placeholderData: keepPreviousData,
  })

  // Override sonrası talep tüm bekleyen kuyruklardan düşer (ortak tazeleme).
  const overrideMut = useAppMutation({
    mutationFn: (talepId: number) => overrideApprovePurchase(talepId),
    successTitle: t('purchase.overrideSuccess'), notify: 'toast',
    successDescription: (_d, id) => '#' + id,
    errorTitle: t('common.error'),
  })
  const askOverride = async (r: PurchaseRequestListDto) => {
    if (await confirm({ title: t('purchase.overrideConfirm'), description: '#' + r.talepID + ' ' + r.urunAdi, confirmLabel: t('purchase.overrideApprove') }))
      overrideMut.mutate(r.talepID)
  }

  // Aşama computed (SatinAlmaTumTalepForm portu) — i18n kod döner, render çevirir.
  const computeAsama = (r: PurchaseRequestListDto): string => {
    const d = r.durum
    if (d === 'Bekliyor' || d === 'Onay Bekliyor') return 'fabrikaOnIzleme'
    if (d === 'Ön Onaylandı') return 'muhasebe'
    if (d === 'Muhasebe Tamamlandı') return 'nihaiOnay'
    if (d === 'Onaylandı' || d === 'Reddedildi') return 'tamamlandi'
    return ''
  }

  const cols: Column<PurchaseRequestListDto & Record<string, unknown>>[] = [
    { key: 'talepID', pin: 'left', header: t('purchase.cols.id'), sortable: true, type: 'number' },
    { key: 'urunAdi',               header: t('purchase.cols.urun'), sortable: true },
    ...(!hideMoney ? [
      { key: 'paraBirimi',   header: t('purchase.paraBirimi'), render: (r) => (r.paraBirimi as string) ?? '—' },
      { key: 'urunMaliyeti', header: t('purchase.cols.maliyet'), sortable: true, type: 'money', render: (r) => formatCurrency((r.urunMaliyeti as number) ?? 0, (r.paraBirimi as string) ?? '') },
    ] satisfies Column<PurchaseRequestListDto & Record<string, unknown>>[] : []),
    { key: 'talepEdenKullaniciAdi', header: t('purchase.cols.talepEden') },
    { key: 'departman',             header: t('purchase.cols.departman'), render: (r) => r.departman ? t(`roles.${r.departman as string}`, { defaultValue: r.departman as string }) : '—' },
    { key: 'talepTipi',             header: t('purchase.cols.tip'), render: (r) => t(`purchase.tipLabel.${(r.talepTipi as string) ?? 'SatinAlma'}`, { defaultValue: (r.talepTipi as string) ?? 'SatinAlma' }) },
    { key: 'durum',                 header: t('purchase.cols.durum'), render: (r) => <PurchaseStatusBadge value={r.durum as string} /> },
    { key: 'asama',                 header: t('purchase.cols.asama'), render: (r) => { const c = computeAsama(r as unknown as PurchaseRequestListDto); return c ? t(`purchase.asamaLabel.${c}`) : '—' } },
    { key: 'talepTarihi',           header: t('purchase.cols.tarih'), sortable: true, type: 'date', render: (r) => formatDate(r.talepTarihi as string) },
    // PROMPT-v7 §2: override aksiyon kolonu — yalnız elshan.rasulov'a render.
    ...(isOverrideUser ? [{
      key: 'override', pin: 'right',
      header: t('purchase.actionCol'),
      render: (r: PurchaseRequestListDto & Record<string, unknown>) =>
        FINAL_DURUMLAR.includes(r.durum as string) ? null : (
          <Button
            size="xs"
            loading={overrideMut.isPendingFor((id) => id === r.talepID)}
            onClick={() => askOverride(r)}
          >
            {t('purchase.overrideApprove')}
          </Button>
        ),
    } as Column<PurchaseRequestListDto & Record<string, unknown>>] : []),
  ]

  return (
    // Scaling Faz 2 — FillPage + ortak FilterBar (tek satır, sığdığı kadar yan
    // yana); tablo kalan yüksekliği doldurur, sayfalama altta hep görünür.
    <FillPage>
      <PageHeader density="compact" title={t('purchase.allTitle')} />
      <div className="px-4 pt-2">
        <FilterBar onReset={reset}>
          <FilterField label={t('purchase.filter.talepNo')}>
            <Input inputSize="sm" inputMode="numeric" value={f.talepNo} onChange={(e) => set('talepNo', e.target.value.replace(/\D/g, '').slice(0, 9))} />
          </FilterField>
          <FilterField label={t('purchase.filter.talepEden')}>
            <Input inputSize="sm" value={f.talepEden} onChange={(e) => set('talepEden', e.target.value)} />
          </FilterField>
          <FilterField label={t('purchase.filter.departman')}>
            <Select value={f.departman} onValueChange={(v) => set('departman', v)}>
              <SelectTrigger size="sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('common.all')}</SelectItem>
                {DEPARTMANLAR.map((d) => <SelectItem key={d} value={d}>{t(`roles.${d}`, { defaultValue: d })}</SelectItem>)}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label={t('purchase.filter.durum')}>
            <Select value={f.durum} onValueChange={(v) => set('durum', v)}>
              <SelectTrigger size="sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('common.all')}</SelectItem>
                {DURUMLAR.map((d) => <SelectItem key={d} value={d}>{purchaseStatusLabel(t, d)}</SelectItem>)}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label={t('purchase.filter.tip')}>
            <Select value={f.talepTipi} onValueChange={(v) => set('talepTipi', v)}>
              <SelectTrigger size="sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('common.all')}</SelectItem>
                {TIPLER.map((tp) => <SelectItem key={tp} value={tp}>{t(`purchase.tipLabel.${tp}`, { defaultValue: tp })}</SelectItem>)}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label={t('purchase.filter.baslangic')}>
            <Input inputSize="sm" type="date" value={f.baslangic} onChange={(e) => set('baslangic', e.target.value)} />
          </FilterField>
          <FilterField label={t('purchase.filter.bitis')}>
            <Input inputSize="sm" type="date" value={f.bitis} onChange={(e) => set('bitis', e.target.value)} />
          </FilterField>
        </FilterBar>
      </div>

      <FillRegion className="pt-2">
        <DataTable fill tableId="purchase-all" exportFileName="satin-alma-talepleri" columns={cols} data={(page?.items ?? []) as (PurchaseRequestListDto & Record<string, unknown>)[]} keyField="talepID" loading={isLoading} error={isError} />
      </FillRegion>

      {page && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 pb-2 text-xs">
          <span className="text-muted-foreground">{t('purchase.pager', { total: page.totalCount, page: page.page })}</span>
          <div className="flex flex-wrap gap-2">
            <Button size="xs" variant="outline" disabled={pageNo <= 1} onClick={() => setPageNo((n) => n - 1)}>{t('common.previous')}</Button>
            <Button size="xs" variant="outline" disabled={page.items.length < PAGE_SIZE} onClick={() => setPageNo((n) => n + 1)}>{t('common.next')}</Button>
          </div>
        </div>
      )}
    </FillPage>
  )
}

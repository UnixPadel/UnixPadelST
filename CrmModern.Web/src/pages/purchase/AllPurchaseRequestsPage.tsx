import { useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getAllPurchaseRequests, overrideApprovePurchase, type PurchaseFilter } from '@/api/purchase'
import { PageHeader } from '@/components/PageHeader'
import { DataTable, type Column } from '@/components/DataTable'
import { PurchaseStatusBadge } from '@/components/PurchaseStatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

export function AllPurchaseRequestsPage() {
  const { t } = useTranslation()
  const { confirm } = useConfirm()
  const { getUser } = useAuth()
  const [filter, setFilter] = useState<PurchaseFilter>({ page: 1, pageSize: 50 })

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
    successTitle: t('purchase.overrideSuccess'),
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
    { key: 'talepID',               header: t('purchase.cols.id'), sortable: true, type: 'number' },
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
      key: 'override',
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

  const update = <K extends keyof PurchaseFilter>(k: K, v: PurchaseFilter[K]) =>
    setFilter((f) => ({ ...f, [k]: v, page: 1 }))

  return (
    <div>
      <PageHeader title={t('purchase.allTitle')} />
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 rounded-md border bg-card p-3">
          <div className="space-y-1"><Label>{t('purchase.filter.talepEden')}</Label><Input value={filter.talepEden ?? ''} onChange={(e) => update('talepEden', e.target.value || undefined)} /></div>
          <div className="space-y-1">
            <Label>{t('purchase.filter.departman')}</Label>
            <Select value={filter.departman ?? 'all'} onValueChange={(v) => update('departman', v === 'all' ? undefined : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                {DEPARTMANLAR.map((d) => <SelectItem key={d} value={d}>{t(`roles.${d}`, { defaultValue: d })}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>{t('purchase.filter.durum')}</Label>
            <Select value={filter.durum ?? 'all'} onValueChange={(v) => update('durum', v === 'all' ? undefined : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                {DURUMLAR.map((d) => <SelectItem key={d} value={d}>{purchaseStatusLabel(t, d)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>{t('purchase.filter.tip')}</Label>
            <Select value={filter.talepTipi ?? 'all'} onValueChange={(v) => update('talepTipi', v === 'all' ? undefined : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                {TIPLER.map((tp) => <SelectItem key={tp} value={tp}>{t(`purchase.tipLabel.${tp}`, { defaultValue: tp })}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label>{t('purchase.filter.baslangic')}</Label><Input type="date" value={filter.baslangicTarih ?? ''} onChange={(e) => update('baslangicTarih', e.target.value || undefined)} /></div>
          <div className="space-y-1"><Label>{t('purchase.filter.bitis')}</Label><Input type="date" value={filter.bitisTarih ?? ''} onChange={(e) => update('bitisTarih', e.target.value || undefined)} /></div>
          <div className="space-y-1 flex items-end col-span-2 md:col-span-2">
            <Button variant="outline" onClick={() => setFilter({ page: 1, pageSize: 50 })}>{t('common.clear')}</Button>
          </div>
        </div>

        <DataTable tableId="purchase-all" exportFileName="satin-alma-talepleri" columns={cols} data={(page?.items ?? []) as (PurchaseRequestListDto & Record<string, unknown>)[]} keyField="talepID" loading={isLoading} error={isError} density="compact" />

        {page && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">{t('purchase.pager', { total: page.totalCount, page: page.page })}</span>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" disabled={(filter.page ?? 1) <= 1} onClick={() => setFilter((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}>{t('common.previous')}</Button>
              <Button size="sm" variant="outline" disabled={page.items.length < (filter.pageSize ?? 50)} onClick={() => setFilter((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}>{t('common.next')}</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getAllPurchaseRequests, type PurchaseFilter } from '@/api/purchase'
import { PageHeader } from '@/components/PageHeader'
import { DataTable, type Column } from '@/components/DataTable'
import { PurchaseStatusBadge } from '@/components/PurchaseStatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDate, formatCurrency } from '@/lib/utils'
import type { PurchaseRequestListDto } from '@/types'

const DURUMLAR = ['Bekliyor', 'Onay Bekliyor', 'Ön Onaylandı', 'Muhasebe Tamamlandı', 'Onaylandı', 'Reddedildi'] as const
const TIPLER = ['SatinAlma', 'Muhasebe'] as const

export function AllPurchaseRequestsPage() {
  const { t } = useTranslation()
  const [filter, setFilter] = useState<PurchaseFilter>({ page: 1, pageSize: 50 })

  const { data: page, isLoading } = useQuery({
    queryKey: ['purchase-all', filter],
    queryFn: () => getAllPurchaseRequests(filter),
  })

  // Aşama computed (SatinAlmaTumTalepForm portu)
  const computeAsama = (r: PurchaseRequestListDto): string => {
    const d = r.durum
    if (d === 'Bekliyor' || d === 'Onay Bekliyor') return 'Fabrika / Ön İzleme'
    if (d === 'Ön Onaylandı') return 'Muhasebe'
    if (d === 'Muhasebe Tamamlandı') return 'Nihai Onay'
    if (d === 'Onaylandı' || d === 'Reddedildi') return 'Tamamlandı'
    return '—'
  }

  const cols: Column<PurchaseRequestListDto & Record<string, unknown>>[] = [
    { key: 'talepID',               header: 'ID' },
    { key: 'urunAdi',               header: 'Ürün' },
    { key: 'urunMaliyeti',          header: 'Maliyet', render: (r) => formatCurrency((r.urunMaliyeti as number) ?? 0) },
    { key: 'talepEdenKullaniciAdi', header: 'Talep Eden' },
    { key: 'departman',             header: 'Departman' },
    { key: 'talepTipi',             header: 'Tip', render: (r) => r.talepTipi ?? 'SatinAlma' },
    { key: 'durum',                 header: 'Durum', render: (r) => <PurchaseStatusBadge value={r.durum as string} /> },
    { key: 'asama',                 header: 'Aşama', render: (r) => computeAsama(r as unknown as PurchaseRequestListDto) },
    { key: 'talepTarihi',           header: 'Tarih', render: (r) => formatDate(r.talepTarihi as string) },
  ]

  const update = <K extends keyof PurchaseFilter>(k: K, v: PurchaseFilter[K]) =>
    setFilter((f) => ({ ...f, [k]: v, page: 1 }))

  return (
    <div>
      <PageHeader title={t('purchase.allTitle')} />
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 rounded-md border bg-card p-3">
          <div className="space-y-1"><Label>Talep Eden</Label><Input value={filter.talepEden ?? ''} onChange={(e) => update('talepEden', e.target.value || undefined)} /></div>
          <div className="space-y-1"><Label>Departman</Label><Input value={filter.departman ?? ''} onChange={(e) => update('departman', e.target.value || undefined)} /></div>
          <div className="space-y-1">
            <Label>Durum</Label>
            <Select value={filter.durum ?? 'all'} onValueChange={(v) => update('durum', v === 'all' ? undefined : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">— Tümü —</SelectItem>
                {DURUMLAR.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Tip</Label>
            <Select value={filter.talepTipi ?? 'all'} onValueChange={(v) => update('talepTipi', v === 'all' ? undefined : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">— Tümü —</SelectItem>
                {TIPLER.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label>Başlangıç</Label><Input type="date" value={filter.baslangicTarih ?? ''} onChange={(e) => update('baslangicTarih', e.target.value || undefined)} /></div>
          <div className="space-y-1"><Label>Bitiş</Label><Input type="date" value={filter.bitisTarih ?? ''} onChange={(e) => update('bitisTarih', e.target.value || undefined)} /></div>
          <div className="space-y-1 flex items-end col-span-2 md:col-span-2">
            <Button variant="outline" onClick={() => setFilter({ page: 1, pageSize: 50 })}>Temizle</Button>
          </div>
        </div>

        <DataTable columns={cols} data={(page?.items ?? []) as (PurchaseRequestListDto & Record<string, unknown>)[]} keyField="talepID" loading={isLoading} />

        {page && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Toplam: {page.totalCount} • Sayfa {page.page}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={(filter.page ?? 1) <= 1} onClick={() => setFilter((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}>Önceki</Button>
              <Button size="sm" variant="outline" disabled={page.items.length < (filter.pageSize ?? 50)} onClick={() => setFilter((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}>Sonraki</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

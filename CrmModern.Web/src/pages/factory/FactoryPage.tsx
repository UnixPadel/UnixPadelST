import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getFactoryOrders, moveToProduction, markReady, type FactoryFilter } from '@/api/factory'
import { getUsersLookup } from '@/api/users'
import { PageHeader } from '@/components/PageHeader'
import { DataTable, type Column } from '@/components/DataTable'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ToastProvider'
import { formatDate } from '@/lib/utils'
import { OrderDetailModal } from '@/components/OrderDetailModal'
import { downloadExcel } from '@/api/orders'
import type { FactoryOrderListDto } from '@/types'

// FactoryService.GetProductionStagesAsync 5 aşama dönüyor.
const FACTORY_ASAMALAR = ['Planlama', 'Uretim', 'Hazir', 'Lojistik', 'Tamamlandi'] as const

export function FactoryPage() {
  const qc = useQueryClient()
  const { toast, dismiss } = useToast()
  const { t } = useTranslation()
  const [productionTarget, setProductionTarget] = useState<string | null>(null)
  const [fabrikaNot, setFabrikaNot] = useState('')
  const [sTarih, setSTarih] = useState(() => new Date().toISOString().slice(0, 16))
  const [detailNo, setDetailNo] = useState<string | null>(null)

  // Faz-fix 2.2 — Fabrika.cs çoklu filtre. Boş alanlar query'ye gönderilmez.
  const [filter, setFilter] = useState<FactoryFilter>({})
  const updateFilter = <K extends keyof FactoryFilter>(k: K, v: FactoryFilter[K]) =>
    setFilter((f) => ({ ...f, [k]: v }))

  // Temsilci dropdown — /api/users/lookup (Yonetici-only değil; herkes çekebilir)
  const { data: users = [] } = useQuery({ queryKey: ['users-lookup'], queryFn: getUsersLookup })

  // Aşama veya herhangi bir filtre değişimi sorguyu tetikler
  const { data = [], isLoading } = useQuery({
    queryKey: ['factory', filter],
    queryFn: () => getFactoryOrders(filter),
  })

  const toProductionMut = useMutation({
    mutationFn: ({ siparisNo, dto }: { siparisNo: string; dto: { sTarih: string; fabrikaNot: string } }) =>
      moveToProduction(siparisNo, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['factory'] })
      setProductionTarget(null)
      setFabrikaNot('')
      toast({ title: t('common.success') })
    },
    onError: () => toast({ title: t('common.error'), variant: 'destructive' }),
  })

  const readyMut = useMutation({
    mutationFn: (siparisNo: string) => markReady(siparisNo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['factory'] })
      toast({ title: t('common.success') })
    },
    onError: () => toast({ title: t('common.error'), variant: 'destructive' }),
  })

  // 2.6 — Excel akışı: önce persistent "İndiriliyor..." toast'u; promise
  // resolve olunca onu kapatıp "İndirildi" toast'u (otomatik kapanır).
  // Reddedilirse aynısı + destructive variant.
  const handleExcel = async (siparisNo: string) => {
    const loadingId = toast({
      title: t('factory.excelDownloading'),
      description: siparisNo,
      persistent: true,
    })
    try {
      await downloadExcel(siparisNo)
      dismiss(loadingId)
      toast({ title: t('factory.excelDownloaded'), description: siparisNo })
    } catch {
      dismiss(loadingId)
      toast({ title: t('factory.excelFailed'), description: siparisNo, variant: 'destructive' })
    }
  }

  const columns: Column<FactoryOrderListDto & Record<string, unknown>>[] = [
    { key: 'siparisNo',         header: t('common.orderNo'),  sortable: true },
    { key: 'musteriAd',         header: t('common.customer'), sortable: true },
    { key: 'mUlke',             header: t('common.country'),  sortable: true },
    // 2.2 — legacy "Temsilci" (CONCAT(Ad, Soyad)) sütunu
    { key: 'kullanici',         header: t('factory.temsilci'), sortable: true, render: (r) => (r.kullanici as string) ?? '—' },
    { key: 'siparisMiTeklifMi', header: t('common.stage'),    sortable: true, render: (r) => <StatusBadge value={r.siparisMiTeklifMi as string} /> },
    { key: 'fabrikaNot',        header: t('common.note'),     render: (r) => <span className="text-sm text-muted-foreground">{(r.fabrikaNot as string) ?? '—'}</span> },
    { key: 'sTarih',            header: t('common.startDate'),render: (r) => r.sTarih ? formatDate(r.sTarih as string) : '—' },
    { key: 'tarih',             header: t('common.date'),     sortable: true, render: (r) => formatDate(r.tarih as string) },
    {
      key: 'actions',
      header: t('common.actions'),
      render: (r) => (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setDetailNo(r.siparisNo as string)}>{t('common.form')}</Button>
          <Button size="sm" variant="ghost" onClick={() => handleExcel(r.siparisNo as string)}>{t('common.excel')}</Button>
          {(r.siparisMiTeklifMi as string) === 'Planlama' && (
            <Button size="sm" onClick={() => { setProductionTarget(r.siparisNo as string) }}>
              {t('factory.moveToProduction')}
            </Button>
          )}
          {(r.siparisMiTeklifMi as string) === 'Uretim' && (
            <Button size="sm" variant="secondary" onClick={() => readyMut.mutate(r.siparisNo as string)} disabled={readyMut.isPending}>
              {t('factory.ready')}
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title={t('factory.title')} />
      <div className="p-6 space-y-4">
        {/* Filter grid — Fabrika.cs araButtonInTab port'u */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 rounded-md border bg-card p-3">
          <div className="space-y-1">
            <Label>{t('common.orderNo')}</Label>
            <Input value={filter.siparisNo ?? ''} onChange={(e) => updateFilter('siparisNo', e.target.value || undefined)} />
          </div>
          <div className="space-y-1">
            <Label>{t('common.customer')}</Label>
            <Input value={filter.musteriAd ?? ''} onChange={(e) => updateFilter('musteriAd', e.target.value || undefined)} />
          </div>
          <div className="space-y-1">
            <Label>{t('common.country')}</Label>
            <Input value={filter.mUlke ?? ''} onChange={(e) => updateFilter('mUlke', e.target.value || undefined)} />
          </div>
          <div className="space-y-1">
            <Label>{t('factory.temsilci')}</Label>
            <Select
              value={filter.kullaniciID ? String(filter.kullaniciID) : 'all'}
              onValueChange={(v) => updateFilter('kullaniciID', v === 'all' ? undefined : Number(v))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.kullaniciID} value={String(u.kullaniciID)}>{`${u.ad} ${u.soyad}`.trim()}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>{t('common.stage')}</Label>
            <Select value={filter.asama ?? 'all'} onValueChange={(v) => updateFilter('asama', v === 'all' ? undefined : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                {FACTORY_ASAMALAR.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>{t('common.startDate')}</Label>
            <Input type="date" value={filter.baslangicTarih ?? ''} onChange={(e) => updateFilter('baslangicTarih', e.target.value || undefined)} />
          </div>
          <div className="space-y-1">
            <Label>{t('common.endDate')}</Label>
            <Input type="date" value={filter.bitisTarih ?? ''} onChange={(e) => updateFilter('bitisTarih', e.target.value || undefined)} />
          </div>
          <div className="flex items-end">
            <Button variant="outline" onClick={() => setFilter({})}>{t('factory.filterReset')}</Button>
          </div>
        </div>

        {/* 2.5 — Satır tıklamasında detay modalı açılır (aşama geçmişi dahil) */}
        <DataTable
          columns={columns}
          data={data as (FactoryOrderListDto & Record<string, unknown>)[]}
          keyField="siparisNo"
          loading={isLoading}
          onRowClick={(r) => setDetailNo(r.siparisNo as string)}
        />
      </div>

      <Dialog open={!!productionTarget} onOpenChange={() => setProductionTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('factory.moveToProductionTitle', { siparisNo: productionTarget ?? '' })}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('factory.uretimTarihi')}</Label>
              <Input type="datetime-local" value={sTarih} onChange={(e) => setSTarih(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('factory.fabrikaNot')}</Label>
              <Textarea
                placeholder={t('factory.fabrikaNotPlaceholder')}
                value={fabrikaNot}
                onChange={(e) => setFabrikaNot(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProductionTarget(null)}>{t('common.cancel')}</Button>
            <Button
              disabled={!fabrikaNot.trim() || toProductionMut.isPending}
              onClick={() => toProductionMut.mutate({ siparisNo: productionTarget!, dto: { sTarih, fabrikaNot } })}
            >
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <OrderDetailModal siparisNo={detailNo} onClose={() => setDetailNo(null)} />
    </div>
  )
}

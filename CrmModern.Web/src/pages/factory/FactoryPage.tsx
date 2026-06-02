import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getFactoryOrders, moveToProduction, markReady } from '@/api/factory'
import { PageHeader } from '@/components/PageHeader'
import { DataTable, type Column } from '@/components/DataTable'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// Paket 2 — FactoryService.GetProductionStagesAsync 5 aşama dönüyor
const FACTORY_ASAMALAR = ['Planlama', 'Uretim', 'Hazir', 'Lojistik', 'Tamamlandi'] as const
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ToastProvider'
import { formatDate } from '@/lib/utils'
import { OrderDetailModal } from '@/components/OrderDetailModal'
import { downloadExcel } from '@/api/orders'
import type { FactoryOrderListDto } from '@/types'

export function FactoryPage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation()
  const [productionTarget, setProductionTarget] = useState<string | null>(null)
  const [fabrikaNot, setFabrikaNot] = useState('')
  const [sTarih, setSTarih] = useState(() => new Date().toISOString().slice(0, 16))
  const [detailNo, setDetailNo] = useState<string | null>(null)
  const [asama, setAsama] = useState<string | undefined>(undefined)

  // Paket 2 — aşama dropdown değişimi sorguyu yeniden tetikler
  const { data = [], isLoading } = useQuery({
    queryKey: ['factory', asama ?? 'all'],
    queryFn: () => getFactoryOrders(asama),
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

  const handleExcel = async (siparisNo: string) => {
    try {
      await downloadExcel(siparisNo)
      toast({ title: t('orders.excelDownloaded') })
    } catch {
      toast({ title: t('common.error'), variant: 'destructive' })
    }
  }

  const columns: Column<FactoryOrderListDto & Record<string, unknown>>[] = [
    { key: 'siparisNo',         header: t('common.orderNo'),  sortable: true },
    { key: 'musteriAd',         header: t('common.customer'),     sortable: true },
    { key: 'mUlke',             header: t('common.country'),      sortable: true },
    { key: 'siparisMiTeklifMi', header: t('common.stage'),        sortable: true, render: (r) => <StatusBadge value={r.siparisMiTeklifMi as string} /> },
    { key: 'fabrikaNot',        header: t('common.note'),         render: (r) => <span className="text-sm text-muted-foreground">{(r.fabrikaNot as string) ?? '—'}</span> },
    { key: 'sTarih',            header: t('common.startDate'),    render: (r) => r.sTarih ? formatDate(r.sTarih as string) : '—' },
    { key: 'tarih',             header: t('common.date'),         sortable: true, render: (r) => formatDate(r.tarih as string) },
    {
      key: 'actions',
      header: t('common.actions'),
      render: (r) => (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setDetailNo(r.siparisNo as string)}>{t('common.form')}</Button>
          <Button size="sm" variant="ghost" onClick={() => handleExcel(r.siparisNo as string)}>{t('common.excel')}</Button>
          {(r.siparisMiTeklifMi as string) === 'Planlama' && (
            <Button size="sm" onClick={() => { setProductionTarget(r.siparisNo as string) }}>
              Üretime Al
            </Button>
          )}
          {(r.siparisMiTeklifMi as string) === 'Uretim' && (
            <Button size="sm" variant="secondary" onClick={() => readyMut.mutate(r.siparisNo as string)} disabled={readyMut.isPending}>
              Hazır
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
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1 w-48">
            <Label>{t('common.stage')}</Label>
            <Select value={asama ?? 'all'} onValueChange={(v) => setAsama(v === 'all' ? undefined : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                {FACTORY_ASAMALAR.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DataTable
          columns={columns}
          data={data as (FactoryOrderListDto & Record<string, unknown>)[]}
          keyField="siparisNo"
          loading={isLoading}
        />
      </div>

      <Dialog open={!!productionTarget} onOpenChange={() => setProductionTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Üretime Al — {productionTarget}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Üretim Tarihi</Label>
              <Input type="datetime-local" value={sTarih} onChange={(e) => setSTarih(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Fabrika Notu</Label>
              <Textarea
                placeholder="Fabrika notu girin..."
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

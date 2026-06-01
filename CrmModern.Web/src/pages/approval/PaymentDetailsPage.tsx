import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  getPendingPayment, getPurchaseById, setPaymentDetails,
  type SetPaymentDetailsRequest,
} from '@/api/purchase'
import { PageHeader } from '@/components/PageHeader'
import { DataTable, type Column } from '@/components/DataTable'
import { PurchaseStatusBadge } from '@/components/PurchaseStatusBadge'
import { DynamicPaymentForm } from '@/components/DynamicPaymentForm'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ToastProvider'
import { formatDate, formatCurrency } from '@/lib/utils'
import type { PurchaseRequestListDto } from '@/types'

const empty: SetPaymentDetailsRequest = { odemeTuru: '' }

export function PaymentDetailsPage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation()
  const [target, setTarget] = useState<number | null>(null)
  const [form, setForm] = useState<SetPaymentDetailsRequest>(empty)

  const { data: pending = [], isLoading } = useQuery({
    queryKey: ['payment-pending'], queryFn: getPendingPayment,
  })
  const { data: detail } = useQuery({
    queryKey: ['payment-detail', target],
    queryFn: () => getPurchaseById(target!),
    enabled: !!target,
  })

  const saveMut = useMutation({
    mutationFn: () => setPaymentDetails(target!, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payment-pending'] })
      qc.invalidateQueries({ queryKey: ['preapproval'] })
      qc.invalidateQueries({ queryKey: ['final-pending'] })
      setTarget(null); setForm(empty)
      toast({ title: 'Ödeme detayı kaydedildi (Muhasebe Tamamlandı)' })
    },
    onError: (e: unknown) => toast({ title: 'Kayıt başarısız', description: (e as Error).message, variant: 'destructive' }),
  })

  const cols: Column<PurchaseRequestListDto & Record<string, unknown>>[] = [
    { key: 'talepID',       header: 'ID', sortable: true },
    { key: 'urunAdi',       header: 'Ürün' },
    { key: 'urunMaliyeti',  header: 'Maliyet', render: (r) => formatCurrency((r.urunMaliyeti as number) ?? 0) },
    { key: 'departman',     header: 'Departman' },
    { key: 'talepEdenKullaniciAdi', header: 'Talep Eden' },
    { key: 'talepTarihi',   header: 'Tarih', render: (r) => formatDate(r.talepTarihi as string) },
    { key: 'durum',         header: 'Durum', render: (r) => <PurchaseStatusBadge value={r.durum as string} /> },
    {
      key: 'actions', header: 'İşlem',
      render: (r) => (
        <Button size="sm" onClick={() => { setTarget(r.talepID as number); setForm(empty) }}>
          Ödeme Detayı Gir
        </Button>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title="Ödeme Detayı (Muhasebe)" description="SatinAlmaTakipForm portu — Aşama 2, dinamik panel" />
      <div className="p-6">
        <DataTable columns={cols} data={pending as (PurchaseRequestListDto & Record<string, unknown>)[]} keyField="talepID" loading={isLoading} />
      </div>

      <Dialog open={!!target} onOpenChange={() => setTarget(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ödeme Detayı — Talep #{target}</DialogTitle>
          </DialogHeader>

          {detail && (
            <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1 mb-3">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Ürün:</span> {detail.urunAdi}</div>
                <div><span className="text-muted-foreground">Maliyet:</span> {formatCurrency(detail.urunMaliyeti ?? 0)}</div>
                <div><span className="text-muted-foreground">Departman:</span> {detail.departman}</div>
                <div><span className="text-muted-foreground">Talep Eden:</span> {detail.talepEdenKullaniciAdi}</div>
                {detail.notlar && <div className="col-span-2"><span className="text-muted-foreground">Not:</span> {detail.notlar}</div>}
                {detail.onIzlemeYapan && <div className="col-span-2 text-xs text-blue-700">Ön Onaylayan: {detail.onIzlemeYapan} · {detail.onIzlemeTarihi ? formatDate(detail.onIzlemeTarihi) : ''}</div>}
              </div>
            </div>
          )}

          <DynamicPaymentForm value={form} onChange={setForm} disabled={saveMut.isPending} />

          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)}>İptal</Button>
            <Button disabled={!form.odemeTuru || saveMut.isPending} onClick={() => saveMut.mutate()}>
              {saveMut.isPending ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

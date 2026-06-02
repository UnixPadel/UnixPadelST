import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getReadyForShipment, createShipment, getCarriers, getCesitler } from '@/api/logistics'
import { PageHeader } from '@/components/PageHeader'
import { DataTable, type Column } from '@/components/DataTable'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { OrderDetailModal } from '@/components/OrderDetailModal'
import { useToast } from '@/components/ToastProvider'
import { formatDate } from '@/lib/utils'
import type { LogisticsOrderListDto } from '@/types'

const blank = () => ({
  firmaAdi: '', lojistikCesit: '', fiyat: 0, lNot: '',
  sTarih: new Date().toISOString().slice(0, 10),
  lojistikNot: '',
})

export function LogisticsReadyPage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation()
  const [target, setTarget] = useState<string | null>(null)
  const [form, setForm] = useState(blank())
  const [detailNo, setDetailNo] = useState<string | null>(null)

  const { data: ready = [], isLoading } = useQuery({
    queryKey: ['logistics-ready'], queryFn: getReadyForShipment,
  })
  const { data: carriers = [] } = useQuery({ queryKey: ['carriers'], queryFn: getCarriers })
  const { data: cesitler = [] } = useQuery({ queryKey: ['cesitler'], queryFn: getCesitler })

  const createMut = useMutation({
    mutationFn: () => createShipment({ siparisNo: target!, ...form }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['logistics-ready'] })
      qc.invalidateQueries({ queryKey: ['logistics-history'] })
      qc.invalidateQueries({ queryKey: ['logistics-pending-approval'] })
      qc.invalidateQueries({ queryKey: ['carriers'] })
      qc.invalidateQueries({ queryKey: ['cesitler'] })
      setTarget(null); setForm(blank())
      // Paket 3: yeni akış — sevk talebi muhasebe onayını bekler.
      toast({ title: 'Sevk talebi oluşturuldu — Muhasebe onayı bekliyor.' })
    },
    onError: () => toast({ title: 'Hata', variant: 'destructive' }),
  })

  const cols: Column<LogisticsOrderListDto & Record<string, unknown>>[] = [
    { key: 'siparisNo',         header: 'Sipariş No', sortable: true },
    { key: 'musteriAd',         header: 'Müşteri',    sortable: true },
    { key: 'mUlke',             header: 'Ülke' },
    { key: 'siparisMiTeklifMi', header: 'Aşama', render: (r) => <StatusBadge value={r.siparisMiTeklifMi as string} /> },
    { key: 'tarih',             header: 'Tarih', render: (r) => formatDate((r.tarih as string) ?? '-') },
    {
      key: 'actions', header: 'İşlem',
      render: (r) => (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setDetailNo(r.siparisNo as string)}>Detay</Button>
          <Button size="sm" onClick={() => { setTarget(r.siparisNo as string); setForm(blank()) }}>Sevkiyat Oluştur</Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title={t('logistics.readyTitle')} />
      <div className="p-6">
        <DataTable columns={cols} data={ready as (LogisticsOrderListDto & Record<string, unknown>)[]} keyField="siparisNo" loading={isLoading} />
      </div>

      <Dialog open={!!target} onOpenChange={() => setTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Sevkiyat Oluştur — {target}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Taşıyıcı / Firma</Label>
              <Input list="carriers-list" value={form.firmaAdi} onChange={(e) => setForm((f) => ({ ...f, firmaAdi: e.target.value }))} placeholder="Yeni firma yazabilirsiniz" />
              <datalist id="carriers-list">{carriers.map((c) => <option key={c} value={c} />)}</datalist>
            </div>
            <div className="space-y-1">
              <Label>Taşıma Türü</Label>
              <Input list="cesitler-list" value={form.lojistikCesit} onChange={(e) => setForm((f) => ({ ...f, lojistikCesit: e.target.value }))} placeholder="Kargo, Tır, Hava..." />
              <datalist id="cesitler-list">{cesitler.map((c) => <option key={c} value={c} />)}</datalist>
            </div>
            <div className="space-y-1"><Label>Fiyat</Label><Input type="number" value={form.fiyat} onChange={(e) => setForm((f) => ({ ...f, fiyat: Number(e.target.value) }))} /></div>
            <div className="space-y-1"><Label>Sevkiyat Tarihi</Label><Input type="date" value={form.sTarih} onChange={(e) => setForm((f) => ({ ...f, sTarih: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Lojistik Notu</Label><Textarea rows={2} value={form.lojistikNot} onChange={(e) => setForm((f) => ({ ...f, lojistikNot: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Ek Not</Label><Input value={form.lNot} onChange={(e) => setForm((f) => ({ ...f, lNot: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)}>İptal</Button>
            <Button disabled={!form.firmaAdi || !form.lojistikCesit || createMut.isPending} onClick={() => createMut.mutate()}>Sevk et</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <OrderDetailModal siparisNo={detailNo} onClose={() => setDetailNo(null)} />
    </div>
  )
}

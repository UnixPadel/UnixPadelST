import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getPendingPreApproval, preApprovePurchase, preRejectPurchase } from '@/api/purchase'
import { PageHeader } from '@/components/PageHeader'
import { DataTable, type Column } from '@/components/DataTable'
import { PurchaseStatusBadge } from '@/components/PurchaseStatusBadge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ToastProvider'
import { formatDate, formatCurrency } from '@/lib/utils'
import type { PurchaseRequestListDto } from '@/types'

export function PreApprovalPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { toast } = useToast()
  const [rejectTarget, setRejectTarget] = useState<number | null>(null)
  const [redNotu, setRedNotu] = useState('')

  const { data = [], isLoading } = useQuery({ queryKey: ['preapproval'], queryFn: getPendingPreApproval })

  const approveMut = useMutation({
    mutationFn: (id: number) => preApprovePurchase(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['preapproval'] }); toast({ title: 'Ön onaylandı' }) },
    onError: (e: unknown) => toast({ title: 'Hata', description: (e as Error).message, variant: 'destructive' }),
  })

  const rejectMut = useMutation({
    mutationFn: ({ id, not }: { id: number; not: string }) => preRejectPurchase(id, not),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['preapproval'] })
      setRejectTarget(null); setRedNotu('')
      toast({ title: 'Reddedildi' })
    },
    onError: () => toast({ title: 'Hata', variant: 'destructive' }),
  })

  const cols: Column<PurchaseRequestListDto & Record<string, unknown>>[] = [
    { key: 'talepID',       header: 'ID', sortable: true },
    { key: 'urunAdi',       header: 'Ürün' },
    { key: 'urunTuru',      header: 'Tür' },
    { key: 'urunMaliyeti',  header: 'Maliyet', render: (r) => formatCurrency((r.urunMaliyeti as number) ?? 0) },
    { key: 'alinanYer',     header: 'Alınan Yer' },
    { key: 'departman',     header: 'Departman' },
    { key: 'talepEdenKullaniciAdi', header: 'Talep Eden' },
    { key: 'talepTarihi',   header: 'Tarih', render: (r) => formatDate(r.talepTarihi as string) },
    { key: 'durum',         header: 'Durum', render: (r) => <PurchaseStatusBadge value={r.durum as string} /> },
    {
      key: 'actions', header: 'İşlem',
      render: (r) => (
        <div className="flex gap-2">
          <Button size="sm" disabled={approveMut.isPending} onClick={() => approveMut.mutate(r.talepID as number)}>Onayla</Button>
          <Button size="sm" variant="destructive" onClick={() => { setRejectTarget(r.talepID as number); setRedNotu('') }}>Reddet</Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title={t('approval.preTitle')} />
      <div className="p-6">
        <DataTable columns={cols} data={data as (PurchaseRequestListDto & Record<string, unknown>)[]} keyField="talepID" loading={isLoading} />
      </div>

      <Dialog open={rejectTarget !== null} onOpenChange={() => setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Talebi Reddet — #{rejectTarget}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Red Notu *</Label>
            <Textarea value={redNotu} onChange={(e) => setRedNotu(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>İptal</Button>
            <Button variant="destructive" disabled={!redNotu.trim() || rejectMut.isPending}
              onClick={() => rejectMut.mutate({ id: rejectTarget!, not: redNotu })}>Reddet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

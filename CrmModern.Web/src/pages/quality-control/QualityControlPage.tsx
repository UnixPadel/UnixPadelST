import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getPendingQC, approveQC, rejectQC } from '@/api/qualityControl'
import { PageHeader } from '@/components/PageHeader'
import { DataTable, type Column } from '@/components/DataTable'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { OrderDetailModal } from '@/components/OrderDetailModal'
import { useToast } from '@/components/ToastProvider'
import { formatDate, formatCurrency } from '@/lib/utils'
import type { QualityControlListDto } from '@/types'

export function QualityControlPage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation()
  const [rejectTarget, setRejectTarget] = useState<string | null>(null)
  const [redNotu, setRedNotu] = useState('')
  const [detailNo, setDetailNo] = useState<string | null>(null)

  const { data = [], isLoading } = useQuery({
    queryKey: ['quality-control'],
    queryFn: getPendingQC,
  })

  const approveMut = useMutation({
    mutationFn: (siparisNo: string) => approveQC(siparisNo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quality-control'] })
      toast({ title: t('qc.approved'), description: t('qc.approvedDesc') })
    },
    onError: () => toast({ title: t('common.error'), variant: 'destructive' }),
  })

  const rejectMut = useMutation({
    mutationFn: ({ siparisNo, red }: { siparisNo: string; red: string }) => rejectQC(siparisNo, red),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quality-control'] })
      setRejectTarget(null)
      setRedNotu('')
      toast({ title: t('qc.rejected') })
    },
    onError: () => toast({ title: t('common.error'), variant: 'destructive' }),
  })

  const columns: Column<QualityControlListDto & Record<string, unknown>>[] = [
    { key: 'siparisNo',          header: t('qc.columns.orderNo'),   sortable: true },
    { key: 'musteriAd',          header: t('qc.columns.customer'),  sortable: true },
    { key: 'mUlke',              header: t('qc.columns.country'),   sortable: true },
    { key: 'paraTipi',           header: t('qc.columns.currency'),  sortable: true },
    { key: 'toplamFiyat',        header: t('qc.columns.total'),     sortable: true, render: (r) => formatCurrency((r.toplamFiyat as number) ?? 0, r.paraTipi as string) },
    { key: 'kaparoFiyat',        header: t('qc.columns.deposit'),   sortable: true, render: (r) => formatCurrency((r.kaparoFiyat as number) ?? 0, r.paraTipi as string) },
    { key: 'kalanBakiye',        header: t('qc.columns.remaining'), sortable: true, render: (r) => formatCurrency((r.kalanBakiye as number) ?? 0, r.paraTipi as string) },
    { key: 'siparisMiTeklifMi',  header: t('qc.columns.stage'),     sortable: true, render: (r) => <StatusBadge value={r.siparisMiTeklifMi as string} /> },
    { key: 'tarih',              header: t('qc.columns.date'),      sortable: true, render: (r) => formatDate((r.tarih as string) ?? '-') },
    {
      key: 'actions',
      header: t('common.actions'),
      render: (r) => (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setDetailNo(r.siparisNo as string)}>
            {t('common.details')}
          </Button>
          <Button size="sm" onClick={() => approveMut.mutate(r.siparisNo as string)} disabled={approveMut.isPending}>
            {t('common.approve')}
          </Button>
          <Button size="sm" variant="destructive" onClick={() => setRejectTarget(r.siparisNo as string)}>
            {t('common.reject')}
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title={t('qc.title')}
        description={t('qc.pendingCount', { count: data.length })}
      />
      <div className="p-6">
        <DataTable
          columns={columns}
          data={data as (QualityControlListDto & Record<string, unknown>)[]}
          keyField="siparisNo"
          loading={isLoading}
        />
      </div>

      <Dialog open={!!rejectTarget} onOpenChange={() => { setRejectTarget(null); setRedNotu('') }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('qc.rejectTitle')} — {rejectTarget}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>{t('qc.rejectNote')}</Label>
            <Textarea
              placeholder={t('qc.rejectPlaceholder')}
              value={redNotu}
              onChange={(e) => setRedNotu(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>{t('common.cancel')}</Button>
            <Button
              variant="destructive"
              disabled={!redNotu.trim() || rejectMut.isPending}
              onClick={() => rejectMut.mutate({ siparisNo: rejectTarget!, red: redNotu })}
            >
              {t('common.reject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <OrderDetailModal siparisNo={detailNo} onClose={() => setDetailNo(null)} />
    </div>
  )
}

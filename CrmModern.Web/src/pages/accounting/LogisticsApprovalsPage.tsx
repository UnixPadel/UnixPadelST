import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  getPendingMuhasebeApproval,
  muhasebeApproveLogistics,
  muhasebeRejectLogistics,
} from '@/api/logistics'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader } from '@/components/PageHeader'
import { DataTable, type Column } from '@/components/DataTable'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ToastProvider'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { LogisticsPendingApprovalDto } from '@/types'

const GLOBAL_OBSERVER = 'elshan.rasulov'

export function LogisticsApprovalsPage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation()
  const { getUser } = useAuth()
  const user = getUser()
  const role = user?.yetkiTuru ?? ''
  const isObserver = user?.kullaniciAdi === GLOBAL_OBSERVER && role !== 'Yonetici' && role !== 'Muhasebe'
  const canMutate = role === 'Yonetici' || role === 'Muhasebe'

  const [approveTarget, setApproveTarget] = useState<LogisticsPendingApprovalDto | null>(null)
  const [aciklama, setAciklama] = useState('')
  const [rejectTarget, setRejectTarget] = useState<LogisticsPendingApprovalDto | null>(null)
  const [redNotu, setRedNotu] = useState('')

  const { data = [], isLoading } = useQuery({
    queryKey: ['logistics-pending-approval'],
    queryFn: getPendingMuhasebeApproval,
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['logistics-pending-approval'] })
    qc.invalidateQueries({ queryKey: ['logistics-history'] })
    qc.invalidateQueries({ queryKey: ['logistics-ready'] })
    // PROMPT-v5 §3 — sipariş statü geçişleri Siparişlerim'e canlı yansısın.
    qc.invalidateQueries({ queryKey: ['my-orders'] })
  }

  const approveMut = useMutation({
    mutationFn: ({ sevkId, aciklama }: { sevkId: number; aciklama?: string }) =>
      muhasebeApproveLogistics(sevkId, aciklama),
    onSuccess: () => {
      invalidate(); setApproveTarget(null); setAciklama('')
      toast({ title: t('logApprovals.toast.approved') })
    },
    onError: () => toast({ title: t('logApprovals.toast.approveFailed'), variant: 'destructive' }),
  })

  const rejectMut = useMutation({
    mutationFn: ({ sevkId, redNotu }: { sevkId: number; redNotu: string }) =>
      muhasebeRejectLogistics(sevkId, redNotu),
    onSuccess: () => {
      invalidate(); setRejectTarget(null); setRedNotu('')
      toast({ title: t('logApprovals.toast.rejected') })
    },
    onError: () => toast({ title: t('logApprovals.toast.rejectFailed'), variant: 'destructive' }),
  })

  const cols: Column<LogisticsPendingApprovalDto & Record<string, unknown>>[] = [
    { key: 'sevkId',        header: t('logApprovals.sevkId'),     sortable: true },
    { key: 'siparisNo',     header: t('common.orderNo'), sortable: true },
    { key: 'musteriAd',     header: t('common.customer'),    sortable: true },
    { key: 'firmaAdi',      header: t('logApprovals.tasiyici') },
    { key: 'lojistikCesit', header: t('logApprovals.tur') },
    { key: 'fiyat',         header: t('common.amount'),      render: (r) => formatCurrency((r.fiyat as number) ?? 0) },
    { key: 'sTarih',        header: t('logApprovals.sevkTarihi'), render: (r) => r.sTarih ? formatDate(r.sTarih as string) : '—' },
    { key: 'lojistikNot',   header: t('common.note'),
      render: (r) => <span className="text-sm text-muted-foreground">{(r.lojistikNot as string) ?? (r.lNot as string) ?? '—'}</span> },
    {
      key: 'actions', header: t('common.actions'),
      render: (r) => canMutate ? (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => { setApproveTarget(r as LogisticsPendingApprovalDto); setAciklama('') }}>
            {t('common.approve')}
          </Button>
          <Button size="sm" variant="destructive" onClick={() => { setRejectTarget(r as LogisticsPendingApprovalDto); setRedNotu('') }}>
            {t('common.reject')}
          </Button>
        </div>
      ) : null,
    },
  ]

  return (
    <div>
      <PageHeader title={t('accounting.logisticsApprovalsTitle')} />
      <div className="p-6">
        <DataTable
          columns={cols}
          data={data as (LogisticsPendingApprovalDto & Record<string, unknown>)[]}
          keyField="sevkId"
          loading={isLoading}
        />
      </div>

      <Dialog open={!!approveTarget} onOpenChange={() => setApproveTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('logApprovals.approveTitle', { id: approveTarget?.sevkId })}</DialogTitle></DialogHeader>
          <div className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">{t('logApprovals.siparis')}:</span> {approveTarget?.siparisNo} — {approveTarget?.musteriAd}</p>
            <p><span className="text-muted-foreground">{t('logApprovals.tasiyici')}:</span> {approveTarget?.firmaAdi} ({approveTarget?.lojistikCesit})</p>
            <Label>{t('logApprovals.onayAciklama')}</Label>
            <Textarea rows={3} value={aciklama} onChange={(e) => setAciklama(e.target.value)} placeholder={t('logApprovals.optional')} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveTarget(null)}>{t('common.cancel')}</Button>
            <Button
              disabled={approveMut.isPending}
              onClick={() => approveMut.mutate({ sevkId: approveTarget!.sevkId, aciklama: aciklama || undefined })}
            >{t('common.approve')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectTarget} onOpenChange={() => setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('logApprovals.rejectTitle', { id: rejectTarget?.sevkId })}</DialogTitle></DialogHeader>
          <div className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">{t('logApprovals.siparis')}:</span> {rejectTarget?.siparisNo} — {rejectTarget?.musteriAd}</p>
            <Label>{t('logApprovals.redGerekce')}</Label>
            <Textarea rows={3} value={redNotu} onChange={(e) => setRedNotu(e.target.value)} />
            <p className="text-xs text-muted-foreground">
              {t('logApprovals.rejectHint')}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>{t('common.cancel')}</Button>
            <Button
              variant="destructive"
              disabled={!redNotu.trim() || rejectMut.isPending}
              onClick={() => rejectMut.mutate({ sevkId: rejectTarget!.sevkId, redNotu })}
            >{t('common.reject')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

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
  }

  const approveMut = useMutation({
    mutationFn: ({ sevkId, aciklama }: { sevkId: number; aciklama?: string }) =>
      muhasebeApproveLogistics(sevkId, aciklama),
    onSuccess: () => {
      invalidate(); setApproveTarget(null); setAciklama('')
      toast({ title: 'Sevk onaylandı' })
    },
    onError: () => toast({ title: 'Onay başarısız', variant: 'destructive' }),
  })

  const rejectMut = useMutation({
    mutationFn: ({ sevkId, redNotu }: { sevkId: number; redNotu: string }) =>
      muhasebeRejectLogistics(sevkId, redNotu),
    onSuccess: () => {
      invalidate(); setRejectTarget(null); setRedNotu('')
      toast({ title: 'Sevk reddedildi' })
    },
    onError: () => toast({ title: 'Red başarısız', variant: 'destructive' }),
  })

  const cols: Column<LogisticsPendingApprovalDto & Record<string, unknown>>[] = [
    { key: 'sevkId',        header: 'Sevk #',     sortable: true },
    { key: 'siparisNo',     header: 'Sipariş No', sortable: true },
    { key: 'musteriAd',     header: 'Müşteri',    sortable: true },
    { key: 'firmaAdi',      header: 'Taşıyıcı' },
    { key: 'lojistikCesit', header: 'Tür' },
    { key: 'fiyat',         header: 'Fiyat',      render: (r) => formatCurrency((r.fiyat as number) ?? 0) },
    { key: 'sTarih',        header: 'Sevk Tarihi', render: (r) => r.sTarih ? formatDate(r.sTarih as string) : '—' },
    { key: 'lojistikNot',   header: 'Not',
      render: (r) => <span className="text-sm text-muted-foreground">{(r.lojistikNot as string) ?? (r.lNot as string) ?? '—'}</span> },
    {
      key: 'actions', header: 'İşlem',
      render: (r) => canMutate ? (
        <div className="flex gap-2">
          <Button size="sm" onClick={() => { setApproveTarget(r as LogisticsPendingApprovalDto); setAciklama('') }}>
            Onayla
          </Button>
          <Button size="sm" variant="destructive" onClick={() => { setRejectTarget(r as LogisticsPendingApprovalDto); setRedNotu('') }}>
            Reddet
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
          <DialogHeader><DialogTitle>Sevki Onayla — #{approveTarget?.sevkId}</DialogTitle></DialogHeader>
          <div className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Sipariş:</span> {approveTarget?.siparisNo} — {approveTarget?.musteriAd}</p>
            <p><span className="text-muted-foreground">Taşıyıcı:</span> {approveTarget?.firmaAdi} ({approveTarget?.lojistikCesit})</p>
            <Label>Onay Açıklaması</Label>
            <Textarea rows={3} value={aciklama} onChange={(e) => setAciklama(e.target.value)} placeholder="(opsiyonel)" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveTarget(null)}>İptal</Button>
            <Button
              disabled={approveMut.isPending}
              onClick={() => approveMut.mutate({ sevkId: approveTarget!.sevkId, aciklama: aciklama || undefined })}
            >Onayla</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectTarget} onOpenChange={() => setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Sevki Reddet — #{rejectTarget?.sevkId}</DialogTitle></DialogHeader>
          <div className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Sipariş:</span> {rejectTarget?.siparisNo} — {rejectTarget?.musteriAd}</p>
            <Label>Red Gerekçesi *</Label>
            <Textarea rows={3} value={redNotu} onChange={(e) => setRedNotu(e.target.value)} />
            <p className="text-xs text-muted-foreground">
              Red sonrası LojistikTablo'daki sevk satırı silinir, sipariş "Hazır"da kalır.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>İptal</Button>
            <Button
              variant="destructive"
              disabled={!redNotu.trim() || rejectMut.isPending}
              onClick={() => rejectMut.mutate({ sevkId: rejectTarget!.sevkId, redNotu })}
            >Reddet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

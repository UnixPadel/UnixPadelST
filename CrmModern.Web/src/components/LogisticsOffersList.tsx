import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getOffers, approveOffer, revokeOffer, rejectOffer } from '@/api/logisticsOffers'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { FieldError } from '@/components/FieldError'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ToastProvider'
import { formatCurrency, formatDate } from '@/lib/utils'

interface Props {
  siparisNo: string
  /** Yönetici ise onayla / reddet / onayı iptal düğmeleri gösterilir. */
  canApprove: boolean
}

/**
 * Bir siparişin lojistik tekliflerini listeler. Yönetici tek teklifi onaylar
 * (diğer onay düşer), reddeder (açıklama zorunlu) veya onayı geri alır.
 * Teklif oluşturma burada YOK — yalnız Lojistik rolü teklif girer.
 */
export function LogisticsOffersList({ siparisNo, canApprove }: Props) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const qc = useQueryClient()

  const [rejectTarget, setRejectTarget] = useState<number | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectSubmitted, setRejectSubmitted] = useState(false)

  const { data: offers = [], isLoading } = useQuery({
    queryKey: ['logistics-offers', siparisNo],
    queryFn: () => getOffers(siparisNo),
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['logistics-offers', siparisNo] })
    qc.invalidateQueries({ queryKey: ['logistics-offer-queue'] })
    qc.invalidateQueries({ queryKey: ['logistics-ready'] })
  }

  const approveMut = useMutation({
    mutationFn: (teklifId: number) => approveOffer(teklifId),
    onSuccess: () => { invalidate(); toast({ title: t('logisticsOffer.toast.approved') }) },
    onError: () => toast({ title: t('logisticsOffer.toast.error'), variant: 'destructive' }),
  })
  const revokeMut = useMutation({
    mutationFn: (teklifId: number) => revokeOffer(teklifId),
    onSuccess: () => { invalidate(); toast({ title: t('logisticsOffer.toast.revoked') }) },
    onError: () => toast({ title: t('logisticsOffer.toast.error'), variant: 'destructive' }),
  })
  const rejectMut = useMutation({
    mutationFn: ({ teklifId, redNotu }: { teklifId: number; redNotu: string }) => rejectOffer(teklifId, redNotu),
    onSuccess: () => {
      invalidate()
      setRejectTarget(null); setRejectReason(''); setRejectSubmitted(false)
      toast({ title: t('logisticsOffer.toast.rejected') })
    },
    onError: () => toast({ title: t('logisticsOffer.toast.error'), variant: 'destructive' }),
  })

  const onReject = () => {
    setRejectSubmitted(true)
    if (!rejectReason.trim() || rejectTarget == null) return
    rejectMut.mutate({ teklifId: rejectTarget, redNotu: rejectReason.trim() })
  }

  if (isLoading) return <p className="text-xs text-muted-foreground">{t('common.loading')}</p>
  if (offers.length === 0) return <p className="text-xs text-muted-foreground">{t('logisticsOffer.empty')}</p>

  return (
    <div className="space-y-2">
      {offers.map((o) => {
        const approved = o.durum === 'Onaylandi'
        const rejected = o.durum === 'Reddedildi'
        return (
          <div
            key={o.teklifID}
            className={`rounded-md border p-2 text-sm ${approved ? 'border-green-400 bg-green-50' : rejected ? 'border-red-300 bg-red-50' : ''}`}
          >
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="font-medium">{o.firmaAdi}</span>
              <span className="text-muted-foreground">{o.lojistikCesit}</span>
              <span className="font-semibold tabular-nums">{formatCurrency(o.fiyat, o.paraBirimi ?? undefined)}</span>
              {o.aciklama && <span className="text-xs text-muted-foreground">{o.aciklama}</span>}
              <span className="text-xs text-muted-foreground">{o.kullaniciAdSoyad ?? '—'}</span>
              <span className="text-xs text-muted-foreground">{formatDate(o.olusturmaTarihi)}</span>
              {approved && <Badge variant="success">{t('logisticsOffer.approved')}</Badge>}
              {rejected && <Badge variant="destructive">{t('logisticsOffer.rejected')}</Badge>}
              {!approved && !rejected && <Badge variant="secondary">{t('logisticsOffer.pending')}</Badge>}
              {canApprove && (
                <div className="ml-auto flex gap-2">
                  {approved ? (
                    <Button size="sm" variant="outline" disabled={revokeMut.isPending}
                      onClick={() => revokeMut.mutate(o.teklifID)}>{t('logisticsOffer.revoke')}</Button>
                  ) : (
                    <>
                      <Button size="sm" disabled={approveMut.isPending}
                        onClick={() => approveMut.mutate(o.teklifID)}>{t('logisticsOffer.approve')}</Button>
                      {!rejected && (
                        <Button size="sm" variant="destructive"
                          onClick={() => { setRejectTarget(o.teklifID); setRejectReason(''); setRejectSubmitted(false) }}>
                          {t('logisticsOffer.reject')}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
            {rejected && o.redNotu && (
              <p className="mt-1 text-xs text-destructive">
                <span className="font-semibold">{t('logisticsOffer.rejectedReason')}:</span> {o.redNotu}
              </p>
            )}
          </div>
        )
      })}

      {/* Red açıklaması dialogu (Yönetici) */}
      <Dialog open={rejectTarget != null}
        onOpenChange={(open) => { if (!open) { setRejectTarget(null); setRejectReason(''); setRejectSubmitted(false) } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t('logisticsOffer.rejectTitle')}</DialogTitle></DialogHeader>
          <div className="space-y-1">
            <Label>{t('logisticsOffer.rejectReason')}</Label>
            <Textarea rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
            {rejectSubmitted && !rejectReason.trim() && <FieldError message={t('validation.required')} />}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>{t('common.cancel')}</Button>
            <Button variant="destructive" disabled={rejectMut.isPending} onClick={onReject}>{t('logisticsOffer.reject')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

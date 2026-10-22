import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getOffers, approveOffer, revokeOffer, rejectOffer } from '@/api/logisticsOffers'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { useAppMutation } from '@/hooks/useAppMutation'
import { formatCurrency, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Props {
  siparisNo: string
  /** Yönetici ise onayla / reddet / onayı iptal düğmeleri gösterilir. */
  canApprove: boolean
}

/**
 * Bir siparişin lojistik tekliflerini listeler. Yönetici tek teklifi onaylar
 * (diğer onay düşer), reddeder (açıklama zorunlu — ortak gerekçe penceresi) veya
 * onayı geri alır (onaylı). Durum rengi rozetten gelir; kart çerçevesi yalnız
 * vurgudur (QW-1 tonları, dark mode uyumlu).
 */
export function LogisticsOffersList({ siparisNo, canApprove }: Props) {
  const { t } = useTranslation()
  const { confirm, askReason } = useConfirm()

  const { data: offers = [], isLoading } = useQuery({
    queryKey: ['logistics-offers', siparisNo],
    queryFn: () => getOffers(siparisNo),
  })

  const approveMut = useAppMutation({
    mutationFn: (teklifId: number) => approveOffer(teklifId),
    successTitle: t('logisticsOffer.toast.approved'),
    errorTitle: t('logisticsOffer.toast.error'),
  })
  const revokeMut = useAppMutation({
    mutationFn: (teklifId: number) => revokeOffer(teklifId),
    successTitle: t('logisticsOffer.toast.revoked'),
    errorTitle: t('logisticsOffer.toast.error'),
  })
  const rejectMut = useAppMutation({
    mutationFn: ({ teklifId, redNotu }: { teklifId: number; redNotu: string }) => rejectOffer(teklifId, redNotu),
    successTitle: t('logisticsOffer.toast.rejected'),
    errorTitle: t('logisticsOffer.toast.error'),
  })

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
            className={cn('rounded-md border p-2 text-sm', approved && 'border-success/50 bg-success-soft/40', rejected && 'border-danger/40 opacity-80')}
          >
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="font-medium">{o.firmaAdi}</span>
              <span className="text-muted-foreground">{o.lojistikCesit}</span>
              <span className="font-semibold tabular-nums">{formatCurrency(o.fiyat, o.paraBirimi ?? undefined)}</span>
              {o.aciklama && <span className="text-xs text-muted-foreground">{o.aciklama}</span>}
              <span className="text-xs text-muted-foreground">{o.kullaniciAdSoyad ?? '—'}</span>
              <span className="text-xs text-muted-foreground">{formatDate(o.olusturmaTarihi)}</span>
              {approved && <Badge variant="success">{t('logisticsOffer.approved')}</Badge>}
              {rejected && <Badge variant="danger">{t('logisticsOffer.rejected')}</Badge>}
              {!approved && !rejected && <Badge variant="warning">{t('logisticsOffer.pending')}</Badge>}
              {canApprove && (
                <div className="ml-auto flex gap-1.5">
                  {approved ? (
                    <Button size="xs" variant="outline" loading={revokeMut.isPendingFor((id) => id === o.teklifID)}
                      onClick={async () => {
                        if (await confirm({ title: t('logisticsOffer.revokeConfirm'), description: o.firmaAdi, confirmLabel: t('logisticsOffer.revoke') }))
                          revokeMut.mutate(o.teklifID)
                      }}>{t('logisticsOffer.revoke')}</Button>
                  ) : (
                    <>
                      <Button size="xs" loading={approveMut.isPendingFor((id) => id === o.teklifID)}
                        onClick={() => approveMut.mutate(o.teklifID)}>{t('logisticsOffer.approve')}</Button>
                      {!rejected && (
                        <Button size="xs" variant="destructive" loading={rejectMut.isPendingFor((v) => v.teklifId === o.teklifID)}
                          onClick={async () => {
                            const redNotu = await askReason({
                              title: t('logisticsOffer.rejectTitle'), label: t('logisticsOffer.rejectReason'),
                              description: `${o.firmaAdi} · ${formatCurrency(o.fiyat, o.paraBirimi ?? undefined)}`,
                              destructive: true, confirmLabel: t('logisticsOffer.reject'),
                            })
                            if (redNotu) rejectMut.mutate({ teklifId: o.teklifID, redNotu })
                          }}>
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
    </div>
  )
}

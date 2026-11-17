import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Info } from 'lucide-react'
import { finalizeCompletion } from '@/api/accounting'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/ui/form-field'
import { DecimalInput } from '@/components/DecimalInput'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ToastProvider'
import { toastApiError } from '@/lib/apiError'
import { formatCurrency } from '@/lib/utils'
import { localDateInput } from '@/lib/date'
import { stageLabel } from '@/lib/status'
import { invalidateOrderGraph } from '@/lib/queryKeys'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  siparisNo: string
  currentStage: string
  musteriAd?: string
  toplamFiyat?: number | null
  odenenMiktar?: number | null
  paraTipi?: string
  onSuccess?: () => void
}

/**
 * Siparişi doğrudan "Tamamlandı"ya alır (v0.3.8 yetkisi). Kapatma aradaki adımları
 * atladığı için pencere "Ne olacak?" listesini butondan önce gösterir.
 */
export function CompleteOrderModal({
  open,
  onOpenChange,
  siparisNo,
  currentStage,
  musteriAd,
  toplamFiyat,
  odenenMiktar,
  paraTipi = 'TRY',
  onSuccess,
}: Props) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const qc = useQueryClient()

  const [kapanisNotu, setKapanisNotu] = useState('')
  const [pesinat, setPesinat] = useState<number | null>(null)
  // Yerel tarih (toISOString UTC verir; TR'de 00:00–03:00 arası bir gün geride kalırdı).
  const [pesinatTarihi, setPesinatTarihi] = useState(() => localDateInput())
  const [finalMaliyet, setFinalMaliyet] = useState<number | null>(null)
  const [maliyetDetayi, setMaliyetDetayi] = useState('')

  const toplam = toplamFiyat ?? 0
  const odenen = odenenMiktar ?? 0
  const kalanBakiye = Math.max(0, toplam - odenen)
  const isEarlyCompletion = currentStage !== 'TamamlanmaBekliyor'

  const finalizeMut = useMutation({
    mutationFn: () =>
      finalizeCompletion(siparisNo, {
        pesinat: pesinat && pesinat > 0 ? pesinat : undefined,
        pesinatTarihi: pesinat && pesinat > 0 && pesinatTarihi ? pesinatTarihi : undefined,
        finalMaliyet: finalMaliyet && finalMaliyet > 0 ? finalMaliyet : undefined,
        maliyetDetayi: maliyetDetayi.trim() || undefined,
        kapanisNotu: kapanisNotu.trim() || undefined,
      }),
    onSuccess: () => {
      // Sipariş bekleyen listelerden çıkar; sonuç ekrandan kaybolduğu için toast.
      toast({ title: t('completeOrder.done'), description: t('completeOrder.doneDesc', { no: siparisNo }), variant: 'success', popup: true })
      void invalidateOrderGraph(qc)
      onOpenChange(false)
      onSuccess?.()
    },
    onError: (err) => toastApiError(toast, t('common.error'), err),
  })

  const handleClose = () => {
    if (!finalizeMut.isPending) onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent size="md" className="space-y-4">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-danger" aria-hidden />
            <DialogTitle>{t('completeOrder.title')}</DialogTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="font-mono font-medium text-foreground">{siparisNo}</span>
            {musteriAd && <span> · {musteriAd}</span>}
          </p>
        </DialogHeader>

        {isEarlyCompletion && (
          <div className="flex items-start gap-2.5 rounded-md border border-warning/40 bg-warning-soft p-3 text-sm text-warning-soft-foreground">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <div className="space-y-0.5">
              <p className="font-semibold">{t('completeOrder.earlyTitle')}</p>
              <p>{t('completeOrder.earlyBody', { stage: stageLabel(t, currentStage) })}</p>
            </div>
          </div>
        )}

        {/* Finansal özet */}
        <div className="grid grid-cols-3 gap-2 rounded-lg border bg-muted p-3 text-center text-sm">
          <div>
            <div className="text-xs text-muted-foreground">{t('completeOrder.total')}</div>
            <div className="mt-0.5 font-semibold tabular-nums">{formatCurrency(toplam, paraTipi)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">{t('completeOrder.paid')}</div>
            <div className="mt-0.5 font-semibold tabular-nums text-success">{formatCurrency(odenen, paraTipi)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">{t('completeOrder.remaining')}</div>
            <div className={`mt-0.5 font-semibold tabular-nums ${kalanBakiye > 0 ? 'text-warning' : 'text-muted-foreground'}`}>
              {formatCurrency(kalanBakiye, paraTipi)}
            </div>
          </div>
        </div>

        {kalanBakiye > 0 && (
          <div className="flex items-start gap-2 rounded-md border border-info/30 bg-info-soft p-2.5 text-sm text-info-soft-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{t('completeOrder.remainingNote')}</span>
          </div>
        )}

        <div className="space-y-3">
          <FormField label={t('completeOrder.kapanisNotu')} hint={t('completeOrder.optional')}>
            <Textarea
              rows={2}
              placeholder={t('completeOrder.kapanisNotuPh')}
              value={kapanisNotu}
              onChange={(e) => setKapanisNotu(e.target.value)}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label={t('completeOrder.pesinat')} hint={t('completeOrder.optional')}>
              <DecimalInput
                placeholder="0,00"
                value={pesinat ?? ''}
                onValueChange={(v: number | '') => setPesinat(v === '' ? null : v)}
              />
            </FormField>
            <FormField label={t('completeOrder.pesinatTarihi')}>
              <Input type="date" value={pesinatTarihi} onChange={(e) => setPesinatTarihi(e.target.value)} />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label={t('completeOrder.finalMaliyet')}
              hint={isEarlyCompletion ? t('completeOrder.optional') : t('completeOrder.finalMaliyetHint')}>
              <DecimalInput
                placeholder="0,00"
                value={finalMaliyet ?? ''}
                onValueChange={(v: number | '') => setFinalMaliyet(v === '' ? null : v)}
              />
            </FormField>
            <FormField label={t('completeOrder.maliyetDetayi')} hint={t('completeOrder.optional')}>
              <Input
                placeholder={t('completeOrder.maliyetDetayiPh')}
                value={maliyetDetayi}
                onChange={(e) => setMaliyetDetayi(e.target.value)}
              />
            </FormField>
          </div>
        </div>

        {/* Etki önizlemesi: kullanıcı butona basmadan sonucu görür. */}
        <div className="rounded-md border p-3 text-sm">
          <p className="font-semibold">{t('completeOrder.impactTitle')}</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            <li>{t('completeOrder.impactClosed')}</li>
            {pesinat !== null && pesinat > 0 && <li>{t('completeOrder.impactPayment')}</li>}
          </ul>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button variant="outline" onClick={handleClose} disabled={finalizeMut.isPending}>
            {t('common.cancel')}
          </Button>
          <Button variant="destructive" loading={finalizeMut.isPending} onClick={() => finalizeMut.mutate()}>
            {t('completeOrder.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

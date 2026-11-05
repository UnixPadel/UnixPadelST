import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react'
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
import { DecimalInput } from '@/components/DecimalInput'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ToastProvider'
import { toastApiError } from '@/lib/apiError'
import { formatCurrency } from '@/lib/utils'

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
  const [pesinatTarihi, setPesinatTarihi] = useState(new Date().toISOString().slice(0, 10))
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
      toast({
        title: 'Sipariş Tamamlandı',
        description: `${siparisNo} başarıyla "Tamamlandı" statüsüne alındı.`,
        variant: 'success',
      })
      qc.invalidateQueries({ queryKey: ['order', siparisNo] })
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['accounting-orders'] })
      qc.invalidateQueries({ queryKey: ['quality-control'] })
      qc.invalidateQueries({ queryKey: ['factory-orders'] })
      qc.invalidateQueries({ queryKey: ['logistics-history'] })
      qc.invalidateQueries({ queryKey: ['logistics-ready'] })
      qc.invalidateQueries({ queryKey: ['nav-counts'] })
      onOpenChange(false)
      onSuccess?.()
    },
    onError: (err) => toastApiError(toast, t('common.error'), err),
  })

  const handleClose = () => {
    if (!finalizeMut.isPending) {
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent size="md" className="space-y-4">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <DialogTitle>Siparişi Tamamla</DialogTitle>
          </div>
          <p className="text-xs text-muted-foreground">
            <span className="font-mono font-medium">{siparisNo}</span>
            {musteriAd && <span> · {musteriAd}</span>}
          </p>
        </DialogHeader>

        {isEarlyCompletion && (
          <div className="flex items-start gap-2.5 rounded-md border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs text-amber-900 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold">Doğrudan Kapatma Uyarısı</span>
              <p className="text-amber-800/90 dark:text-amber-300/90">
                Bu sipariş şu anda <strong>{currentStage}</strong> aşamasındadır. Tüm ara adımlar atlanarak sipariş &quot;tamamlandı&quot; sayılıp kapatılacaktır.
              </p>
            </div>
          </div>
        )}

        {/* Finansal Özet */}
        <div className="grid grid-cols-3 gap-2 rounded-lg border bg-muted/30 p-2.5 text-center text-xs">
          <div>
            <div className="text-muted-foreground text-[11px]">Toplam Tutar</div>
            <div className="font-semibold tabular-nums mt-0.5">{formatCurrency(toplam, paraTipi)}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-[11px]">Ödenen</div>
            <div className="font-semibold tabular-nums mt-0.5 text-success">{formatCurrency(odenen, paraTipi)}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-[11px]">Kalan Bakiye</div>
            <div className={`font-semibold tabular-nums mt-0.5 ${kalanBakiye > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
              {formatCurrency(kalanBakiye, paraTipi)}
            </div>
          </div>
        </div>

        {kalanBakiye > 0 && (
          <div className="flex items-center gap-2 rounded border border-blue-500/30 bg-blue-500/5 p-2 text-[11px] text-blue-900 dark:text-blue-200">
            <Info className="h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
            <span>Kalan bakiye bulunmaktadır. Sipariş tamamlandıktan sonra da Muhasebe ekranından tahsilat eklenebilir.</span>
          </div>
        )}

        {/* Form Alanları */}
        <div className="space-y-3 text-xs">
          <div>
            <label className="mb-1 block font-medium text-foreground">
              Kapanış Notu / Açıklama <span className="text-muted-foreground font-normal">(opsiyonel)</span>
            </label>
            <Textarea
              rows={2}
              placeholder="Örn: Erken teslim edildi, müşteri talebiyle kapatıldı..."
              value={kapanisNotu}
              onChange={(e) => setKapanisNotu(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block font-medium text-foreground">
                Tahsilat / Peşinat <span className="text-muted-foreground font-normal">(opsiyonel)</span>
              </label>
              <DecimalInput
                placeholder="0,00"
                value={pesinat ?? ''}
                onValueChange={(v: number | '') => setPesinat(v === '' ? null : v)}
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-foreground">
                Tahsilat Tarihi
              </label>
              <Input
                type="date"
                value={pesinatTarihi}
                onChange={(e) => setPesinatTarihi(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block font-medium text-foreground">
                Final Maliyet <span className="text-muted-foreground font-normal">({isEarlyCompletion ? 'opsiyonel' : 'Maliyet Reçetesi'})</span>
              </label>
              <DecimalInput
                placeholder="0,00"
                value={finalMaliyet ?? ''}
                onValueChange={(v: number | '') => setFinalMaliyet(v === '' ? null : v)}
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-foreground">
                Maliyet Detayı <span className="text-muted-foreground font-normal">(opsiyonel)</span>
              </label>
              <Input
                placeholder="Maliyet açıklaması"
                value={maliyetDetayi}
                onChange={(e) => setMaliyetDetayi(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" size="sm" onClick={handleClose} disabled={finalizeMut.isPending}>
            Vazgeç
          </Button>
          <Button
            size="sm"
            className="rounded-none bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-medium shadow-xs border border-red-700 dark:border-red-500 transition-colors"
            loading={finalizeMut.isPending}
            onClick={() => finalizeMut.mutate()}
          >
            <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
            Siparişi Tamamla
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

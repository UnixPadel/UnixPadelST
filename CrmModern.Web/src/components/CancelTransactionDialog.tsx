import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { cancelTransaction } from '@/api/accounting'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ToastProvider'
import { describeApiError } from '@/lib/axios'
import { formatCurrency, formatDate } from '@/lib/utils'

/**
 * Yanlış girilen tahsilat/peşinat iptali — tahsilat geçmişi gösterilen her
 * yerde (Muhasebe Onay, Talep Detayları, Muhasebe Geçmişi) ortak.
 * Satır silinmez: sunucu iptal olarak işaretler, Ödenen/Kalan Bakiye'yi
 * yeniden hesaplar. Buton yalnız Muhasebe Onay kullanıcılarına gösterilmeli
 * (`isAccountingApprover`); backend de aynı kapıyı uygular.
 */
export interface CancelTxTarget {
  id: number
  siparisNo: string
  odenenMiktar: number | null
  tarih: string
  paraTipi?: string | null
  /** Verilirse "Kalan Bakiye: X → Y" önizlemesi gösterilir. */
  kalanBakiye?: number | null
}

export function CancelTxButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation()
  return (
    <Button size="sm" variant="ghost"
      className="h-6 w-6 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
      title={t('accApproval.cancelTx.action')}
      aria-label={t('accApproval.cancelTx.action')}
      onClick={(e) => { e.stopPropagation(); onClick() }}>
      <X className="h-4 w-4" strokeWidth={2.5} />
    </Button>
  )
}

export function CancelTransactionDialog({ target, onClose }: {
  target: CancelTxTarget | null
  onClose: () => void
}) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const qc = useQueryClient()

  const mut = useMutation({
    mutationFn: (id: number) => cancelTransaction(id),
    onSuccess: () => {
      // Tahsilat / bakiye gösteren tüm listeler.
      for (const key of ['accounting-orders', 'order-detail', 'acc-approval-tx', 'order-tx', 'tx-history']) {
        qc.invalidateQueries({ queryKey: [key] })
      }
      onClose()
      toast({ title: t('accApproval.cancelTx.done') })
    },
    onError: (e) => toast({ title: t('common.error'), description: describeApiError(e), variant: 'destructive' }),
  })

  const pt = target?.paraTipi ?? undefined
  return (
    <Dialog open={!!target} onOpenChange={(o) => { if (!o && !mut.isPending) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>{t('accApproval.cancelTx.title', { no: target?.siparisNo ?? '' })}</DialogTitle></DialogHeader>
        {target && (
          <div className="space-y-2 text-xs">
            <div className="grid grid-cols-2 gap-1.5">
              <div className="space-y-0.5">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t('qc.tx.odenenBakiye')}</p>
                <div className="rounded border bg-muted/40 px-1.5 py-1">{formatCurrency(target.odenenMiktar ?? 0, pt)}</div>
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t('qc.tx.tarih')}</p>
                <div className="rounded border bg-muted/40 px-1.5 py-1">{formatDate(target.tarih)}</div>
              </div>
            </div>
            {target.kalanBakiye != null && (
              <p className="rounded border bg-muted/40 px-2 py-1">
                {t('accApproval.cancelTx.preview', {
                  once:  formatCurrency(target.kalanBakiye, pt),
                  sonra: formatCurrency(target.kalanBakiye + (target.odenenMiktar ?? 0), pt),
                })}
              </p>
            )}
            <p className="text-[10px] text-muted-foreground">{t('accApproval.cancelTx.hint')}</p>
          </div>
        )}
        <DialogFooter>
          <Button size="sm" variant="outline" disabled={mut.isPending} onClick={onClose}>
            {t('accApproval.cancelTx.dismiss')}
          </Button>
          <Button size="sm" variant="destructive" disabled={mut.isPending}
            onClick={() => { if (target) mut.mutate(target.id) }}>
            {t('accApproval.cancelTx.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

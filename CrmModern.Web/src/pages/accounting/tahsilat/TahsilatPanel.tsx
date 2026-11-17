import { useTranslation } from 'react-i18next'
import { MousePointerClick, Wallet } from 'lucide-react'
import { AccountingFolderButton } from '@/components/order/AccountingFolder'
import { DecimalInput } from '@/components/DecimalInput'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { formatCurrency } from '@/lib/utils'
import type { AccountingOrderListDto, AccountingTransactionDto } from '@/types'
import { PaymentSummary, PaymentsList } from '../approval/PaymentSummary'

/**
 * Muhasebe · Tahsilat paneli (sağda, hep açık) — Muhasebe · Onaylar'daki karar
 * paneliyle aynı düzen:
 *   üstte (kayar)  : kim (+ Muhasebe Klasörü) → ödeme özeti → tahsilatlar → `children`
 *                    (Maliyet ve Ek maliyet; kapalı gelen bölümler)
 *   altta (sabit)  : yeni tahsilat (tutar + tarih) → tek ana buton
 * Eski üst panelin (6 sekme) ve ayrı "Tahsilat" penceresinin yerini alır. Müşteri,
 * teslimat ve satış temsilcisi ayrıntıları "Siparişi Aç" ile sipariş detayındadır.
 *
 * Tutar önceden doldurulmaz (hep açık panelde yanlışlıkla kaydetmeyi önler);
 * "Kalan bakiyeyi yaz" tek tıkla doldurur.
 */
export function TahsilatPanel({
  row, emptyText, transactions, onCancelTx, onOpenFolder,
  tutar, onTutar, tarih, onTarih, pending, onSave, amountRef, children,
}: {
  row: AccountingOrderListDto | null
  emptyText: string
  transactions: AccountingTransactionDto[]
  /** Verilmezse tahsilat iptali gösterilmez. */
  onCancelTx?: (tx: AccountingTransactionDto) => void
  onOpenFolder: () => void
  tutar: number | null
  onTutar: (v: number | null) => void
  tarih: string
  onTarih: (v: string) => void
  pending: boolean
  onSave: () => void
  amountRef?: React.Ref<HTMLInputElement>
  children?: React.ReactNode
}) {
  const { t } = useTranslation()

  if (!row) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-10 text-center text-muted-foreground">
        <MousePointerClick className="h-8 w-8" aria-hidden />
        <p className="text-sm">{emptyText}</p>
      </div>
    )
  }

  const kalan = Math.max(row.kalanBakiye ?? 0, 0)
  const blocked = (tutar ?? 0) > 0 ? null : t('accApproval.step.needAmount')

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-4 pb-2">
        {/* Kim: müşteri, ülke, aşama, ödeme durumu — sağında siparişin belgeleri. */}
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="break-words text-base font-semibold">{row.musteriAd}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              {row.mUlke && <span>{row.mUlke}</span>}
              <StatusBadge value={row.siparisMiTeklifMi} context="stage" />
              <StatusBadge value={row.odemeDurum} context="odeme" />
            </div>
          </div>
          <AccountingFolderButton siparisNo={row.siparisNo} onClick={onOpenFolder} className="shrink-0" />
        </div>

        <PaymentSummary row={row} transactions={transactions} />
        <PaymentsList row={row} transactions={transactions} onCancel={onCancelTx} />
        {children}
      </div>

      {/* İşlem bölgesi (sabit): yeni tahsilat + tek ana buton. */}
      <form aria-label={t('accounting.tahsilat.formTitle')} className="shrink-0 space-y-2 border-t bg-card px-4 py-2"
        onSubmit={(e) => { e.preventDefault(); if (!blocked && !pending) onSave() }}>
        <div className="grid grid-cols-2 gap-3">
          <FormField label={`${t('accounting.tahsilat.tutar')} (${row.paraTipi ?? ''})`}>
            <DecimalInput ref={amountRef} value={tutar ?? ''} placeholder="0,00"
              onValueChange={(v) => onTutar(v === '' ? null : v)} />
          </FormField>
          <FormField label={t('common.date')}>
            <Input type="date" value={tarih} onChange={(e) => onTarih(e.target.value)} />
          </FormField>
        </div>
        {/* Buton yüksekliğinde ayrı satır yerine tek satırlık bağlantı. */}
        {kalan > 0 && tutar !== kalan && (
          <button type="button" className="block text-left text-sm font-medium text-primary underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-none"
            onClick={() => onTutar(kalan)}>
            {t('accounting.tahsilat.fillRemaining', { amount: formatCurrency(kalan, row.paraTipi) })}
          </button>
        )}
        <Button type="submit" size="lg" className="w-full" wrapperClassName="w-full" loading={pending}
          disabled={!!blocked} disabledReason={blocked}>
          <Wallet className="h-4 w-4" aria-hidden /> {t('accounting.tahsilat.save')}
        </Button>
      </form>
    </div>
  )
}

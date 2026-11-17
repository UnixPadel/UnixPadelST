import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MousePointerClick } from 'lucide-react'
import { AccountingFolderButton } from '@/components/order/AccountingFolder'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { SectionTitle } from '@/components/ui/section-title'
import type { AccountingOrderListDto, AccountingTransactionDto } from '@/types'
import { PaymentSummary, PaymentsList } from './PaymentSummary'
import { StepForm } from './StepForm'
import type { FinalizeForm, PesinatForm, StepMode } from './views'

/**
 * Muhasebe · Onaylar karar paneli (sağda, hep açık). Tek sütun, sekmesiz:
 *   üstte (kayar)  : kim (+ Muhasebe Klasörü) → ödeme özeti → tahsilatlar → sipariş notu
 *   altta (sabit)  : peşinat formu → tek ana buton → sonraki adım
 * Eski üç kartın (5 sekmeli detay + Özet + Cari) yerini alır. Müşteri, teslimat,
 * satış temsilcisi ve kalem ayrıntıları "Siparişi Aç" ile sipariş detayındadır;
 * proforma ve Satıcı Ek Muhasebe Klasörü'nün içindedir.
 *
 * Karar bölgesi ayrı bir flex bölgesidir: 1366×768'de de peşinat alanı ve onay
 * butonu kaydırmadan görünür ve hiçbir alanı örtmez (önceki `sticky` butonlar
 * tarih ve not alanlarının üstüne biniyordu).
 */
export function DecisionPanel({
  row, mode, transactions, siparisNotu, nextStep,
  pesinatForm, onPesinatChange, finalizeForm, onFinalizeChange,
  pending, onPrimary, onCancelTx, onOpenFolder,
}: {
  row: AccountingOrderListDto | null
  mode: StepMode
  transactions: AccountingTransactionDto[]
  siparisNotu?: string | null
  /** "Sonraki adım" metni (iş akışı zincirinden); yoksa satır gösterilmez. */
  nextStep?: string
  pesinatForm: PesinatForm
  onPesinatChange: (patch: Partial<PesinatForm>) => void
  finalizeForm: FinalizeForm
  onFinalizeChange: (patch: Partial<FinalizeForm>) => void
  pending: boolean
  onPrimary: () => void
  onCancelTx: (tx: AccountingTransactionDto) => void
  onOpenFolder: () => void
}) {
  const { t } = useTranslation()
  const [noteOpen, setNoteOpen] = useState(false)

  if (!row) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-10 text-center text-muted-foreground">
        <MousePointerClick className="h-8 w-8" aria-hidden />
        <p className="text-sm">{t('accApproval.empty.select')}</p>
      </div>
    )
  }

  const nextPesinatNo = transactions.filter((tx) => !tx.iptal).length + 1
  const note = (siparisNotu ?? '').trim()
  const longNote = note.length > 110

  const primaryLabel = mode === 'kapanis' ? t('accApproval.actions.tamamla')
    : mode === 'lojistik' ? t('accApproval.actions.lojistikOnayla')
      : mode === 'ek' ? t('accApproval.actions.pesinatKaydet')
        : t('accApproval.actions.cariOnayla')
  // Buton pasifse sebebi altında yazar (yalnız ipucu değil).
  const blocked = mode === 'kapanis' && (finalizeForm.finalMaliyet ?? -1) < 0 ? t('accApproval.finalize.needCost')
    : mode === 'ek' && !((pesinatForm.pesinat ?? 0) > 0) ? t('accApproval.step.needAmount')
      : null

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-4 pb-2">
        {/* Kim: müşteri, ülke, aşama, teslim şekli — sağında siparişin belgeleri (tek ikincil buton). */}
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="break-words text-base font-semibold">{row.musteriAd}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              {row.mUlke && <span>{row.mUlke}</span>}
              <StatusBadge value={row.siparisMiTeklifMi} context="stage" />
              {row.teslimatCesiti && <span>{t('accApproval.fields.teslimatCesiti')}: <span className="text-foreground">{row.teslimatCesiti}</span></span>}
            </div>
          </div>
          <AccountingFolderButton siparisNo={row.siparisNo} onClick={onOpenFolder} className="shrink-0" />
        </div>

        <PaymentSummary row={row} transactions={transactions} showLogisticsOffer={mode === 'lojistik'} />
        <PaymentsList row={row} transactions={transactions} onCancel={onCancelTx} />

        {note && (
          <section className="space-y-1">
            <SectionTitle>{t('accApproval.fields.siparisNotu')}</SectionTitle>
            <p className={`whitespace-pre-wrap break-words text-sm ${longNote && !noteOpen ? 'line-clamp-2' : ''}`}>{note}</p>
            {longNote && (
              <Button size="xs" variant="ghost" onClick={() => setNoteOpen((o) => !o)}>
                {noteOpen ? t('accApproval.note.less') : t('accApproval.note.more')}
              </Button>
            )}
          </section>
        )}
      </div>

      {/* Karar bölgesi (sabit): peşinat formu + tek ana buton + sonraki adım. */}
      <div className="shrink-0 space-y-2 border-t bg-card px-4 py-2">
        {mode === 'none' ? (
          <p className="text-sm text-muted-foreground">{t('accApproval.empty.noAction')}</p>
        ) : (
          <>
            <StepForm mode={mode} nextPesinatNo={nextPesinatNo}
              pesinatForm={pesinatForm} onPesinatChange={onPesinatChange}
              finalizeForm={finalizeForm} onFinalizeChange={onFinalizeChange} />
            <Button size="lg" className="w-full" wrapperClassName="w-full" loading={pending}
              disabled={!!blocked} disabledReason={blocked} onClick={onPrimary}>
              {primaryLabel}
            </Button>
            {/* Kapanış'ta sonrası yok ("Siparişi Kapat" zaten söylüyor); kuyruk dışında aşama değişmez. */}
            {nextStep && (mode === 'cari' || mode === 'lojistik') && (
              <p className="text-sm"><span className="font-semibold">{t('confirm.nextStep')}:</span> {nextStep}</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}

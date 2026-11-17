import { useTranslation } from 'react-i18next'
import { DecimalInput } from '@/components/DecimalInput'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { FinalizeForm, PesinatForm, StepMode } from './views'

/**
 * Adıma özel form — karar bölgesinde, ana butonun hemen üstünde durur (kaydırma
 * gerektirmez). Başlık hangi peşinatın girildiğini söyler; etiketler alanın
 * üstünde sabittir. Cari / Lojistik / kuyruk dışı: tutar + tarih. Kapanış:
 * 3. peşinat, tarih, son maliyet (zorunlu) ve maliyet notu.
 */
export function StepForm({
  mode, nextPesinatNo, pesinatForm, onPesinatChange, finalizeForm, onFinalizeChange,
}: {
  mode: Exclude<StepMode, 'none'>
  /** Kuyruk dışı siparişte sıradaki peşinat numarası (başlık için). */
  nextPesinatNo: number
  pesinatForm: PesinatForm
  onPesinatChange: (patch: Partial<PesinatForm>) => void
  finalizeForm: FinalizeForm
  onFinalizeChange: (patch: Partial<FinalizeForm>) => void
}) {
  const { t } = useTranslation()
  const optional = <span className="font-normal text-muted-foreground"> · {t('accApproval.step.optional')}</span>

  if (mode === 'kapanis') {
    return (
      // Başlık yok: dört alanın etiketi kendini anlatır; kısa ekranda ödeme özetine yer kalır.
      <section aria-label={t('accApproval.step.kapanis')}>
        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
          <FormField label={<>{t('accApproval.finalize.pesinat')}{optional}</>}>
            <DecimalInput value={finalizeForm.pesinat ?? ''} placeholder="0,00"
              onValueChange={(v) => onFinalizeChange({ pesinat: v === '' ? null : v })} />
          </FormField>
          <FormField label={t('accApproval.finalize.pesinatTarihi')}>
            <Input type="date" value={finalizeForm.pesinatTarihi}
              onChange={(e) => onFinalizeChange({ pesinatTarihi: e.target.value })} />
          </FormField>
          <FormField label={t('accApproval.finalize.finalMaliyet')} required>
            <DecimalInput value={finalizeForm.finalMaliyet ?? ''} placeholder="0,00"
              onValueChange={(v) => onFinalizeChange({ finalMaliyet: v === '' ? null : v })} />
          </FormField>
          <FormField label={<>{t('accApproval.finalize.maliyetNotu')}{optional}</>}>
            <Textarea rows={1} className="min-h-ctl-md resize-y" value={finalizeForm.maliyetDetayi}
              onChange={(e) => onFinalizeChange({ maliyetDetayi: e.target.value })} />
          </FormField>
        </div>
      </section>
    )
  }

  const title = mode === 'ek'
    ? t('accApproval.step.ek', { n: nextPesinatNo })
    : t(mode === 'lojistik' ? 'accApproval.cariLabel.pesinat2' : 'accApproval.cariLabel.pesinat1')

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold">{title}{mode !== 'ek' && optional}</h3>
      <div className="grid grid-cols-2 gap-3">
        <FormField label={t('accApproval.step.tutar')}>
          <DecimalInput value={pesinatForm.pesinat ?? ''} placeholder="0,00"
            onValueChange={(v) => onPesinatChange({ pesinat: v === '' ? null : v })} />
        </FormField>
        <FormField label={t('accApproval.finalize.pesinatTarihi')}>
          <Input type="date" value={pesinatForm.pesinatTarihi}
            onChange={(e) => onPesinatChange({ pesinatTarihi: e.target.value })} />
        </FormField>
      </div>
      {/* Cari/Lojistik'te ne olacağını onay penceresi söyler; kuyruk dışı tahsilatta pencere çıkmaz. */}
      {mode === 'ek' && <p className="text-xs text-muted-foreground">{t('accApproval.pesinat.hintEk')}</p>}
    </section>
  )
}

import { useTranslation } from 'react-i18next'
import type { SetPaymentDetailsRequest } from '@/api/purchase'
import { Input } from '@/components/ui/input'
import { DecimalInput } from '@/components/DecimalInput'
import { FormField } from '@/components/ui/form-field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// SatinAlmaTakipForm.cs cmbOdemeTuru hard-coded değerleri (BIREBIR — DB'ye giden değer).
export const ODEME_TURLERI = [
  'Peşin', 'Vadeli', 'Mal Mukabili', 'Çek / Senet', 'Havale / EFT', 'Kredi Kartı / Banka Kartı',
] as const
export type OdemeTuru = typeof ODEME_TURLERI[number]

// Görünen etiket i18n anahtarı (DB değeri değişmez).
const TYPE_KEY: Record<OdemeTuru, string> = {
  'Peşin': 'pesin', 'Vadeli': 'vadeli', 'Mal Mukabili': 'malMukabili',
  'Çek / Senet': 'cekSenet', 'Havale / EFT': 'havale', 'Kredi Kartı / Banka Kartı': 'kart',
}

interface Props {
  value: SetPaymentDetailsRequest
  onChange: (next: SetPaymentDetailsRequest) => void
  disabled?: boolean
}

/**
 * Ödeme türüne göre değişen alanlar. QW-12: etiketler i18n. Tür değişince
 * yalnız türe özgü alanlar sıfırlanır; ortak alanlar (işlem tarihi) korunur —
 * önceden tüm nesne değiştirildiği için ön-doldurulmuş tarih kayboluyordu.
 */
export function DynamicPaymentForm({ value, onChange, disabled }: Props) {
  const { t } = useTranslation()
  const v = value
  const set = <K extends keyof SetPaymentDetailsRequest>(k: K, x: SetPaymentDetailsRequest[K]) =>
    onChange({ ...v, [k]: x })
  const L = (k: string) => t(`payment.fields.${k}`)

  const amountPaid = (
    <FormField label={L('odenenTutar')}>
      <DecimalInput value={v.odenenTutar ?? ''} onValueChange={(val) => set('odenenTutar', val === '' ? undefined : val)} disabled={disabled} />
    </FormField>
  )
  const amount = (
    <FormField label={L('tutar')}>
      <DecimalInput value={v.odemeTutari ?? ''} onValueChange={(val) => set('odemeTutari', val === '' ? undefined : val)} disabled={disabled} />
    </FormField>
  )
  const txDate = (
    <FormField label={L('islemTarihi')}>
      <Input type="datetime-local" value={v.odemeIslemTarihi ?? ''} onChange={(e) => set('odemeIslemTarihi', e.target.value || undefined)} disabled={disabled} />
    </FormField>
  )
  const docNo = (
    <FormField label={L('belgeNo')}>
      <Input value={v.odemeBelgeNo ?? ''} onChange={(e) => set('odemeBelgeNo', e.target.value || undefined)} disabled={disabled} />
    </FormField>
  )
  const bank = (
    <FormField label={L('bankaAdi')}>
      <Input value={v.odemeBankaAdi ?? ''} onChange={(e) => set('odemeBankaAdi', e.target.value || undefined)} disabled={disabled} />
    </FormField>
  )

  return (
    <div className="space-y-3">
      <FormField label={L('odemeTuru')} required>
        <Select
          value={v.odemeTuru}
          onValueChange={(s) => onChange({ odemeTuru: s, odemeIslemTarihi: v.odemeIslemTarihi })}
          disabled={disabled}
        >
          <SelectTrigger><SelectValue placeholder={t('payment.select')} /></SelectTrigger>
          <SelectContent>
            {ODEME_TURLERI.map((x) => <SelectItem key={x} value={x}>{t(`payment.types.${TYPE_KEY[x]}`)}</SelectItem>)}
          </SelectContent>
        </Select>
      </FormField>

      {v.odemeTuru === 'Peşin' && <div className="grid grid-cols-2 gap-3">{amountPaid}{txDate}</div>}

      {v.odemeTuru === 'Vadeli' && (
        <div className="grid grid-cols-2 gap-3">
          {amountPaid}
          <FormField label={L('vadeSuresi')} hint={L('vadeSuresiHint')}>
            <Input value={v.odemeVadeSuresi ?? ''} onChange={(e) => set('odemeVadeSuresi', e.target.value || undefined)} disabled={disabled} />
          </FormField>
          <FormField label={L('vadeTutari')}>
            <DecimalInput value={v.odemeVadeTutari ?? ''} onValueChange={(val) => set('odemeVadeTutari', val === '' ? undefined : val)} disabled={disabled} />
          </FormField>
        </div>
      )}

      {v.odemeTuru === 'Mal Mukabili' && (
        <div className="space-y-3">
          {amountPaid}
          <FormField label={L('aciklama')}>
            <Input value={v.odemeAciklama ?? ''} onChange={(e) => set('odemeAciklama', e.target.value || undefined)} disabled={disabled} />
          </FormField>
        </div>
      )}

      {v.odemeTuru === 'Çek / Senet' && (
        <div className="grid grid-cols-2 gap-3">
          {amount}
          {docNo}
          <FormField label={L('vadeTarihi')}>
            <Input type="date" value={v.odemeVadeTarihi ?? ''} onChange={(e) => set('odemeVadeTarihi', e.target.value || undefined)} disabled={disabled} />
          </FormField>
        </div>
      )}

      {v.odemeTuru === 'Havale / EFT' && <div className="grid grid-cols-2 gap-3">{amount}{bank}{txDate}{docNo}</div>}

      {v.odemeTuru === 'Kredi Kartı / Banka Kartı' && (
        <div className="grid grid-cols-2 gap-3">
          {amount}
          <FormField label={L('kartTipi')}>
            <Input value={v.odemeKartTipi ?? ''} onChange={(e) => set('odemeKartTipi', e.target.value || undefined)} disabled={disabled} placeholder="Visa, Master…" />
          </FormField>
          <FormField label={L('taksit')}>
            <Input type="number" min={1} value={v.odemeTaksitSayisi ?? ''} onChange={(e) => set('odemeTaksitSayisi', e.target.value === '' ? undefined : Number(e.target.value))} disabled={disabled} />
          </FormField>
          {bank}
        </div>
      )}
    </div>
  )
}

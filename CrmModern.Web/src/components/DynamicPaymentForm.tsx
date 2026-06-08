import type { SetPaymentDetailsRequest } from '@/api/purchase'
import { Input } from '@/components/ui/input'
import { DecimalInput } from '@/components/DecimalInput'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// SatinAlmaTakipForm.cs cmbOdemeTuru hard-coded değerleri (BIREBIR)
export const ODEME_TURLERI = [
  'Peşin', 'Vadeli', 'Mal Mukabili', 'Çek / Senet', 'Havale / EFT', 'Kredi Kartı / Banka Kartı',
] as const
export type OdemeTuru = typeof ODEME_TURLERI[number]

interface Props {
  value: SetPaymentDetailsRequest
  onChange: (next: SetPaymentDetailsRequest) => void
  disabled?: boolean
}

export function DynamicPaymentForm({ value, onChange, disabled }: Props) {
  const v = value
  const set = <K extends keyof SetPaymentDetailsRequest>(k: K, x: SetPaymentDetailsRequest[K]) =>
    onChange({ ...v, [k]: x })

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>Ödeme Türü *</Label>
        <Select value={v.odemeTuru} onValueChange={(s) => onChange({ odemeTuru: s })} disabled={disabled}>
          <SelectTrigger><SelectValue placeholder="Seçin" /></SelectTrigger>
          <SelectContent>{ODEME_TURLERI.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {/* Peşin */}
      {v.odemeTuru === 'Peşin' && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label>Ödenen Tutar *</Label><DecimalInput value={v.odenenTutar ?? ''} onValueChange={(val) => set('odenenTutar', val === '' ? undefined : val)} disabled={disabled} /></div>
          <div className="space-y-1"><Label>İşlem Tarihi *</Label><Input type="datetime-local" value={v.odemeIslemTarihi ?? ''} onChange={(e) => set('odemeIslemTarihi', e.target.value || undefined)} disabled={disabled} /></div>
        </div>
      )}

      {/* Vadeli */}
      {v.odemeTuru === 'Vadeli' && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label>Ödenen Tutar *</Label><DecimalInput value={v.odenenTutar ?? ''} onValueChange={(val) => set('odenenTutar', val === '' ? undefined : val)} disabled={disabled} /></div>
          <div className="space-y-1"><Label>Vade Süresi * (örn. "30 gün")</Label><Input value={v.odemeVadeSuresi ?? ''} onChange={(e) => set('odemeVadeSuresi', e.target.value || undefined)} disabled={disabled} /></div>
          <div className="space-y-1"><Label>Vade Tutarı *</Label><DecimalInput value={v.odemeVadeTutari ?? ''} onValueChange={(val) => set('odemeVadeTutari', val === '' ? undefined : val)} disabled={disabled} /></div>
        </div>
      )}

      {/* Mal Mukabili */}
      {v.odemeTuru === 'Mal Mukabili' && (
        <div className="space-y-3">
          <div className="space-y-1"><Label>Ödenen Tutar *</Label><DecimalInput value={v.odenenTutar ?? ''} onValueChange={(val) => set('odenenTutar', val === '' ? undefined : val)} disabled={disabled} /></div>
          <div className="space-y-1"><Label>Açıklama *</Label><Input value={v.odemeAciklama ?? ''} onChange={(e) => set('odemeAciklama', e.target.value || undefined)} disabled={disabled} /></div>
        </div>
      )}

      {/* Çek / Senet */}
      {v.odemeTuru === 'Çek / Senet' && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label>Tutar *</Label><DecimalInput value={v.odemeTutari ?? ''} onValueChange={(val) => set('odemeTutari', val === '' ? undefined : val)} disabled={disabled} /></div>
          <div className="space-y-1"><Label>Belge No *</Label><Input value={v.odemeBelgeNo ?? ''} onChange={(e) => set('odemeBelgeNo', e.target.value || undefined)} disabled={disabled} /></div>
          <div className="space-y-1"><Label>Vade Tarihi *</Label><Input type="date" value={v.odemeVadeTarihi ?? ''} onChange={(e) => set('odemeVadeTarihi', e.target.value || undefined)} disabled={disabled} /></div>
        </div>
      )}

      {/* Havale / EFT */}
      {v.odemeTuru === 'Havale / EFT' && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label>Tutar *</Label><DecimalInput value={v.odemeTutari ?? ''} onValueChange={(val) => set('odemeTutari', val === '' ? undefined : val)} disabled={disabled} /></div>
          <div className="space-y-1"><Label>Banka Adı *</Label><Input value={v.odemeBankaAdi ?? ''} onChange={(e) => set('odemeBankaAdi', e.target.value || undefined)} disabled={disabled} /></div>
          <div className="space-y-1"><Label>İşlem Tarihi *</Label><Input type="datetime-local" value={v.odemeIslemTarihi ?? ''} onChange={(e) => set('odemeIslemTarihi', e.target.value || undefined)} disabled={disabled} /></div>
          <div className="space-y-1"><Label>Belge No</Label><Input value={v.odemeBelgeNo ?? ''} onChange={(e) => set('odemeBelgeNo', e.target.value || undefined)} disabled={disabled} /></div>
        </div>
      )}

      {/* Kredi/Banka Kartı */}
      {v.odemeTuru === 'Kredi Kartı / Banka Kartı' && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label>Tutar *</Label><DecimalInput value={v.odemeTutari ?? ''} onValueChange={(val) => set('odemeTutari', val === '' ? undefined : val)} disabled={disabled} /></div>
          <div className="space-y-1"><Label>Kart Tipi *</Label><Input value={v.odemeKartTipi ?? ''} onChange={(e) => set('odemeKartTipi', e.target.value || undefined)} disabled={disabled} placeholder="Visa, Master..." /></div>
          <div className="space-y-1"><Label>Taksit Sayısı</Label><Input type="number" value={v.odemeTaksitSayisi ?? ''} onChange={(e) => set('odemeTaksitSayisi', e.target.value === '' ? undefined : Number(e.target.value))} disabled={disabled} /></div>
          <div className="space-y-1"><Label>Banka Adı</Label><Input value={v.odemeBankaAdi ?? ''} onChange={(e) => set('odemeBankaAdi', e.target.value || undefined)} disabled={disabled} /></div>
        </div>
      )}
    </div>
  )
}

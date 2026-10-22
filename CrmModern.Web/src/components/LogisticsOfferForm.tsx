import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { submitOffer } from '@/api/logisticsOffers'
import { INCOTERMS, PARA_BIRIMLERI } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { FormField } from '@/components/ui/form-field'
import { SectionTitle } from '@/components/ui/section-title'
import { DecimalInput } from '@/components/DecimalInput'
import { CarrierPicker } from '@/components/CarrierPicker'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAppMutation } from '@/hooks/useAppMutation'

interface Props {
  siparisNo: string
  /** Teklif kaydedilince çağrılır (örn. modaldaki formu kapatmak için). */
  onSubmitted?: () => void
}

/**
 * Lojistik teklif giriş formu — alanlar sevk dialogu ile birebir (Firma + Taşıma
 * türü + Fiyat + Not). Hem "Lojistik Teklif" ekranında hem de Detay panelindeki
 * "Teklif Gönder" altında kullanılır. Taşıyıcı seçimi ortak CarrierPicker.
 */
export function LogisticsOfferForm({ siparisNo, onSubmitted }: Props) {
  const { t } = useTranslation()
  const [firmaAdi, setFirmaAdi] = useState('')
  const [lojistikCesit, setLojistikCesit] = useState('')
  const [fiyat, setFiyat] = useState<number>(0)
  const [paraBirimi, setParaBirimi] = useState('Euro')
  const [aciklama, setAciklama] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const valid = !!(firmaAdi && lojistikCesit.trim() && fiyat > 0)

  const mut = useAppMutation({
    mutationFn: (_: void) => submitOffer(siparisNo, {
      firmaAdi, lojistikCesit, fiyat, paraBirimi, aciklama: aciklama.trim() || undefined,
    }),
    successTitle: t('logisticsOffer.toast.submitted'),
    errorTitle: t('logisticsOffer.toast.error'),
    onSuccess: () => {
      setFirmaAdi(''); setLojistikCesit('')
      setFiyat(0); setParaBirimi('Euro'); setAciklama(''); setSubmitted(false)
      onSubmitted?.()
    },
  })

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    if (!valid) return
    mut.mutate()
  }

  const req = (ok: boolean) => (submitted && !ok ? t('validation.required') : null)

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-md border bg-muted/30 p-3">
      <SectionTitle as="h4">{t('logisticsOffer.addTitle')}</SectionTitle>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <FormField label={t('logisticsOffer.firma')} required error={req(!!firmaAdi)}>
          <CarrierPicker value={firmaAdi} onChange={setFirmaAdi} />
        </FormField>
        <FormField label={t('logisticsOffer.cesit')} required error={req(!!lojistikCesit.trim())}>
          <Select value={lojistikCesit || undefined} onValueChange={setLojistikCesit}>
            <SelectTrigger><SelectValue placeholder={t('logistics.cesit.select')} /></SelectTrigger>
            <SelectContent>
              {INCOTERMS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label={t('logisticsOffer.fiyat')} required error={req(fiyat > 0)}>
          <DecimalInput value={fiyat} onValueChange={(v) => setFiyat(v === '' ? 0 : v)} />
        </FormField>
        <FormField label={t('logisticsOffer.paraBirimi')}>
          <Select value={paraBirimi} onValueChange={setParaBirimi}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PARA_BIRIMLERI.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label={t('logisticsOffer.not')} className="md:col-span-2">
          <Textarea rows={1} value={aciklama} onChange={(e) => setAciklama(e.target.value)} />
        </FormField>
      </div>
      <div className="flex justify-end">
        <Button type="submit" size="sm" loading={mut.isPending}>{t('logisticsOffer.submit')}</Button>
      </div>
    </form>
  )
}

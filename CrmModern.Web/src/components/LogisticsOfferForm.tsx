import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getCarriers } from '@/api/logistics'
import { submitOffer } from '@/api/logisticsOffers'
import { INCOTERMS } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DecimalInput } from '@/components/DecimalInput'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FieldError } from '@/components/FieldError'
import { useToast } from '@/components/ToastProvider'

// Sevk dialogundaki "Diğer" sentinel deseni (kayıtlı taşıyıcılarla çakışmasın).
const OTHER_CARRIER = '__other__'

interface Props {
  siparisNo: string
  /** Teklif kaydedilince çağrılır (örn. modaldaki formu kapatmak için). */
  onSubmitted?: () => void
}

/**
 * Lojistik teklif giriş formu — alanlar mevcut sevk dialogu ile birebir
 * (Firma + Taşıma türü + Fiyat + Not). Hem yeni "Lojistik Teklif" ekranında
 * hem de Detay modalındaki "Teklif Gönder" altında kullanılır.
 */
export function LogisticsOfferForm({ siparisNo, onSubmitted }: Props) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const qc = useQueryClient()
  const { data: carriers = [] } = useQuery({ queryKey: ['carriers'], queryFn: getCarriers })

  const [carrierChoice, setCarrierChoice] = useState(OTHER_CARRIER)
  const [firmaText, setFirmaText] = useState('')
  const [lojistikCesit, setLojistikCesit] = useState('')
  const [fiyat, setFiyat] = useState<number>(0)
  const [aciklama, setAciklama] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const firmaAdi = carrierChoice === OTHER_CARRIER ? firmaText.trim() : carrierChoice
  const valid = !!(firmaAdi && lojistikCesit.trim() && fiyat > 0)

  const mut = useMutation({
    mutationFn: () => submitOffer(siparisNo, {
      firmaAdi, lojistikCesit, fiyat, aciklama: aciklama.trim() || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['logistics-offers', siparisNo] })
      qc.invalidateQueries({ queryKey: ['logistics-offer-queue'] })
      qc.invalidateQueries({ queryKey: ['carriers'] })
      setCarrierChoice(OTHER_CARRIER); setFirmaText(''); setLojistikCesit('')
      setFiyat(0); setAciklama(''); setSubmitted(false)
      toast({ title: t('logisticsOffer.toast.submitted') })
      onSubmitted?.()
    },
    onError: () => toast({ title: t('logisticsOffer.toast.error'), variant: 'destructive' }),
  })

  const onSubmit = () => {
    setSubmitted(true)
    if (!valid) return
    mut.mutate()
  }

  return (
    <div className="space-y-3 rounded-md border bg-muted/30 p-3">
      <h4 className="text-sm font-semibold">{t('logisticsOffer.addTitle')}</h4>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label>{t('logisticsOffer.firma')}</Label>
          <Select value={carrierChoice || undefined} onValueChange={setCarrierChoice}>
            <SelectTrigger><SelectValue placeholder={t('logistics.carrier.select')} /></SelectTrigger>
            <SelectContent>
              {carriers.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              <SelectItem value={OTHER_CARRIER}>{t('logistics.carrier.other')}</SelectItem>
            </SelectContent>
          </Select>
          {carrierChoice === OTHER_CARRIER && (
            <Input value={firmaText} onChange={(e) => setFirmaText(e.target.value)}
              placeholder={t('logistics.carrier.otherPlaceholder')} />
          )}
          {submitted && !firmaAdi && <FieldError message={t('validation.required')} />}
        </div>
        <div className="space-y-1">
          <Label>{t('logisticsOffer.cesit')}</Label>
          <Select value={lojistikCesit || undefined} onValueChange={setLojistikCesit}>
            <SelectTrigger><SelectValue placeholder={t('logistics.cesit.select')} /></SelectTrigger>
            <SelectContent>
              {INCOTERMS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          {submitted && !lojistikCesit.trim() && <FieldError message={t('validation.required')} />}
        </div>
        <div className="space-y-1">
          <Label>{t('logisticsOffer.fiyat')}</Label>
          <DecimalInput value={fiyat} onValueChange={(v) => setFiyat(v === '' ? 0 : v)} />
          {submitted && !(fiyat > 0) && <FieldError message={t('validation.required')} />}
        </div>
        <div className="space-y-1">
          <Label>{t('logisticsOffer.not')}</Label>
          <Textarea rows={1} value={aciklama} onChange={(e) => setAciklama(e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end">
        <Button size="sm" disabled={mut.isPending} onClick={onSubmit}>{t('logisticsOffer.submit')}</Button>
      </div>
    </div>
  )
}

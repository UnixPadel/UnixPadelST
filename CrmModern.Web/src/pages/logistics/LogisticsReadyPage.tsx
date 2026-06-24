import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getReadyForShipment, createShipment, getCarriers } from '@/api/logistics'
import { INCOTERMS } from '@/lib/constants'
import { stageLabel } from '@/lib/status'
import { PageHeader } from '@/components/PageHeader'
import { DataTable, type Column } from '@/components/DataTable'
import { StatusBadge } from '@/components/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DecimalInput } from '@/components/DecimalInput'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { OrderDetailModal } from '@/components/OrderDetailModal'
import { FieldError } from '@/components/FieldError'
import { useToast } from '@/components/ToastProvider'
import { formatDate, formatCurrency } from '@/lib/utils'
import type { LogisticsOrderListDto } from '@/types'

// PROMPT-v6 §4 — firma Select'inde "Diğer" seçeneği için sentinel değer
// (kayıtlı taşıyıcı adlarıyla çakışmasın diye ayraçlı).
const OTHER_CARRIER = '__other__'

const blank = () => ({
  firmaAdi: '', lojistikCesit: '', fiyat: 0, lNot: '',
  sTarih: new Date().toISOString().slice(0, 10),
  lojistikNot: '',
})

export function LogisticsReadyPage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation()
  const [target, setTarget] = useState<LogisticsOrderListDto | null>(null)
  const [form, setForm] = useState(blank())
  // Firma seçimi: kayıtlı taşıyıcı adı | OTHER_CARRIER (Diğer → serbest metin)
  // PROMPT-v7 §5 — dialog açılışında "Diğer" seçili gelir (serbest metin kutusu açık).
  const [carrierChoice, setCarrierChoice] = useState(OTHER_CARRIER)
  const [detailNo, setDetailNo] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  // Diğer seçiliyse firmaAdi serbest metinden gelir; boşsa required hatası.
  const firmaAdi = carrierChoice === OTHER_CARRIER ? form.firmaAdi.trim() : carrierChoice
  const valid = !!(firmaAdi && form.lojistikCesit.trim())
  const onSubmit = () => {
    setSubmitted(true)
    if (!valid) return
    createMut.mutate()
  }

  // §25 — filtreler
  const [fNo, setFNo] = useState('')
  const [fMusteri, setFMusteri] = useState('')
  const [fAsama, setFAsama] = useState('__all__')

  const { data: ready = [], isLoading } = useQuery({
    queryKey: ['logistics-ready'], queryFn: getReadyForShipment,
  })
  const { data: carriers = [] } = useQuery({ queryKey: ['carriers'], queryFn: getCarriers })

  // Unique stages from loaded data
  const stageOptions = useMemo(
    () => Array.from(new Set(ready.map((r) => r.siparisMiTeklifMi).filter(Boolean))).sort(),
    [ready],
  )

  const filtered = useMemo(() => {
    const list = ready.filter((r) => {
      if (fNo && !r.siparisNo.toLowerCase().includes(fNo.toLowerCase())) return false
      if (fMusteri && !(r.musteriAd ?? '').toLowerCase().includes(fMusteri.toLowerCase())) return false
      if (fAsama !== '__all__' && r.siparisMiTeklifMi !== fAsama) return false
      return true
    })
    // Aşamalarda en üstte üretimde olanlar gözüksün (kararlı sıralama; kullanıcı
    // başlığa tıklayınca DataTable kendi sıralamasını uygular).
    return [...list].sort((a, b) =>
      (a.siparisMiTeklifMi === 'Uretim' ? 0 : 1) - (b.siparisMiTeklifMi === 'Uretim' ? 0 : 1))
  }, [ready, fNo, fMusteri, fAsama])

  const createMut = useMutation({
    mutationFn: () => createShipment({ siparisNo: target!.siparisNo, ...form, firmaAdi }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['logistics-ready'] })
      qc.invalidateQueries({ queryKey: ['logistics-history'] })
      qc.invalidateQueries({ queryKey: ['carriers'] })
      // PROMPT-v5 §3 — sipariş statüsü değişti: Siparişlerim canlı yansısın.
      qc.invalidateQueries({ queryKey: ['my-orders'] })
      setTarget(null); setForm(blank()); setCarrierChoice(OTHER_CARRIER); setSubmitted(false)
      // Paket 3: yeni akış — sevk talebi muhasebe onayını bekler.
      toast({ title: t('logistics.toast.created') })
    },
    onError: () => toast({ title: t('logistics.toast.error'), variant: 'destructive' }),
  })

  // Round-8 §12 — müşteri Peşin/Vadeli kolonu kaldırıldı; taşıyıcı anlaşması
  // sevkiyat oluşturulurken girilir (Ready listesi sevk-öncesi olduğundan
  // satır bazında taşıyıcı tutarı yoktur — anlaşma dialog'da özetlenir).
  const cols: Column<LogisticsOrderListDto & Record<string, unknown>>[] = [
    { key: 'siparisNo',         header: t('common.orderNo'), sortable: true },
    { key: 'musteriAd',         header: t('common.customer'), sortable: true },
    { key: 'mUlke',             header: t('common.country') },
    { key: 'siparisMiTeklifMi', header: t('common.stage'), render: (r) => (
      // Üretimdeki sipariş lojistikte "Hazırlanıyor" olarak yansır (gerçek aşama 'Uretim').
      r.siparisMiTeklifMi === 'Uretim'
        ? <Badge variant="warning">{t('logistics.preparing')}</Badge>
        : <StatusBadge value={r.siparisMiTeklifMi as string} />
    ) },
    { key: 'tarih',             header: t('common.date'), render: (r) => formatDate((r.tarih as string) ?? '-') },
    {
      key: 'actions', header: t('common.actions'),
      render: (r) => {
        // Sevk yalnız 'Hazir' aşamasında yapılabilir; 'Hazırlanıyor' (Uretim) için pasif.
        const canShip = r.siparisMiTeklifMi === 'Hazir'
        return (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setDetailNo(r.siparisNo as string)}>{t('common.details')}</Button>
          <Button size="sm" disabled={!canShip} title={canShip ? undefined : t('logistics.preparing')} onClick={() => {
            const o = r as LogisticsOrderListDto
            setTarget(o)
            // "Her ikisi de" — onaylı lojistik teklifi varsa sevk formunu ön-doldur.
            setForm({ ...blank(), firmaAdi: o.onayliFirma ?? '', lojistikCesit: o.onayliCesit ?? '', fiyat: o.onayliFiyat ?? 0 })
            setCarrierChoice(o.onayliFirma && carriers.includes(o.onayliFirma) ? o.onayliFirma : OTHER_CARRIER)
            setSubmitted(false)
          }}>{t('logistics.createShipment')}</Button>
        </div>
        )
      },
    },
  ]

  return (
    <div>
      <PageHeader title={t('logistics.readyTitle')} />
      <div className="p-6 space-y-4">
        {/* §25 — filtre şeridi */}
        <div className="rounded-md border bg-card p-3">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="space-y-1">
              <Label>{t('common.orderNo')}</Label>
              <Input value={fNo} onChange={(e) => setFNo(e.target.value)} placeholder="…" />
            </div>
            <div className="space-y-1">
              <Label>{t('common.customer')}</Label>
              <Input value={fMusteri} onChange={(e) => setFMusteri(e.target.value)} placeholder="…" />
            </div>
            <div className="space-y-1">
              <Label>{t('common.stage')}</Label>
              <Select value={fAsama} onValueChange={setFAsama}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">{t('myOrders.filter.all')}</SelectItem>
                  {stageOptions.map((s) => (
                    <SelectItem key={s} value={s}>{stageLabel(t, s)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 flex items-end">
              <Button variant="outline" className="w-full" onClick={() => { setFNo(''); setFMusteri(''); setFAsama('__all__') }}>
                {t('myOrders.filter.reset')}
              </Button>
            </div>
          </div>
        </div>
        <DataTable columns={cols} data={filtered as (LogisticsOrderListDto & Record<string, unknown>)[]} keyField="siparisNo" loading={isLoading} density="compact" />
      </div>

      <Dialog open={!!target} onOpenChange={() => setTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t('logistics.shipmentTitle', { no: target?.siparisNo })}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>{t('logistics.carrierLabel')}</Label>
              <Select value={carrierChoice || undefined}
                onValueChange={(v) => setCarrierChoice(v)}>
                <SelectTrigger><SelectValue placeholder={t('logistics.carrier.select')} /></SelectTrigger>
                <SelectContent>
                  {carriers.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  <SelectItem value={OTHER_CARRIER}>{t('logistics.carrier.other')}</SelectItem>
                </SelectContent>
              </Select>
              {carrierChoice === OTHER_CARRIER && (
                <Input value={form.firmaAdi}
                  onChange={(e) => setForm((f) => ({ ...f, firmaAdi: e.target.value }))}
                  placeholder={t('logistics.carrier.otherPlaceholder')} />
              )}
              {submitted && !firmaAdi && <FieldError message={t('validation.required')} />}
            </div>
            <div className="space-y-1">
              <Label>{t('logistics.transportType')}</Label>
              {/* PROMPT-v7 §5 — serbest metin/datalist yerine Incoterms dropdown'u (ortak sabit). */}
              <Select value={form.lojistikCesit || undefined}
                onValueChange={(v) => setForm((f) => ({ ...f, lojistikCesit: v }))}>
                <SelectTrigger><SelectValue placeholder={t('logistics.cesit.select')} /></SelectTrigger>
                <SelectContent>
                  {INCOTERMS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              {submitted && !form.lojistikCesit.trim() && <FieldError message={t('validation.required')} />}
            </div>
            <div className="space-y-1"><Label>{t('logistics.agreedAmount')}</Label><DecimalInput value={form.fiyat} onValueChange={(v) => setForm((f) => ({ ...f, fiyat: v === '' ? 0 : v }))} /></div>
            <div className="space-y-1"><Label>{t('logistics.shipDate')}</Label><Input type="date" value={form.sTarih} onChange={(e) => setForm((f) => ({ ...f, sTarih: e.target.value }))} /></div>
            <div className="space-y-1"><Label>{t('logistics.note')}</Label><Textarea rows={2} value={form.lojistikNot} onChange={(e) => setForm((f) => ({ ...f, lojistikNot: e.target.value }))} /></div>

            {/* Round-8 §12 — taşıyıcı anlaşması özeti (müşteri ödeme türünün yerini aldı):
                kiminle, nasıl ve ne kadara anlaşıldığı. */}
            <div className="space-y-1">
              <Label>{t('logistics.agreement.title')}</Label>
              <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm space-y-0.5">
                <div className="flex justify-between gap-2"><span className="text-muted-foreground">{t('logistics.agreement.firm')}</span><span className="font-medium">{firmaAdi || t('logistics.agreement.empty')}</span></div>
                <div className="flex justify-between gap-2"><span className="text-muted-foreground">{t('logistics.agreement.type')}</span><span>{form.lojistikCesit || t('logistics.agreement.empty')}</span></div>
                <div className="flex justify-between gap-2"><span className="text-muted-foreground">{t('logistics.agreement.amount')}</span><span className="font-medium">{form.fiyat > 0 ? formatCurrency(form.fiyat) : t('logistics.agreement.empty')}</span></div>
                {form.lojistikNot.trim() && <div className="pt-1 text-xs text-muted-foreground whitespace-pre-wrap">{t('logistics.agreement.note')}: {form.lojistikNot}</div>}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)}>{t('common.cancel')}</Button>
            <Button disabled={createMut.isPending} onClick={onSubmit}>{t('logistics.ship')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <OrderDetailModal siparisNo={detailNo} onClose={() => setDetailNo(null)} logisticsView />
    </div>
  )
}

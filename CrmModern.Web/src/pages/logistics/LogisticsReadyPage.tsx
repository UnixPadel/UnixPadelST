import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { getReadyForShipment, createShipment, getCarriers } from '@/api/logistics'
import { INCOTERMS } from '@/lib/constants'
import { PageHeader } from '@/components/PageHeader'
import { DataTable, type Column } from '@/components/DataTable'
import { StatusBadge } from '@/components/StatusBadge'
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
import { formatDate } from '@/lib/utils'
import type { LogisticsOrderListDto } from '@/types'

// PROMPT-v6 §4 — firma Select'inde "Diğer" seçeneği için sentinel değer
// (kayıtlı taşıyıcı adlarıyla çakışmasın diye ayraçlı).
const OTHER_CARRIER = '__other__'

const blank = () => ({
  firmaAdi: '', lojistikCesit: '', fiyat: 0, lNot: '',
  sTarih: new Date().toISOString().slice(0, 10),
  lojistikNot: '',
})

/** PROMPT-v6 §4 — ödeme türü etiketi: Peşin veya Vadeli (%x peşin). Tutar yok. */
function odemeTuru(o: LogisticsOrderListDto, t: TFunction): string {
  return o.pesinYuzde >= 100
    ? t('logistics.payment.pesin')
    : t('logistics.payment.vadeli', { pesinYuzde: o.pesinYuzde })
}

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

  const { data: ready = [], isLoading } = useQuery({
    queryKey: ['logistics-ready'], queryFn: getReadyForShipment,
  })
  const { data: carriers = [] } = useQuery({ queryKey: ['carriers'], queryFn: getCarriers })

  const createMut = useMutation({
    mutationFn: () => createShipment({ siparisNo: target!.siparisNo, ...form, firmaAdi }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['logistics-ready'] })
      qc.invalidateQueries({ queryKey: ['logistics-history'] })
      qc.invalidateQueries({ queryKey: ['logistics-pending-approval'] })
      qc.invalidateQueries({ queryKey: ['carriers'] })
      // PROMPT-v5 §3 — sipariş statüsü değişti: Siparişlerim canlı yansısın.
      qc.invalidateQueries({ queryKey: ['my-orders'] })
      setTarget(null); setForm(blank()); setCarrierChoice(OTHER_CARRIER); setSubmitted(false)
      // Paket 3: yeni akış — sevk talebi muhasebe onayını bekler.
      toast({ title: 'Sevk talebi oluşturuldu — Muhasebe onayı bekliyor.' })
    },
    onError: () => toast({ title: 'Hata', variant: 'destructive' }),
  })

  const cols: Column<LogisticsOrderListDto & Record<string, unknown>>[] = [
    { key: 'siparisNo',         header: 'Sipariş No', sortable: true },
    { key: 'musteriAd',         header: 'Müşteri',    sortable: true },
    { key: 'mUlke',             header: 'Ülke' },
    { key: 'siparisMiTeklifMi', header: 'Aşama', render: (r) => <StatusBadge value={r.siparisMiTeklifMi as string} /> },
    // PROMPT-v6 §4 — ödeme türü kolonu (tutar içermez).
    { key: 'odeme', header: t('logistics.payment.col'),
      render: (r) => odemeTuru(r as LogisticsOrderListDto, t) },
    { key: 'tarih',             header: 'Tarih', render: (r) => formatDate((r.tarih as string) ?? '-') },
    {
      key: 'actions', header: 'İşlem',
      render: (r) => (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setDetailNo(r.siparisNo as string)}>Detay</Button>
          <Button size="sm" onClick={() => {
            setTarget(r as LogisticsOrderListDto); setForm(blank()); setCarrierChoice(OTHER_CARRIER); setSubmitted(false)
          }}>Sevkiyat Oluştur</Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title={t('logistics.readyTitle')} />
      <div className="p-6">
        <DataTable columns={cols} data={ready as (LogisticsOrderListDto & Record<string, unknown>)[]} keyField="siparisNo" loading={isLoading} density="compact" />
      </div>

      <Dialog open={!!target} onOpenChange={() => setTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Sevkiyat Oluştur — {target?.siparisNo}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Taşıyıcı / Firma *</Label>
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
              <Label>Taşıma Türü *</Label>
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
            {/* PROMPT-v7 §5 — ödeme türü read-only alan (Taşıma Türü altında; tutar yok) */}
            {target && (
              <div className="space-y-1">
                <Label>{t('logistics.payment.col')}</Label>
                <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-sm">
                  <span className="font-medium">{odemeTuru(target, t)}</span>
                  {target.odemeDurum && <StatusBadge value={target.odemeDurum} />}
                </div>
              </div>
            )}
            <div className="space-y-1"><Label>Fiyat</Label><DecimalInput value={form.fiyat} onValueChange={(v) => setForm((f) => ({ ...f, fiyat: v === '' ? 0 : v }))} /></div>
            <div className="space-y-1"><Label>Sevkiyat Tarihi</Label><Input type="date" value={form.sTarih} onChange={(e) => setForm((f) => ({ ...f, sTarih: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Lojistik Notu</Label><Textarea rows={2} value={form.lojistikNot} onChange={(e) => setForm((f) => ({ ...f, lojistikNot: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)}>İptal</Button>
            <Button disabled={createMut.isPending} onClick={onSubmit}>Sevk et</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <OrderDetailModal siparisNo={detailNo} onClose={() => setDetailNo(null)} />
    </div>
  )
}

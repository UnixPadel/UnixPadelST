import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Truck } from 'lucide-react'
import { getReadyForShipment, createShipment } from '@/api/logistics'
import { INCOTERMS } from '@/lib/constants'
import { stageLabel } from '@/lib/status'
import { PageHeader } from '@/components/PageHeader'
import { FillPage, FillRegion } from '@/components/FillPage'
import { DataTable, type Column } from '@/components/DataTable'
import { StatusBadge } from '@/components/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DecimalInput } from '@/components/DecimalInput'
import { Textarea } from '@/components/ui/textarea'
import { FormField } from '@/components/ui/form-field'
import { KeyValue } from '@/components/ui/key-value'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CarrierPicker } from '@/components/CarrierPicker'
import { FilterBar, FilterField, ALL, useFilterState } from '@/components/FilterBar'
import { MasterDetailLayout } from '@/components/MasterDetailLayout'
import { WaitingUpstreamPanel } from '@/components/WaitingUpstreamPanel'
import { useNotHereHint } from '@/hooks/useNotHereHint'
import { useShortcutHints } from '@/components/StatusBar'
import { useAppMutation } from '@/hooks/useAppMutation'
import { useEnterNavigation } from '@/hooks/useEnterNavigation'
import { formatDate, formatCurrency } from '@/lib/utils'
import { trLower } from '@/components/ui/combobox'
import type { LogisticsOrderListDto } from '@/types'
import { localDateInput } from '@/lib/date'

type Row = LogisticsOrderListDto & Record<string, unknown>

const blank = () => ({
  firmaAdi: '', lojistikCesit: '', fiyat: 0, lNot: '',
  sTarih: localDateInput(),
  lojistikNot: '',
})

const FILTER_DEFAULTS = { siparisNo: '', musteri: '', asama: ALL }

/**
 * Lojistik — Hazır. Sevk talebi penceresi artık bir form (Enter ilerler/gönderir),
 * taşıyıcı ortak CarrierPicker ile yazarak seçilir, fiyat 0 iken uyarı verilir;
 * detay sağ panelde (E-9); filtreler URL'de kalıcı.
 */
export function LogisticsReadyPage() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const [target, setTarget] = useState<LogisticsOrderListDto | null>(null)
  const [form, setForm] = useState(blank())
  const [activeNo, setActiveNo] = useState<string | null>(() => params.get('sel'))
  const [submitted, setSubmitted] = useState(false)
  const { values: f, set, setAll, reset } = useFilterState(FILTER_DEFAULTS)
  const onEnterNav = useEnterNavigation()

  const valid = !!(form.firmaAdi && form.lojistikCesit.trim())

  const { data: ready = [], isLoading, isError } = useQuery({
    queryKey: ['logistics-ready'], queryFn: getReadyForShipment,
  })

  const stageOptions = useMemo(
    () => Array.from(new Set(ready.map((r) => r.siparisMiTeklifMi).filter(Boolean))).sort(),
    [ready],
  )

  const filtered = useMemo(() => {
    const no = trLower(f.siparisNo), mu = trLower(f.musteri)
    const list = ready.filter((r) => {
      if (no && !trLower(r.siparisNo).includes(no)) return false
      if (mu && !trLower(r.musteriAd ?? '').includes(mu)) return false
      if (f.asama !== ALL && r.siparisMiTeklifMi !== f.asama) return false
      return true
    })
    // Sevke hazır (Hazir) satırlar üstte; üretimdekiler ("Hazırlanıyor") altta.
    return [...list].sort((a, b) =>
      (a.siparisMiTeklifMi === 'Hazir' ? 0 : 1) - (b.siparisMiTeklifMi === 'Hazir' ? 0 : 1))
  }, [ready, f])
  const notHere = useNotHereHint(f.siparisNo, !isLoading && !isError && filtered.length === 0)

  const createMut = useAppMutation({
    mutationFn: (_: void) => createShipment({ siparisNo: target!.siparisNo, ...form }),
    // Paket 3: yeni akış — sevk talebi muhasebe onayını bekler.
    successTitle: t('logistics.toast.created'),
    successDescription: () => target?.siparisNo,
    errorTitle: t('logistics.toast.error'),
    onSuccess: () => { setTarget(null); setForm(blank()); setSubmitted(false) },
  })

  const openShipment = (o: LogisticsOrderListDto) => {
    setTarget(o)
    // Onaylı lojistik teklifi varsa sevk formunu ön-doldur.
    setForm({ ...blank(), firmaAdi: o.onayliFirma ?? '', lojistikCesit: o.onayliCesit ?? '', fiyat: o.onayliFiyat ?? 0 })
    setSubmitted(false)
  }

  const onSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    setSubmitted(true)
    if (!valid) return
    createMut.mutate()
  }

  // Round-8 §12 — müşteri Peşin/Vadeli kolonu kaldırıldı; taşıyıcı anlaşması
  // sevkiyat oluşturulurken girilir.
  const cols: Column<Row>[] = [
    { key: 'siparisNo', pin: 'left', header: t('common.orderNo'), sortable: true, hideable: false, render: (r) => <span className="font-mono text-xs">{r.siparisNo}</span> },
    { key: 'musteriAd', truncate: '16rem', header: t('common.customer'), sortable: true },
    { key: 'mUlke',             header: t('common.country'), sortable: true },
    { key: 'siparisMiTeklifMi', header: t('common.stage'), sortable: true, render: (r) => (
      // Üretimdeki sipariş lojistikte "Hazırlanıyor" olarak yansır (gerçek aşama 'Uretim').
      r.siparisMiTeklifMi === 'Uretim'
        ? <Badge variant="progress">{t('logistics.preparing')}</Badge>
        : <StatusBadge value={r.siparisMiTeklifMi} context="stage" />
    ) },
    { key: 'onayliFirma',       header: t('logistics.approvedOffer'), render: (r) => r.onayliFirma ? `${r.onayliFirma}${r.onayliCesit ? ` · ${r.onayliCesit}` : ''}` : '—' },
    { key: 'tarih',             header: t('common.date'), sortable: true, type: 'date', render: (r) => formatDate((r.tarih as string) ?? '-') },
    {
      key: 'actions', pin: 'right', header: t('common.actions'), hideable: false, exportValue: false,
      render: (r) => {
        // Sevk yalnız 'Hazir' aşamasında yapılabilir; 'Hazırlanıyor' (Uretim) için pasif.
        const canShip = r.siparisMiTeklifMi === 'Hazir'
        return (
          <Button size="xs" disabled={!canShip} title={canShip ? undefined : t('logistics.preparingHint')} onClick={() => openShipment(r)}>
            <Truck className="h-3.5 w-3.5" /> {t('logistics.createShipment')}
          </Button>
        )
      },
    },
  ]

  useShortcutHints([
    { keys: '↑↓', label: t('shortcuts.moveRow') },
    { keys: 'Shift+F10', label: t('shortcuts.rowMenu') },
  ])

  return (
    // Scaling Faz 2 — FillPage: sayfa kaymaz, tablo kalan yüksekliği doldurur
    // (başlık + araç çubuğu yerinde kalır).
    <FillPage>
      <PageHeader density="compact" actions={<WaitingUpstreamPanel screen="logistics-ready" variant="button" />} title={t('logistics.readyTitle')} description={t('logistics.readyDescription')} />
      <div className="space-y-2 px-4 pt-2">
        <FilterBar onReset={reset} tableId="logistics-ready" values={f} onApplyView={(v) => setAll(v as typeof FILTER_DEFAULTS)}>
          <FilterField label={t('common.orderNo')}>
            <Input inputSize="sm" value={f.siparisNo} onChange={(e) => set('siparisNo', e.target.value)} />
          </FilterField>
          <FilterField label={t('common.customer')}>
            <Input inputSize="sm" value={f.musteri} onChange={(e) => set('musteri', e.target.value)} />
          </FilterField>
          <FilterField label={t('common.stage')}>
            <Select value={f.asama} onValueChange={(v) => set('asama', v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('myOrders.filter.all')}</SelectItem>
                {stageOptions.map((s) => <SelectItem key={s} value={s}>{stageLabel(t, s)}</SelectItem>)}
              </SelectContent>
            </Select>
          </FilterField>
        </FilterBar>
      </div>
      <FillRegion className="pt-2">
        <MasterDetailLayout fill siparisNo={activeNo} onClose={() => setActiveNo(null)} logisticsView>
          <DataTable
            fill
            tableId="logistics-ready"
            exportFileName="lojistik-hazir"
            columns={cols}
            data={filtered as Row[]}
            keyField="siparisNo"
            loading={isLoading}
            error={isError}
            emptyMessage={notHere}
            density="compact"
            activeRowKey={activeNo}
            onActiveRowChange={(r) => setActiveNo(r.siparisNo)}
            rowActions={[
              { key: 'detail', label: t('common.details'), shortcut: 'Enter', onSelect: (r) => setActiveNo(r.siparisNo) },
              { key: 'ship', label: t('logistics.createShipment'), disabled: (r) => r.siparisMiTeklifMi !== 'Hazir', onSelect: (r) => openShipment(r) },
            ]}
          />
        </MasterDetailLayout>
      </FillRegion>

      <Dialog open={!!target} onOpenChange={(o) => { if (!o) setTarget(null) }}>
        <DialogContent size="md">
          <form onSubmit={onSubmit} onKeyDown={onEnterNav} className="space-y-3">
            <DialogHeader><DialogTitle>{t('logistics.shipmentTitle', { no: target?.siparisNo })}</DialogTitle></DialogHeader>
            {target?.onayliFirma && (
              <p className="rounded-md bg-info-soft px-2 py-1 text-xs text-info-soft-foreground">{t('logistics.prefilledFromOffer')}</p>
            )}
            <FormField label={t('logistics.carrierLabel')} required error={submitted && !form.firmaAdi ? t('validation.required') : null}>
              <CarrierPicker autoFocus value={form.firmaAdi} onChange={(v) => setForm((x) => ({ ...x, firmaAdi: v }))} />
            </FormField>
            <FormField label={t('logistics.transportType')} required error={submitted && !form.lojistikCesit.trim() ? t('validation.required') : null}>
              {/* PROMPT-v7 §5 — Incoterms dropdown'u (ortak sabit). */}
              <Select value={form.lojistikCesit || undefined} onValueChange={(v) => setForm((x) => ({ ...x, lojistikCesit: v }))}>
                <SelectTrigger><SelectValue placeholder={t('logistics.cesit.select')} /></SelectTrigger>
                <SelectContent>{INCOTERMS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
            <div className="grid grid-cols-2 gap-2">
              <FormField label={t('logistics.agreedAmount')} hint={form.fiyat > 0 ? undefined : t('logistics.zeroPriceHint')}>
                <DecimalInput value={form.fiyat} onValueChange={(v) => setForm((x) => ({ ...x, fiyat: v === '' ? 0 : v }))} />
              </FormField>
              <FormField label={t('logistics.shipDate')}>
                <Input type="date" value={form.sTarih} onChange={(e) => setForm((x) => ({ ...x, sTarih: e.target.value }))} />
              </FormField>
            </div>
            <FormField label={t('logistics.note')}>
              <Textarea rows={2} value={form.lojistikNot} onChange={(e) => setForm((x) => ({ ...x, lojistikNot: e.target.value }))} />
            </FormField>

            {/* Round-8 §12 — taşıyıcı anlaşması özeti: kiminle, nasıl ve ne kadara. */}
            <div className="space-y-1 rounded-md border bg-muted/40 px-3 py-2">
              <p className="text-xs font-medium text-muted-foreground">{t('logistics.agreement.title')}</p>
              <KeyValue label={t('logistics.agreement.firm')} value={form.firmaAdi || t('logistics.agreement.empty')} />
              <KeyValue label={t('logistics.agreement.type')} value={form.lojistikCesit || t('logistics.agreement.empty')} />
              <KeyValue label={t('logistics.agreement.amount')} value={form.fiyat > 0 ? formatCurrency(form.fiyat) : <span className="text-warning">{t('logistics.agreement.empty')}</span>} />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setTarget(null)}>{t('common.cancel')}</Button>
              <Button type="submit" loading={createMut.isPending}><Truck className="h-4 w-4" /> {t('logistics.ship')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </FillPage>
  )
}

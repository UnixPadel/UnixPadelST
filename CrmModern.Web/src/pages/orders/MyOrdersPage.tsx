import { CompleteOrderModal } from '@/components/order/CompleteOrderModal'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, AlertTriangle, Copy, Eye, FileCheck2, MessageSquareWarning, PencilLine, Pencil, Plus, Trash2 } from 'lucide-react'
import { getMyOrders, convertToOrder, getRejectionNote, deleteOrder } from '@/api/orders'
import { PageHeader } from '@/components/PageHeader'
import { FillPage, FillRegion } from '@/components/FillPage'
import { DataTable, type Column, type RowAction } from '@/components/DataTable'
import { StatusBadge } from '@/components/StatusBadge'
import { OrderKontrolBadge } from '@/components/OrderKontrolBadge'
import { OrderDetailModal } from '@/components/OrderDetailModal'
import { RowActionsMenu } from '@/components/RowActionsMenu'
import { FilterBar, FilterField, ALL, useFilterState, useDefaultView } from '@/components/FilterBar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { useAuth } from '@/hooks/useAuth'
import { useAppMutation } from '@/hooks/useAppMutation'
import { isSuperAdmin, isAccountingApprover } from '@/lib/permissions'
import { formatDate } from '@/lib/utils'
import { stageLabel, kontrolLabel, statusLabel } from '@/lib/status'
import { trLower } from '@/components/ui/combobox'
import type { OrderListDto } from '@/types'

// §17 — ana Siparişler ekranındaki filtrelerle aynı küme.
const STAGE_OPTIONS = ['Teklif', 'Siparis', 'Planlama', 'Uretim', 'Hazir', 'Lojistik', 'TamamlanmaBekliyor', 'Tamamlandi', 'Iptal']
const KONTROL_OPTIONS = ['Kontrol', 'Onay', 'Reddet']
const ODEME_OPTIONS = ['Beklemede', 'Ödendi']
const FILTER_DEFAULTS = { temsilci: ALL, stage: ALL, kontrol: ALL, odeme: ALL, musteri: '', siparisNo: '', from: '', to: '' }

type Row = OrderListDto & Record<string, unknown>

/**
 * PROMPT.md #20: Siparişlerim ekranı — port of legacy Siparislerim.cs.
 *
 * Satır aksiyonları legacy CellContentClick kurallarını korur:
 *   Form Göster    — her zaman; Sipariş Detayı penceresinde açılır (Enter / çift tık da).
 *   Siparişe Çevir — Teklif ve kontrol !== 'Reddet' (onaylı pencere).
 *   Red Notu       — kontrol === 'Reddet'.
 *   Revize         — Teklif/Sipariş ve kontrol !== 'Onay'.
 *   Düzenle / Sil  — kontrol onayı öncesi ve silinmemiş (Sil zorunlu gerekçeli).
 *   Kopyala ile yeni (E-14) — her zaman.
 * Önceden satır başına 6 eş ağırlıklı buton vardı; şimdi birincil "Form" +
 * "⋯" menüsü (sağ tık / Shift+F10 ile aynı kayıt). Uygun olmayan aksiyonlar
 * menüde pasif görünür.
 */
function rowNo(r: OrderListDto): string {
  return r.siparisMiTeklifMi === 'Siparis' ? r.siparisNo : r.teklifNo
}

export function MyOrdersPage() {
  const nav = useNavigate()
  const { t } = useTranslation()
  const { confirm, askReason } = useConfirm()
  const { getUser } = useAuth()
  const user = getUser()
  // PROMPT-v4 §6.2 — elshan.rasulov tüm sistemi izler; sahip (Temsilci) kolonu
  // yalnız ona görünür (backend /my zaten tüm satırları döner).
  const isGlobalViewer = getUser()?.kullaniciAdi === 'elshan.rasulov' || isSuperAdmin(getUser())
  const { values: f, set, setAll, reset } = useFilterState(FILTER_DEFAULTS)
  useDefaultView('my-orders', JSON.stringify(f) !== JSON.stringify(FILTER_DEFAULTS), (v) => setAll(v as typeof FILTER_DEFAULTS))

  const { data: orders = [], isLoading, isError } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => getMyOrders(),
    // PROMPT-v5 §3 — canlı izleme: başka kullanıcıların statü değişimleri ≤30 sn'de
    // veya sekme odağında anında yansır.
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: 'always',
    staleTime: 0,
  })

  const temsilciOptions = useMemo(
    () => Array.from(new Set(orders.map((o) => o.kullaniciAdSoyad).filter(Boolean) as string[])).sort(
      (a, b) => a.localeCompare(b, 'tr-TR', { sensitivity: 'base' })),
    [orders],
  )

  const filtered = useMemo(() => {
    const mu = trLower(f.musteri), no = trLower(f.siparisNo)
    return orders.filter((o) => {
      if (isGlobalViewer && f.temsilci !== ALL && (o.kullaniciAdSoyad ?? '') !== f.temsilci) return false
      if (f.stage !== ALL && o.siparisMiTeklifMi !== f.stage) return false
      if (f.kontrol !== ALL && o.kontrol !== f.kontrol) return false
      if (f.odeme !== ALL && (o.odemeDurum ?? '') !== f.odeme) return false
      if (mu && !trLower(o.musteriAd ?? '').includes(mu)) return false
      if (no && !trLower(rowNo(o)).includes(no) && !trLower(o.siparisNo ?? '').includes(no) && !trLower(o.teklifNo ?? '').includes(no)) return false
      if (f.from && new Date(o.tarih) < new Date(f.from)) return false
      if (f.to && new Date(o.tarih) > new Date(`${f.to}T23:59:59`)) return false
      return true
    })
  }, [orders, isGlobalViewer, f])

  const [activeNo, setActiveNo] = useState<string | null>(null)
  const [completeTarget, setCompleteTarget] = useState<OrderListDto | null>(null)
  const [redTarget, setRedTarget] = useState<string | null>(null)
  const { data: redData, isLoading: redLoading } = useQuery({
    queryKey: ['order-rejection-note', redTarget],
    queryFn: () => getRejectionNote(redTarget!),
    enabled: !!redTarget,
  })

  const convertMut = useAppMutation({
    mutationFn: (teklifNo: string) => convertToOrder(teklifNo),
    successTitle: t('myOrders.toast.converted'),
    successDescription: (no) => String(no ?? ''),
    errorTitle: t('myOrders.toast.convertFailed'),
  })
  const deleteMut = useAppMutation({
    mutationFn: ({ no, gerekce }: { no: string; gerekce: string }) => deleteOrder(no, gerekce),
    successTitle: t('myOrders.toast.deleted'),
    errorTitle: t('myOrders.toast.deleteFailed'),
  })

  // ── Validity helpers (legacy rules) ────────────────────────────────────
  const canConvert = (r: OrderListDto) => r.siparisMiTeklifMi === 'Teklif' && r.kontrol !== 'Reddet' && !r.silindi
  const canShowRedNote = (r: OrderListDto) => r.kontrol === 'Reddet'
  const canRevise = (r: OrderListDto) =>
    (r.siparisMiTeklifMi === 'Teklif' || r.siparisMiTeklifMi === 'Siparis') && r.kontrol !== 'Onay'
  // §7 — Kontrol onayı öncesi + silinmemiş düzenlenebilir/silinebilir.
  const canEditDelete = (r: OrderListDto) => r.kontrol !== 'Onay' && !r.silindi && r.siparisMiTeklifMi !== 'Tamamlandi' && r.siparisMiTeklifMi !== 'Iptal'
  const canComplete = (r: OrderListDto) => isAccountingApprover(user) && r.siparisMiTeklifMi !== 'Tamamlandi' && r.siparisMiTeklifMi !== 'Teklif' && r.siparisMiTeklifMi !== 'Iptal' && !r.silindi

  const askConvert = async (r: OrderListDto) => {
    const no = rowNo(r)
    if (await confirm({ title: t('myOrders.convertConfirm.title'), description: `${no} — ${r.musteriAd}`, confirmLabel: t('myOrders.actions.sipariseCevir') }))
      convertMut.mutate(no)
  }
  const askDelete = async (r: OrderListDto) => {
    const no = rowNo(r)
    const gerekce = await askReason({
      title: t('myOrders.delete.title', { no }), label: t('myOrders.delete.reason'),
      destructive: true, confirmLabel: t('common.delete'),
    })
    if (gerekce) deleteMut.mutate({ no, gerekce })
  }

  const actions: RowAction<Row>[] = [
    { key: 'form', label: t('myOrders.actions.formGoster'), shortcut: 'Enter', icon: <Eye className="h-3.5 w-3.5" />, onSelect: (r) => setActiveNo(rowNo(r)) },
    { key: 'complete', label: 'Siparişi Tamamla', icon: <AlertTriangle className="h-3.5 w-3.5 text-red-600" />, hidden: (r) => !canComplete(r), onSelect: (r) => setCompleteTarget(r), destructive: true },
    { key: 'convert', label: t('myOrders.actions.sipariseCevir'), icon: <FileCheck2 className="h-3.5 w-3.5" />, disabled: (r) => !canConvert(r), onSelect: (r) => askConvert(r) },
    { key: 'red', label: t('myOrders.actions.redNotu'), icon: <MessageSquareWarning className="h-3.5 w-3.5" />, hidden: (r) => !canShowRedNote(r), onSelect: (r) => setRedTarget(rowNo(r)) },
    { key: 'revise', label: t('myOrders.actions.revize'), icon: <PencilLine className="h-3.5 w-3.5" />, separatorBefore: true, disabled: (r) => !canRevise(r), onSelect: (r) => nav(`/orders/new?revise=${encodeURIComponent(rowNo(r))}`) },
    { key: 'amend', label: t('myOrders.actions.duzenle'), icon: <Pencil className="h-3.5 w-3.5" />, disabled: (r) => !canEditDelete(r), onSelect: (r) => nav(`/orders/new?amend=${encodeURIComponent(rowNo(r))}`) },
    { key: 'copy', label: t('orderDetail.copyAsNew'), icon: <Copy className="h-3.5 w-3.5" />, onSelect: (r) => nav(`/orders/new?copyFrom=${encodeURIComponent(rowNo(r))}`) },
    { key: 'delete', label: t('myOrders.actions.sil'), icon: <Trash2 className="h-3.5 w-3.5" />, destructive: true, separatorBefore: true, disabled: (r) => !canEditDelete(r), onSelect: (r) => askDelete(r) },
  ]

  const cols: Column<Row>[] = [
    { key: 'numara', pin: 'left', header: t('myOrders.cols.numara'), sortable: true, hideable: false, sortValue: (r) => rowNo(r), exportValue: (r) => rowNo(r),
      render: (r) => (
        <span className="flex items-center gap-1.5">
          <span className={`font-mono ${r.silindi ? 'text-muted-foreground line-through' : ''}`}>{rowNo(r)}</span>
          {r.silindi && <Badge variant="danger" title={r.degisiklikGerekce ?? undefined}>{t('myOrders.badge.silindi')}</Badge>}
          {!r.silindi && r.guncellendi && <Badge variant="warning" title={r.degisiklikGerekce ?? undefined}>{t('myOrders.badge.guncellendi')}</Badge>}
        </span>
      ) },
    { key: 'musteriAd', truncate: '16rem', header: t('myOrders.cols.musteriAd'), sortable: true },
    // PROMPT-v4 §6.2 — sahip kolonu yalnız elshan görünümünde
    ...(isGlobalViewer ? [{
      key: 'kullaniciAdSoyad', header: t('myOrders.cols.temsilci'), sortable: true,
      render: (r) => (r.kullaniciAdSoyad as string) || '—',
    } satisfies Column<Row>] : []),
    { key: 'siparisMiTeklifMi', header: t('myOrders.cols.asama'), sortable: true,
      render: (r) => (
        <div className="flex flex-col gap-0.5">
          <StatusBadge value={r.siparisMiTeklifMi} context="stage" />
          {r.siparisMiTeklifMi === 'Tamamlandi' && r.tamamlayanAdSoyad && (
            <span className="text-[10px] text-muted-foreground truncate" title={`${r.tamamlayanAdSoyad} tarafından tamamlandı${r.tamamlanmaTarihi ? ` (${formatDate(r.tamamlanmaTarihi)})` : ''}`}>
              {r.tamamlayanAdSoyad}
            </span>
          )}
        </div>
      ) },
    { key: 'kontrol', header: t('myOrders.cols.durum'), sortable: true,
      render: (r) => <OrderKontrolBadge value={r.kontrol} /> },
    { key: 'tarih', header: t('myOrders.cols.tarih'), sortable: true, type: 'date',
      render: (r) => formatDate(r.tarih) },
    {
      key: 'actions', pin: 'right', header: t('myOrders.cols.actions'), hideable: false, exportValue: false,
      render: (r) => (
        <div className="flex items-center gap-1">
          <Button size="xs" variant="outline" onClick={() => setActiveNo(rowNo(r))}>{t('myOrders.actions.formGoster')}</Button>
          {canConvert(r) && (
            <Button size="xs" loading={convertMut.isPendingFor((no) => no === rowNo(r))} onClick={() => askConvert(r)}>
              {t('myOrders.actions.sipariseCevir')}
            </Button>
          )}
          {canShowRedNote(r) && (
            <Button size="xs" variant="outline" className="text-destructive" onClick={() => setRedTarget(rowNo(r))}>
              {t('myOrders.actions.redNotu')}
            </Button>
          )}
          <RowActionsMenu row={r} actions={actions} />
        </div>
      ),
    },
  ]

  return (
    // Scaling Faz 2 — FillPage: sayfa kaymaz, tablo kalan yüksekliği doldurur
    // (başlık + araç çubuğu yerinde kalır).
    <FillPage>
      <PageHeader density="compact"
        title={t('myOrders.title')}
        actions={<Button size="sm" onClick={() => nav('/orders/new')}><Plus className="h-4 w-4" /> {t('myOrders.newOrder')}</Button>}
      />
      <div className="space-y-2 px-4 pt-2">
        <FilterBar onReset={reset} tableId="my-orders" values={f} onApplyView={(v) => setAll(v as typeof FILTER_DEFAULTS)}>
          {isGlobalViewer && (
            <FilterField label={t('common.representative')}>
              <Select value={f.temsilci} onValueChange={(v) => set('temsilci', v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t('myOrders.filter.all')}</SelectItem>
                  {temsilciOptions.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </FilterField>
          )}
          <FilterField label={t('common.orderNo')}>
            <Input inputSize="sm" value={f.siparisNo} onChange={(e) => set('siparisNo', e.target.value)} />
          </FilterField>
          <FilterField label={t('common.customer')}>
            <Input inputSize="sm" value={f.musteri} onChange={(e) => set('musteri', e.target.value)} />
          </FilterField>
          <FilterField label={t('myOrders.filter.stage')}>
            <Select value={f.stage} onValueChange={(v) => set('stage', v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('myOrders.filter.all')}</SelectItem>
                {STAGE_OPTIONS.map((s) => <SelectItem key={s} value={s}>{stageLabel(t, s)}</SelectItem>)}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label={t('myOrders.filter.kontrol')}>
            <Select value={f.kontrol} onValueChange={(v) => set('kontrol', v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('myOrders.filter.all')}</SelectItem>
                {KONTROL_OPTIONS.map((s) => <SelectItem key={s} value={s}>{kontrolLabel(t, s)}</SelectItem>)}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label={t('myOrders.filter.odeme')}>
            <Select value={f.odeme} onValueChange={(v) => set('odeme', v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('myOrders.filter.all')}</SelectItem>
                {ODEME_OPTIONS.map((s) => <SelectItem key={s} value={s}>{statusLabel(t, s)}</SelectItem>)}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label={t('common.startDate')}>
            <Input inputSize="sm" type="date" value={f.from} onChange={(e) => set('from', e.target.value)} />
          </FilterField>
          <FilterField label={t('common.endDate')}>
            <Input inputSize="sm" type="date" value={f.to} onChange={(e) => set('to', e.target.value)} />
          </FilterField>
        </FilterBar>
      </div>
      <FillRegion className="pt-2">
        <DataTable
          fill
          tableId="my-orders"
          exportFileName="siparislerim"
          columns={cols}
          data={filtered as Row[]}
          keyField="siparisAlID"
          loading={isLoading}
          error={isError}
          activeRowKey={filtered.find((o) => rowNo(o) === activeNo)?.siparisAlID ?? null}
          onRowActivate={(r) => setActiveNo(rowNo(r))}
          onRowDoubleClick={(r) => setActiveNo(rowNo(r))}
          rowActions={actions}
        />
      </FillRegion>

      {/* Sipariş Detayı penceresi */}
      <OrderDetailModal siparisNo={activeNo} onClose={() => setActiveNo(null)} />

      {completeTarget && (
        <CompleteOrderModal
          open={!!completeTarget}
          onOpenChange={(o: boolean) => { if (!o) setCompleteTarget(null) }}
          siparisNo={rowNo(completeTarget)}
          currentStage={completeTarget.siparisMiTeklifMi}
          musteriAd={completeTarget.musteriAd}
          toplamFiyat={completeTarget.toplamFiyat}
          odenenMiktar={completeTarget.odenenMiktar}
          paraTipi={completeTarget.paraTipi}
        />
      )}

      {/* Red Notu — inline dialog (legacy MessageBox replacement) */}
      <Dialog open={!!redTarget} onOpenChange={(o) => { if (!o) setRedTarget(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('myOrders.redNote.title')} — {redTarget}</DialogTitle></DialogHeader>
          <div className="min-h-[3rem] whitespace-pre-wrap text-sm">
            {redLoading
              ? t('common.loading')
              : redData?.red
                ? redData.red
                : <span className="text-muted-foreground">{t('myOrders.redNote.empty')}</span>}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRedTarget(null)}>{t('common.close')}</Button>
            {redTarget && (
              <Button onClick={() => { const no = redTarget; setRedTarget(null); nav(`/orders/new?revise=${encodeURIComponent(no)}`) }}>
                <PencilLine className="h-4 w-4" /> {t('myOrders.actions.revize')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FillPage>
  )
}

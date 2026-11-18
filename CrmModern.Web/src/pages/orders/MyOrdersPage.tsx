import { CompleteOrderModal } from '@/components/order/CompleteOrderModal'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Copy, Eye, FileCheck2, MessageSquareWarning, PencilLine, Pencil, Plus, Trash2, Undo2 } from 'lucide-react'
import { getMyOrders, convertToOrder, getRejectionNote, deleteOrder, restoreOrder } from '@/api/orders'
import { PageHeader } from '@/components/PageHeader'
import { FillPage } from '@/components/FillPage'
import { DataTable, type Column, type RowAction } from '@/components/DataTable'
import { StatusBadge } from '@/components/StatusBadge'
import { OrderKontrolBadge } from '@/components/OrderKontrolBadge'
import { OrderDetailModal } from '@/components/OrderDetailModal'
import { OrderWorkPanel } from '@/components/order/OrderWorkPanel'
import { MasterDetailLayout } from '@/components/MasterDetailLayout'
import { useAutoSelectFirst } from '@/hooks/useAutoSelectFirst'
import { useUndoableDelete } from '@/hooks/useUndoableDelete'
import { invalidateOrderGraph } from '@/lib/queryKeys'
import { FilterBar, FilterField, ALL, useFilterState, useDefaultView, moreFilterCount } from '@/components/FilterBar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { useNextStepLabel } from '@/hooks/useNextStep'
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
  const nextStepLabel = useNextStepLabel()
  const { getUser } = useAuth()
  const user = getUser()
  // PROMPT-v4 §6.2 — elshan.rasulov tüm sistemi izler; sahip (Temsilci) kolonu
  // yalnız ona görünür (backend /my zaten tüm satırları döner).
  const isGlobalViewer = getUser()?.kullaniciAdi === 'elshan.rasulov' || isSuperAdmin(getUser())
  const { values: f, set, setAll, reset } = useFilterState(FILTER_DEFAULTS)
  useDefaultView('my-orders', JSON.stringify(f) !== JSON.stringify(FILTER_DEFAULTS), (v) => setAll(v as typeof FILTER_DEFAULTS))

  const { data: orders = [], isLoading, isError, dataUpdatedAt, refetch } = useQuery({
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
  // 4.1 — "Tam ekran": aynı sipariş büyük pencerede.
  const [expandedNo, setExpandedNo] = useState<string | null>(null)
  const [completeTarget, setCompleteTarget] = useState<OrderListDto | null>(null)
  // Liste yüklenince ilk kayıt seçilir; sağ panel hep dolu.
  useAutoSelectFirst(filtered.map(rowNo), activeNo, setActiveNo, isLoading)
  const activeRow = (filtered.find((o) => rowNo(o) === activeNo) as Row | undefined) ?? null
  // Reddedilen siparişte red sebebi ayrı pencere yerine panelin altında görünür.
  const redTarget = activeRow?.kontrol === 'Reddet' ? activeNo : null
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
  const undoable = useUndoableDelete()
  const qc = useQueryClient()
  const deleteMut = useAppMutation({
    mutationFn: ({ no, gerekce }: { no: string; gerekce: string }) => deleteOrder(no, gerekce),
    errorTitle: t('myOrders.toast.deleteFailed'),
    // K5 — "Geri al" restore ucunu çağırır (sipariş zaten yumuşak siliniyor).
    onSuccess: (_d, { no }) => undoable({ title: t('myOrders.toast.deleted'), name: no, restore: () => restoreOrder(no), onRestored: () => invalidateOrderGraph(qc) }),
  })

  // K5 — kaçırılan "Geri al" için kalıcı yol: silinmiş satırda "Geri yükle".
  const restoreMut = useAppMutation({
    mutationFn: (no: string) => restoreOrder(no),
    successTitle: t('undo.restored'),
    successDescription: (_d, no) => no,
    errorTitle: t('undo.failed'),
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
    if (await confirm({
      title: t('myOrders.convertConfirm.title'), description: `${no} — ${r.musteriAd}`,
      impact: [t('myOrders.impact.convert')],
      nextStep: await nextStepLabel(no),
      confirmLabel: t('myOrders.actions.sipariseCevir'),
    }))
      convertMut.mutate(no)
  }
  const askDelete = async (r: OrderListDto) => {
    const no = rowNo(r)
    const gerekce = await askReason({
      title: t('myOrders.delete.title', { no }), description: r.musteriAd, label: t('myOrders.delete.reason'),
      impact: [t('myOrders.impact.delete'), t('common.undoHint')],
      destructive: true, confirmLabel: t('common.delete'),
    })
    if (gerekce) deleteMut.mutate({ no, gerekce })
  }

  const actions: RowAction<Row>[] = [
    { key: 'form', label: t('myOrders.actions.formGoster'), shortcut: 'Enter', icon: <Eye className="h-3.5 w-3.5" />, onSelect: (r) => setActiveNo(rowNo(r)) },
    { key: 'complete', label: t('completeOrder.open'), icon: <AlertTriangle className="h-4 w-4 text-danger" aria-hidden />, hidden: (r) => !canComplete(r), onSelect: (r) => setCompleteTarget(r), destructive: true },
    { key: 'convert', label: t('myOrders.actions.sipariseCevir'), icon: <FileCheck2 className="h-3.5 w-3.5" />, disabled: (r) => !canConvert(r), onSelect: (r) => askConvert(r) },
    { key: 'revise', label: t('myOrders.actions.revize'), icon: <PencilLine className="h-3.5 w-3.5" />, separatorBefore: true, disabled: (r) => !canRevise(r), onSelect: (r) => nav(`/orders/new?revise=${encodeURIComponent(rowNo(r))}`) },
    { key: 'amend', label: t('myOrders.actions.duzenle'), icon: <Pencil className="h-3.5 w-3.5" />, disabled: (r) => !canEditDelete(r), onSelect: (r) => nav(`/orders/new?amend=${encodeURIComponent(rowNo(r))}`) },
    { key: 'copy', label: t('orderDetail.copyAsNew'), icon: <Copy className="h-3.5 w-3.5" />, onSelect: (r) => nav(`/orders/new?copyFrom=${encodeURIComponent(rowNo(r))}`) },
    { key: 'restore', label: t('undo.restore'), hidden: (r) => !r.silindi, onSelect: (r) => restoreMut.mutate(rowNo(r)) },
    { key: 'delete', label: t('myOrders.actions.sil'), icon: <Trash2 className="h-3.5 w-3.5" />, destructive: true, separatorBefore: true, hidden: (r) => !!r.silindi, disabled: (r) => !canEditDelete(r), onSelect: (r) => askDelete(r) },
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
    { key: 'musteriAd', truncate: '10rem', header: t('myOrders.cols.musteriAd'), sortable: true },
    { key: 'siparisMiTeklifMi', header: t('myOrders.cols.asama'), sortable: true,
      render: (r) => (
        <div className="flex flex-col gap-0.5">
          <StatusBadge value={r.siparisMiTeklifMi} context="stage" />
          {r.siparisMiTeklifMi === 'Tamamlandi' && r.tamamlayanAdSoyad && (
            <span className="text-2xs text-muted-foreground truncate" title={`${r.tamamlayanAdSoyad} tarafından tamamlandı${r.tamamlanmaTarihi ? ` (${formatDate(r.tamamlanmaTarihi)})` : ''}`}>
              {r.tamamlayanAdSoyad}
            </span>
          )}
        </div>
      ) },
    { key: 'kontrol', header: t('myOrders.cols.durum'), sortable: true,
      render: (r) => <OrderKontrolBadge value={r.kontrol} /> },
    // PROMPT-v4 §6.2 — sahip kolonu yalnız elshan görünümünde. Sonda durur: dar ekranda
    // bir sütun taşacaksa aşama / durum değil bu taşsın.
    ...(isGlobalViewer ? [{
      key: 'kullaniciAdSoyad', truncate: '9rem', header: t('myOrders.cols.temsilci'), sortable: true,
      render: (r) => (r.kullaniciAdSoyad as string) || '—',
    } satisfies Column<Row>] : []),
    { key: 'tarih', header: t('myOrders.cols.tarih'), sortable: true, type: 'date', defaultHidden: true,
      render: (r) => formatDate(r.tarih) },
    // Satır başına buton yok: seçili siparişin işi sağ panelin altında (tek ana buton),
    // geri kalan işlemler panel başlığındaki "Diğer işlemler" menüsünde.
  ]

  // Sağ panelin sabit alt bölgesi: bu siparişte sıradaki tek iş.
  const panelFooter = !activeRow ? undefined
    : activeRow.silindi ? (
      <Button size="lg" variant="outline" className="w-full" loading={restoreMut.isPendingFor((no) => no === rowNo(activeRow))} onClick={() => restoreMut.mutate(rowNo(activeRow))}>
        <Undo2 className="h-4 w-4" aria-hidden /> {t('undo.restore')}
      </Button>
    ) : canShowRedNote(activeRow) ? (
      <>
        <div className="rounded-md border border-danger/40 bg-danger-soft px-3 py-2">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-danger-soft-foreground">
            <MessageSquareWarning className="h-4 w-4" aria-hidden /> {t('myOrders.redNote.title')}
          </p>
          <p className="mt-1 max-h-24 overflow-y-auto whitespace-pre-wrap text-sm text-danger-soft-foreground">
            {redLoading ? t('common.loading') : redData?.redNotu || t('myOrders.redNote.empty')}
          </p>
        </div>
        {canRevise(activeRow) && (
          <Button size="lg" className="w-full" onClick={() => nav(`/orders/new?revise=${encodeURIComponent(rowNo(activeRow))}`)}>
            <PencilLine className="h-4 w-4" aria-hidden /> {t('myOrders.actions.revize')}
          </Button>
        )}
      </>
    ) : canConvert(activeRow) ? (
      <Button size="lg" className="w-full" loading={convertMut.isPendingFor((no) => no === rowNo(activeRow))} onClick={() => askConvert(activeRow)}>
        <FileCheck2 className="h-4 w-4" aria-hidden /> {t('myOrders.actions.sipariseCevir')}
      </Button>
    ) : undefined
  // Sipariş detayının "Diğer işlemler" menüsüne eklenenler: alt bölgedeki ana buton,
  // "Siparişi Aç" (zaten açık) ve detayın kendi sunduğu Kopyala / Tamamla dışındakiler.
  const resolve = (v: boolean | ((r: Row) => boolean) | undefined, r: Row) => (typeof v === 'function' ? v(r) : !!v)
  const moreActions: RowAction<unknown>[] = !activeRow ? [] : actions
    .filter((a) => !['form', 'convert', 'copy', 'complete'].includes(a.key) && !resolve(a.hidden, activeRow))
    // Reddedilen siparişte "Revize Et" zaten alttaki ana buton.
    .filter((a) => !(a.key === 'revise' && canShowRedNote(activeRow)))
    .map((a) => ({ ...a, hidden: false, disabled: resolve(a.disabled, activeRow), separatorBefore: false, onSelect: () => a.onSelect(activeRow) }))

  return (
    // Scaling Faz 2 — FillPage: sayfa kaymaz, tablo kalan yüksekliği doldurur
    // (başlık + araç çubuğu yerinde kalır).
    <FillPage>
      <PageHeader density="compact"
        title={t('myOrders.title')}
        actions={<Button size="sm" onClick={() => nav('/orders/new')}><Plus className="h-4 w-4" /> {t('myOrders.newOrder')}</Button>}
      />
      {/* 4.1 (K7) — liste solda, sipariş detayı sağda (önceden modal listeyi kapatıyordu). */}
      <MasterDetailLayout
        pageId="my-orders"
        open
        defaultShare={0.4}
        onExpand={activeNo ? () => setExpandedNo(activeNo) : undefined}
        title={activeNo ? t('orderDetail.title', { no: activeNo }) : t('masterDetail.panel')}
        detail={<OrderWorkPanel siparisNo={activeNo} emptyText={t(filtered.length ? 'masterDetail.selectHint' : 'masterDetail.emptyList')} footer={panelFooter} extraActions={moreActions} />}
        list={<>
        {/* Filtreler yalnız listeyi süzer: liste sütununun üstünde durur, sağ panel sayfa başlığının hemen altından başlar. */}
        <FilterBar className="mb-2 shrink-0" onReset={reset} tableId="my-orders" values={f} onApplyView={(v) => setAll(v as typeof FILTER_DEFAULTS)}
          primaryCount={2} moreActiveCount={moreFilterCount(f, FILTER_DEFAULTS, ['siparisNo', 'musteri'])}>
          <FilterField label={t('common.orderNo')}>
            <Input inputSize="sm" value={f.siparisNo} onChange={(e) => set('siparisNo', e.target.value)} />
          </FilterField>
          <FilterField label={t('common.customer')}>
            <Input inputSize="sm" value={f.musteri} onChange={(e) => set('musteri', e.target.value)} />
          </FilterField>
          {isGlobalViewer && (
            <FilterField label={t('common.representative')}>
              <Select value={f.temsilci} onValueChange={(v) => set('temsilci', v)}>
                <SelectTrigger size="sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t('myOrders.filter.all')}</SelectItem>
                  {temsilciOptions.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </FilterField>
          )}
          <FilterField label={t('myOrders.filter.stage')}>
            <Select value={f.stage} onValueChange={(v) => set('stage', v)}>
              <SelectTrigger size="sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('myOrders.filter.all')}</SelectItem>
                {STAGE_OPTIONS.map((s) => <SelectItem key={s} value={s}>{stageLabel(t, s)}</SelectItem>)}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label={t('myOrders.filter.kontrol')}>
            <Select value={f.kontrol} onValueChange={(v) => set('kontrol', v)}>
              <SelectTrigger size="sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('myOrders.filter.all')}</SelectItem>
                {KONTROL_OPTIONS.map((s) => <SelectItem key={s} value={s}>{kontrolLabel(t, s)}</SelectItem>)}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label={t('myOrders.filter.odeme')}>
            <Select value={f.odeme} onValueChange={(v) => set('odeme', v)}>
              <SelectTrigger size="sm"><SelectValue /></SelectTrigger>
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
        <DataTable
          fill
          updatedAt={dataUpdatedAt}
          onRefresh={() => void refetch()}
          tableId="my-orders-v2"
          exportFileName="siparislerim"
          columns={cols}
          data={filtered as Row[]}
          keyField="siparisAlID"
          loading={isLoading}
          error={isError}
          activeRowKey={filtered.find((o) => rowNo(o) === activeNo)?.siparisAlID ?? null}
          onRowActivate={(r) => setActiveNo(rowNo(r))}
          onRowClick={(r) => setActiveNo(rowNo(r))}
          rowGoneNotice={false}
          actionBar={false}
          rowActions={actions}
        />
        </>}
      />

      {/* Sipariş Detayı penceresi */}
      <OrderDetailModal siparisNo={expandedNo} onClose={() => setExpandedNo(null)} />

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

    </FillPage>
  )
}

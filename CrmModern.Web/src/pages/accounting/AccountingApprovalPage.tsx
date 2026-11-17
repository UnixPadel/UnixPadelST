import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Eye } from 'lucide-react'
import {
  getAccountingOrders, getTransactionsForOrder,
  approveMuhasebeAndMoveToPlanning, approveLogistics,
  finalizeCompletion, addTransaction,
} from '@/api/accounting'
import { getOrderDetail } from '@/api/orders'
import { getOrderStep, getWaiting } from '@/api/workflow'
import { CancelTransactionDialog, type CancelTxTarget } from '@/components/CancelTransactionDialog'
import { DataTable, type Column } from '@/components/DataTable'
import { FillPage } from '@/components/FillPage'
import { MasterDetailLayout } from '@/components/MasterDetailLayout'
import { OrderDetailModal } from '@/components/OrderDetailModal'
import { AccountingFolderDialog } from '@/components/order/AccountingFolder'
import { CompleteOrderModal } from '@/components/order/CompleteOrderModal'
import { PageHeader } from '@/components/PageHeader'
import { RowActionsMenu } from '@/components/RowActionsMenu'
import { StatusBadge } from '@/components/StatusBadge'
import { useShortcutHints } from '@/components/StatusBar'
import { useToast } from '@/components/ToastProvider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { WaitingUpstreamPanel } from '@/components/WaitingUpstreamPanel'
import { useNotHereHint } from '@/hooks/useNotHereHint'
import { toastApiError } from '@/lib/apiError'
import { localDateInput } from '@/lib/date'
import { sumOf } from '@/lib/export'
import { PARA_TIPLERI } from '@/lib/orderForm'
import { invalidateOrderGraph } from '@/lib/queryKeys'
import { formatDate, formatDateShort, formatCurrency } from '@/lib/utils'
import { ACCOUNTING_VIEW_SCREEN, stepLabelKey } from '@/lib/workflow'
import type { AccountingOrderListDto } from '@/types'
import { DecisionPanel } from './approval/DecisionPanel'
import { QueueFilters, QueueTabs } from './approval/QueueTabs'
import {
  VIEWS, isQueueView, matchesView, stepModeOf,
  type FinalizeForm, type PesinatForm, type ViewId,
} from './approval/views'

/**
 * Muhasebe · Onaylar (burcu.karaman). Bu ekranda tek iş yapılır: parayı kontrol
 * et, peşinatı gir, onayla. Düzen bu sırayı izler (40+ ergonomi, 2026-11):
 *
 *   1. İş sırası sekmeleri  (Cari onay · Lojistik onayı · Kapanış ┊ Tüm siparişler)
 *   2. Liste (solda)        — sıradaki ilk sipariş kendiliğinden seçilir
 *   3. Karar paneli (sağda) — ödeme özeti → tahsilatlar → peşinat → tek ana buton
 *
 * Önceki düzen legacy Muhasebe.cs portuydu: üstte 5 sekmeli detay + Özet + Cari
 * kartları, altta altı eş ağırlıklı kuyruk butonu ve liste.
 *
 * Erişim: yalnız burcu.karaman (route RoleGuard + backend username gate'leri).
 * Zincirdeki rolü:
 *   Kontrol onayı → Cari onay (→ Planlama/Fabrika) → … Hazır → Lojistik onayı
 *   (→ sevkiyat) → … teslimat → Kapanış (→ Tamamlandı).
 */
export function AccountingApprovalPage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const { confirm } = useConfirm()
  const { t } = useTranslation()

  // E-10 — Bekleyen İşler "İşle": ?view=…&sel=NO ile ilgili sıra ve satır seçili açılır.
  const [params] = useSearchParams()
  const [view, setView] = useState<ViewId>(() => (VIEWS as string[]).includes(params.get('view') ?? '') ? params.get('view') as ViewId : 'cariQueue')
  const [selected, setSelected] = useState<string | null>(() => params.get('sel'))
  const [formNo, setFormNo] = useState<string | null>(null)
  const [folderNo, setFolderNo] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  // Cari / Lojistik / kuyruk dışı: peşinat (tahsilat). Kapanış: 3. peşinat + son maliyet.
  const [pesinatForm, setPesinatForm] = useState<PesinatForm>({ pesinat: null, pesinatTarihi: localDateInput() })
  const [finalizeForm, setFinalizeForm] = useState<FinalizeForm>({
    pesinat: null, pesinatTarihi: localDateInput(), finalMaliyet: null, maliyetDetayi: '',
  })

  // Yanlış girilen tahsilat iptali (satır silinmez, iptal işaretlenir).
  const [cancelTarget, setCancelTarget] = useState<CancelTxTarget | null>(null)
  const [showCompleteModal, setShowCompleteModal] = useState(false)

  // ── Veri ────────────────────────────────────────────────────────────────
  const { data: orders = [], isLoading, dataUpdatedAt, refetch } = useQuery({
    queryKey: ['accounting-orders'],
    queryFn: getAccountingOrders,
    // Kontrol onayı / Hazır geçişi bu sıralara ≤30 sn'de veya pencere odağında düşsün.
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: 'always',
    staleTime: 0,
  })

  const selectedRow = orders.find((o) => o.siparisNo === selected) ?? null
  const mode = stepModeOf(selectedRow)

  // Sipariş notu için (müşteri/teslimat/kalem ayrıntıları "Siparişi aç"ta).
  const { data: detail } = useQuery({
    queryKey: ['order-detail', selected],
    queryFn: () => getOrderDetail(selected!),
    enabled: !!selected,
  })

  const { data: transactions = [] } = useQuery({
    queryKey: ['acc-approval-tx', selected],
    // İptal edilenler de gelir (üstü çizili gösterilir, toplama girmez).
    queryFn: () => getTransactionsForOrder(selected!, true),
    enabled: !!selected,
  })

  // "Sonraki adım" — iş akışının tek tanımından (OrderWorkflow.cs).
  const { data: step } = useQuery({
    queryKey: ['workflow-step', selected],
    queryFn: () => getOrderStep(selected!),
    enabled: !!selected,
    retry: false,
    staleTime: 30_000,
  })
  const nextStep = step?.stepCode
    ? (step.nextStepCode ? t(stepLabelKey(step.nextStepCode)) : t('confirm.nextDone'))
    : undefined

  // Boş sırada "önceki adımda kaç sipariş bekliyor" (WaitingUpstreamPanel ile aynı önbellek).
  const upstreamScreen = ACCOUNTING_VIEW_SCREEN[view]
  const { data: upstream = [] } = useQuery({
    queryKey: ['workflow-waiting', upstreamScreen],
    queryFn: () => getWaiting(upstreamScreen!),
    enabled: !!upstreamScreen,
    staleTime: 30_000,
  })

  // Seçim değişince formlar sıfırlanır; arka plan tazelemeleri yazılanı ezmesin
  // diye yalnız `selected` bağımlılığı var.
  useEffect(() => {
    setPesinatForm({ pesinat: null, pesinatTarihi: localDateInput() })
    setFinalizeForm({
      pesinat: null, pesinatTarihi: localDateInput(),
      finalMaliyet: selectedRow?.maliyet ?? null,
      maliyetDetayi: selectedRow?.maliyetDetayi ?? '',
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected])

  const queue = isQueueView(view)
  const rows = useMemo(() => orders.filter((o) => {
    if (!matchesView(o, view)) return false
    if (search) {
      const s = search.toLowerCase()
      if (!o.siparisNo.toLowerCase().includes(s) && !o.musteriAd.toLowerCase().includes(s)) return false
    }
    // Tarih aralığı yalnız "Tüm siparişler"de görünür; iş sıralarında gizli filtre uygulanmaz.
    if (!queue && from && new Date(o.tarih) < new Date(from)) return false
    if (!queue && to && new Date(o.tarih) > new Date(to)) return false
    return true
  }), [orders, view, search, from, to, queue])
  const notHere = useNotHereHint(search, !isLoading && rows.length === 0)

  const counts = useMemo(() => ({
    cariQueue: orders.filter((o) => matchesView(o, 'cariQueue')).length,
    lojistikQueue: orders.filter((o) => matchesView(o, 'lojistikQueue')).length,
    tamamlanmaQueue: orders.filter((o) => matchesView(o, 'tamamlanmaQueue')).length,
  }), [orders])

  // Sıraya girince (ya da seçili sipariş listeden çıkınca) ilk sipariş kendiliğinden
  // seçilir: ekran açılır açılmaz karar paneli dolu gelir. Seçili sipariş kullanıcı
  // bir şey değiştirmeden (arka plan tazelemesiyle) listeden çıktıysa sebebi yazılır;
  // sekme/arama/tarih değişikliğinde not çıkmaz.
  const filterSig = `${view}|${search}|${from}|${to}`
  const lastFilterSig = useRef(filterSig)
  const [goneNo, setGoneNo] = useState<string | null>(null)
  useEffect(() => {
    if (isLoading) return
    const filtersChanged = lastFilterSig.current !== filterSig
    lastFilterSig.current = filterSig
    if (filtersChanged) setGoneNo(null)
    if (selected && rows.some((r) => r.siparisNo === selected)) return
    if (selected && !filtersChanged) setGoneNo(selected)
    setSelected(rows[0]?.siparisNo ?? null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, isLoading])

  // Onay sonrası tüm sipariş grafiği tazelenir ve seçim sıradaki satıra geçer.
  const refreshAll = (doneNo?: string) => {
    void invalidateOrderGraph(qc)
    if (!doneNo) return
    const i = rows.findIndex((r) => r.siparisNo === doneNo)
    const next = rows.slice(i + 1).find((r) => r.siparisNo !== doneNo) ?? rows.slice(0, Math.max(i, 0)).find((r) => r.siparisNo !== doneNo)
    setSelected(next?.siparisNo ?? null)
  }

  // ── Mutasyonlar ─────────────────────────────────────────────────────────
  const pesinatPayload = () => ({
    pesinat:       pesinatForm.pesinat ?? undefined,
    pesinatTarihi: pesinatForm.pesinat && pesinatForm.pesinatTarihi ? pesinatForm.pesinatTarihi : undefined,
  })

  const cariMut = useMutation({
    mutationFn: (no: string) => approveMuhasebeAndMoveToPlanning(no, pesinatPayload()),
    onSuccess: (_d, no) => {
      refreshAll(no)
      toast({ title: t('accApproval.toast.cariApproved'), description: no, variant: 'success', popup: true })
    },
    onError: (e) => toastApiError(toast, t('common.error'), e),
  })

  const lojMut = useMutation({
    mutationFn: (no: string) => approveLogistics(no, pesinatPayload()),
    onSuccess: (_d, no) => {
      refreshAll(no)
      toast({ title: t('accApproval.toast.logisticsApproved'), description: no, variant: 'success', popup: true })
    },
    onError: (e) => toastApiError(toast, t('common.error'), e),
  })

  const finalizeMut = useMutation({
    mutationFn: (no: string) => finalizeCompletion(no, {
      pesinat:       finalizeForm.pesinat ?? undefined,
      pesinatTarihi: finalizeForm.pesinat && finalizeForm.pesinatTarihi ? finalizeForm.pesinatTarihi : undefined,
      finalMaliyet:  finalizeForm.finalMaliyet ?? 0,
      maliyetDetayi: finalizeForm.maliyetDetayi.trim() || undefined,
    }),
    onSuccess: (_d, no) => {
      refreshAll(no)
      toast({ title: t('accApproval.finalize.done'), description: no, variant: 'success', popup: true })
    },
    onError: (e) => toastApiError(toast, t('common.error'), e),
  })

  // Kuyruk dışı siparişe sonradan tahsilat: aşama değişmez, seçim korunur.
  const ekPesinatMut = useMutation({
    mutationFn: (no: string) => addTransaction({
      siparisNo:    no,
      odenenMiktar: pesinatForm.pesinat ?? 0,
      tarih:        pesinatForm.pesinatTarihi || undefined,
    }),
    onSuccess: (_d, no) => {
      refreshAll()
      setPesinatForm((f) => ({ ...f, pesinat: null }))
      toast({ title: t('accApproval.toast.pesinatSaved'), description: no, variant: 'success' })
    },
    onError: (e) => toastApiError(toast, t('common.error'), e),
  })

  // ── Karar: tek pencere (etki önizlemesi + varsa uyarılar) ───────────────
  const onPrimary = async () => {
    if (!selectedRow || mode === 'none') return
    const no = selectedRow.siparisNo
    const pt = selectedRow.paraTipi
    const amount = (mode === 'kapanis' ? finalizeForm.pesinat : pesinatForm.pesinat) ?? 0
    const kalan = Math.max(selectedRow.kalanBakiye ?? 0, 0)
    const activeTx = transactions.filter((tx) => !tx.iptal).length
    const pesinatLabel = mode === 'kapanis' ? t('accApproval.finalize.pesinat')
      : mode === 'lojistik' ? t('accApproval.cariLabel.pesinat2')
        : mode === 'cari' ? t('accApproval.cariLabel.pesinat1')
          : t('accApproval.cariLabel.pesinatN', { n: activeTx + 1 })

    const warnings: string[] = []
    // Peşinat bir kapı değildir (OrderWorkflow) — ama peşinli siparişin hiç tahsilatı
    // yokken cari onay verilirse sipariş ödemesiz üretime gidebilir.
    if (mode === 'cari' && !amount && selectedRow.pesinYuzde > 0 && activeTx === 0) {
      warnings.push(t('accApproval.warn.noPesinat', {
        yuzde: selectedRow.pesinYuzde,
        kapora: formatCurrency(((selectedRow.toplamFiyat ?? 0) * selectedRow.pesinYuzde) / 100, pt),
      }))
    }
    // Kalan bakiyeyi aşan tutar engellenmez (gerçek fazla ödeme olabilir) ama sorulur.
    if (amount > kalan) {
      warnings.push(t('accApproval.warn.overpay', {
        kalan: formatCurrency(kalan, pt), fark: formatCurrency(amount - kalan, pt),
      }))
    }

    const payment = amount > 0
      ? t('accApproval.impact.payment', { amount: formatCurrency(amount, pt), label: pesinatLabel })
      : t('accApproval.impact.noPayment')

    if (mode === 'ek') {
      // Aşama değişmez; yalnız fazla ödeme varsa sorulur.
      if (warnings.length && !(await confirm({
        title: t('accApproval.confirmTitle.ek'), description: `${no} — ${selectedRow.musteriAd}`,
        warnings, impact: [payment], confirmLabel: t('accApproval.actions.pesinatKaydet'),
      }))) return
      ekPesinatMut.mutate(no)
      return
    }

    const ok = await confirm({
      title: t(`accApproval.confirmTitle.${mode}`),
      description: `${no} — ${selectedRow.musteriAd}`,
      warnings,
      impact: [
        payment,
        ...(mode === 'kapanis' ? [t('accApproval.impact.cost', { amount: formatCurrency(finalizeForm.finalMaliyet ?? 0, pt) })] : []),
        t(`accApproval.impact.${mode}`),
      ],
      nextStep,
      confirmLabel: t(mode === 'kapanis' ? 'accApproval.actions.tamamla' : mode === 'lojistik' ? 'accApproval.actions.lojistikOnayla' : 'accApproval.actions.cariOnayla'),
    })
    if (!ok) return
    if (mode === 'cari') cariMut.mutate(no)
    else if (mode === 'lojistik') lojMut.mutate(no)
    else finalizeMut.mutate(no)
  }
  const pending = cariMut.isPending || lojMut.isPending || finalizeMut.isPending || ekPesinatMut.isPending

  // Ara adımları atlayarak doğrudan tamamlama (v0.3.8) — ana butondan uzakta, menüde.
  const canComplete = !!selectedRow
    && !['Tamamlandi', 'TamamlanmaBekliyor', 'Teklif', 'Iptal'].includes(selectedRow.siparisMiTeklifMi ?? '')

  // ── Liste kolonları ─────────────────────────────────────────────────────
  type Row = AccountingOrderListDto & Record<string, unknown>
  const moneyFooter = (key: keyof AccountingOrderListDto) => (rs: Row[]) =>
    formatCurrency(sumOf(rs, (r) => r[key] as number), rs[0]?.paraTipi as string)
  const queueLabel = (o: AccountingOrderListDto) =>
    matchesView(o, 'cariQueue') ? t('accApproval.queueBadge.cari')
      : matchesView(o, 'lojistikQueue') ? t('accApproval.queueBadge.lojistik')
        : matchesView(o, 'tamamlanmaQueue') ? t('accApproval.queueBadge.tamamlanma') : ''
  useShortcutHints([
    { keys: '↑↓', label: t('shortcuts.moveRow') },
    { keys: 'Enter', label: t('accApproval.shortcut.form') },
  ])
  const columns: Column<Row>[] = [
    { key: 'siparisNo', pin: 'left', header: t('qc.grid.siparisNo'), sortable: true, hideable: false,
      render: (r) => <span className="font-mono text-xs">{r.siparisNo as string}</span> },
    { key: 'musteriAd', truncate: '10rem', header: t('qc.grid.musteriAd'), sortable: true },
    { key: 'mUlke', header: t('qc.grid.ulke'), sortable: true, defaultHidden: true },
    { key: 'toplamFiyat', header: t('qc.grid.toplamSiparis'), sortable: true, type: 'money',
      render: (r) => formatCurrency((r.toplamFiyat as number) ?? 0, r.paraTipi as string), footer: moneyFooter('toplamFiyat') },
    { key: 'kaparoFiyat', header: t('qc.grid.kaparoBakiyesi'), sortable: true, type: 'money', defaultHidden: true,
      render: (r) => formatCurrency((r.kaparoFiyat as number) ?? 0, r.paraTipi as string), footer: moneyFooter('kaparoFiyat') },
    { key: 'kalanBakiye', header: t('qc.grid.kalanBakiye'), sortable: true, type: 'money',
      render: (r) => formatCurrency((r.kalanBakiye as number) ?? 0, r.paraTipi as string), footer: moneyFooter('kalanBakiye') },
    { key: 'pesinYuzde', header: t('qc.grid.pesinYuzde'), sortable: true, type: 'number', defaultHidden: true,
      render: (r) => `%${r.pesinYuzde}` },
    { key: 'paraTipi', header: t('qc.grid.paraTipi'), sortable: true, defaultHidden: true },
    { key: 'odemeDurum', header: t('qc.grid.odemeDurumu'), sortable: true, defaultHidden: true,
      render: (r) => <StatusBadge value={r.odemeDurum as string} context="odeme" /> },
    // Aşama ve Sıra yalnız "Tüm siparişler"de: iş sırasında tüm satırlar aynı değeri taşır.
    ...(queue ? [] : [
      { key: 'siparisMiTeklifMi', header: t('qc.grid.asama'), sortable: true,
        render: (r) => {
          const o = r as AccountingOrderListDto
          return (
            <div className="flex flex-col gap-0.5">
              <StatusBadge value={o.siparisMiTeklifMi} context="stage" />
              {o.siparisMiTeklifMi === 'Tamamlandi' && o.tamamlayanAdSoyad && (
                <span className="text-2xs text-muted-foreground">
                  {o.tamamlayanAdSoyad}{o.tamamlanmaTarihi ? ` · ${formatDate(o.tamamlanmaTarihi)}` : ''}
                </span>
              )}
            </div>
          )
        } },
      { key: 'kuyruk', header: t('accApproval.grid.kuyruk'), exportValue: (r) => queueLabel(r as AccountingOrderListDto),
        sortValue: (r) => queueLabel(r as AccountingOrderListDto),
        render: (r) => {
          const o = r as AccountingOrderListDto
          if (matchesView(o, 'cariQueue')) return <Badge variant="warning">{t('accApproval.queueBadge.cari')}</Badge>
          if (matchesView(o, 'lojistikQueue')) return <Badge variant="info">{t('accApproval.queueBadge.lojistik')}</Badge>
          if (matchesView(o, 'tamamlanmaQueue')) return <Badge variant="success">{t('accApproval.queueBadge.tamamlanma')}</Badge>
          return <span className="text-xs text-muted-foreground">—</span>
        } },
    ] satisfies Column<Row>[]),
    // Tarih varsayılan gizli: 1366 px'de liste yatay kaymasın (tarih numarada ve sipariş detayında var).
    { key: 'tarih', header: t('qc.grid.tarih'), sortable: true, type: 'date', defaultHidden: true,
      render: (r) => formatDateShort(r.tarih as string) },
  ]

  const emptyMessage = notHere ?? (queue
    ? [t('accApproval.empty.queue'), upstream.length > 0 ? t('accApproval.empty.upstream', { count: upstream.length }) : ''].filter(Boolean).join(' ')
    : undefined)

  return (
    <FillPage>
      <PageHeader
        density="compact"
        title={t('accApproval.title')}
        // 1 — Hangi iş? Sekmeler başlıkla aynı satırda; arama liste sütununun üstünde.
        meta={
          <QueueTabs
            view={view}
            onViewChange={(v) => { setView(v); setSelected(null) }}
            counts={counts}
          />
        }
        // İç denetim — etkin sıranın bir önceki adımında bekleyenler.
        actions={<WaitingUpstreamPanel screen={upstreamScreen} variant="button" />}
      />

      {/* 2 — Hangi sipariş? (solda)   3 — Karar (sağda, hep açık) */}
      <MasterDetailLayout
        pageId="acc-approval"
        open
        defaultShare={0.4}
        panelLabel={t('accApproval.panel')}
        title={selectedRow ? <span className="font-mono">{selectedRow.siparisNo}</span> : t('accApproval.panel')}
        headerActions={selectedRow && (
          <>
            <Button size="xs" variant="ghost" onClick={() => setFormNo(selectedRow.siparisNo)}>
              <Eye className="h-4 w-4" aria-hidden /> {t('common.openOrder')}
            </Button>
            {canComplete && (
              <RowActionsMenu
                row={selectedRow}
                label={t('common.moreActions')}
                actions={[{
                  key: 'complete', label: t('accApproval.completeDirect'), destructive: true,
                  icon: <AlertTriangle className="h-4 w-4" aria-hidden />,
                  onSelect: () => setShowCompleteModal(true),
                }]}
              />
            )}
          </>
        )}
        list={<>
          <QueueFilters
            view={view}
            onViewChange={(v) => { setView(v); setSelected(null) }}
            search={search} onSearch={setSearch}
            from={from} to={to} onFrom={setFrom} onTo={setTo}
          />
          {goneNo && (
            <div role="status" className="mb-2 flex shrink-0 flex-wrap items-center gap-2 rounded-md border border-info/30 bg-info-soft px-3 py-1.5 text-sm text-info-soft-foreground">
              <span className="flex-1">{t('accApproval.gone', { no: goneNo })}</span>
              <Button size="xs" variant="ghost" onClick={() => setGoneNo(null)}>{t('common.close')}</Button>
            </div>
          )}
          <div className="min-h-0 flex-1">
          <DataTable
            fill
            rowGoneNotice={false}
            updatedAt={dataUpdatedAt}
            onRefresh={() => void refetch()}
            // v2: yeni varsayılan kolon düzeni, eski kayıtlı düzenle ezilmesin.
            tableId="acc-approval-v3"
            exportFileName="muhasebe-onay"
            columns={columns}
            data={rows as Row[]}
            keyField="siparisNo"
            loading={isLoading}
            emptyMessage={emptyMessage}
            singleLineRows
            showFooter
            footerGroups={{ by: (r) => r.paraTipi as string, order: PARA_TIPLERI }}
            activeRowKey={selected}
            onActiveRowChange={(r) => setSelected((r as AccountingOrderListDto).siparisNo)}
            onRowActivate={(r) => setFormNo((r as AccountingOrderListDto).siparisNo)}
            // İşlemler karar panelinde görünür; sağ tık yalnız kısayol.
            actionBar={false}
            rowActions={[
              { key: 'form', label: t('common.openOrder'), shortcut: 'Enter', onSelect: (r) => setFormNo((r as AccountingOrderListDto).siparisNo) },
              { key: 'folder', label: t('folder.button'), onSelect: (r) => setFolderNo((r as AccountingOrderListDto).siparisNo) },
            ]}
          />
          </div>
        </>}
        detail={
          <DecisionPanel
            row={selectedRow}
            mode={mode}
            transactions={selectedRow ? transactions : []}
            siparisNotu={detail?.siparisNotu}
            nextStep={nextStep}
            pesinatForm={pesinatForm}
            onPesinatChange={(p) => setPesinatForm((f) => ({ ...f, ...p }))}
            finalizeForm={finalizeForm}
            onFinalizeChange={(p) => setFinalizeForm((f) => ({ ...f, ...p }))}
            pending={pending}
            onPrimary={() => void onPrimary()}
            onCancelTx={(tx) => selectedRow && setCancelTarget({
              ...tx, paraTipi: selectedRow.paraTipi, kalanBakiye: selectedRow.kalanBakiye ?? 0,
            })}
            onOpenFolder={() => selectedRow && setFolderNo(selectedRow.siparisNo)}
          />
        }
      />

      {/* Muhasebe Klasörü: proforma (Excel/PDF), muhasebe ekleri ve Satıcı Ek tek pencerede. */}
      <AccountingFolderDialog siparisNo={folderNo} onClose={() => setFolderNo(null)} />

      {/* Tahsilat iptali — kalan bakiye önizlemeli onay */}
      <CancelTransactionDialog target={cancelTarget} onClose={() => setCancelTarget(null)} />

      {/* Siparişi aç — salt okunur sipariş detayı (müşteri, teslimat, kalemler, geçmiş) */}
      <OrderDetailModal siparisNo={formNo} onClose={() => setFormNo(null)} />

      {showCompleteModal && selectedRow && (
        <CompleteOrderModal
          open={showCompleteModal}
          onOpenChange={setShowCompleteModal}
          siparisNo={selectedRow.siparisNo}
          currentStage={selectedRow.siparisMiTeklifMi}
          musteriAd={selectedRow.musteriAd}
          toplamFiyat={selectedRow.toplamFiyat}
          odenenMiktar={selectedRow.odenenMiktar ?? 0}
          paraTipi={selectedRow.paraTipi}
          onSuccess={() => setSelected(null)}
        />
      )}
    </FillPage>
  )
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Eye, Plus, Trash2, FileSpreadsheet, Wallet, FolderOpen } from 'lucide-react'
import { AccountingFolderDialog } from '@/components/order/AccountingFolder'
import {
  getAccountingOrders, addTransaction, downloadAccountingExcel,
  getTransactionsForOrder,
  submitMaliyetTalep,
  getExtraCosts, addExtraCost, deleteExtraCost, restoreExtraCost,
  type SubmitMaliyetRequest,
} from '@/api/accounting'
import { useUndoableDelete } from '@/hooks/useUndoableDelete'
import { useAutoSelectFirst } from '@/hooks/useAutoSelectFirst'
import { invalidateOrderGraph } from '@/lib/queryKeys'
import { PageHeader } from '@/components/PageHeader'
import { FillPage } from '@/components/FillPage'
import { MasterDetailLayout } from '@/components/MasterDetailLayout'
import { DataTable, type Column } from '@/components/DataTable'
import { StatusBadge } from '@/components/StatusBadge'
import { FilterBar, FilterField, ALL, useFilterState, moreFilterCount } from '@/components/FilterBar'
import { statusLabel } from '@/lib/status'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DecimalInput } from '@/components/DecimalInput'
import { Textarea } from '@/components/ui/textarea'
import { FormField } from '@/components/ui/form-field'
import { CollapsibleSection } from '@/components/ui/accordion'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CancelTransactionDialog, type CancelTxTarget } from '@/components/CancelTransactionDialog'
import { useAuth } from '@/hooks/useAuth'
import { useAppMutation } from '@/hooks/useAppMutation'
import { isAccountingApprover } from '@/lib/permissions'
import { formatDate, formatDateShort, formatCurrency, cn } from '@/lib/utils'
import { sumOf } from '@/lib/export'
import { PARA_TIPLERI } from '@/lib/orderForm'
import { trLower } from '@/components/ui/combobox'
import { useToast } from '@/components/ToastProvider'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { useShortcutHints } from '@/components/StatusBar'
import { toastApiError } from '@/lib/apiError'
import type { AccountingOrderListDto } from '@/types'
import { localDateInput } from '@/lib/date'
import { TahsilatPanel } from './tahsilat/TahsilatPanel'

/**
 * Muhasebe · Tahsilat (legacy Muhasebe.cs'in mantıksal karşılığı).
 *
 * Düzen (2026-11 sadeleştirmesi — Muhasebe · Onaylar ile aynı kalıp):
 *   filtreler → liste (solda) → hep açık tahsilat paneli (sağda).
 * Önceden üstte 6 sekmeli bir form (Sipariş / Müşteri / Teslimat / Satış Temsilcisi /
 * Maliyet / Ek Maliyet), satır başına üç buton ve ayrı bir "Tahsilat" penceresi
 * vardı. Şimdi:
 *   • satırda buton yok; seçilen siparişin ödeme özeti, tahsilatları ve yeni
 *     tahsilat formu sağ panelde, tek ana buton "Tahsilatı kaydet";
 *   • Maliyet ve Ek maliyet panelde kapalı gelen iki bölüm;
 *   • müşteri / teslimat / temsilci ayrıntıları "Siparişi Aç" ile sipariş detayında;
 *   • listede yalnız karar için gereken sütunlar açık, diğerleri "Sütunlar"dan açılır.
 */
type Row = AccountingOrderListDto & Record<string, unknown>
const FILTER_DEFAULTS = { q: '', odemeDurum: ALL, asama: ALL, from: '', to: '' }

export function AccountingPage() {
  const { toast } = useToast()
  const { confirm } = useConfirm()
  const { t } = useTranslation()
  const { getUser } = useAuth()
  const qc = useQueryClient()
  const [params, setParams] = useSearchParams()

  const [selectedNo, setSelectedNo] = useState<string | null>(() => params.get('sel'))
  // Muhasebe Klasörü (eski tek dosyalık "Ek yükle" penceresinin yerine).
  const [folderNo, setFolderNo] = useState<string | null>(null)
  const [excelBusy, setExcelBusy] = useState(false)
  const amountRef = useRef<HTMLInputElement>(null)
  // Tahsilat iptali — yalnız Muhasebe Onay kullanıcıları (backend aynı kapı).
  const canCancelTx = isAccountingApprover(getUser())
  const [cancelTx, setCancelTx] = useState<CancelTxTarget | null>(null)

  const { values: f, set, setAll, reset } = useFilterState(FILTER_DEFAULTS)

  // ── Veri ──────────────────────────────────────────────────────────────
  const { data: orders = [], isLoading, isError } = useQuery({
    queryKey: ['accounting-orders'],
    queryFn: getAccountingOrders,
  })

  const stageOptions = useMemo(() => Array.from(new Set(orders.map((o) => o.siparisMiTeklifMi).filter(Boolean))).sort(), [orders])
  const filtered = useMemo(() => {
    const q = trLower(f.q.trim())
    return orders.filter((o) => {
      if (q && !trLower(o.siparisNo).includes(q) && !trLower(o.musteriAd).includes(q)) return false
      if (f.odemeDurum !== ALL && o.odemeDurum !== f.odemeDurum) return false
      if (f.asama !== ALL && o.siparisMiTeklifMi !== f.asama) return false
      if (f.from && new Date(o.tarih) < new Date(f.from)) return false
      // Bitiş günü dahil.
      if (f.to && new Date(o.tarih) >= new Date(new Date(f.to).getTime() + 86_400_000)) return false
      return true
    })
  }, [orders, f])

  // Liste yüklenince ilk sipariş seçilir; tahsilat paneli hep dolu.
  useAutoSelectFirst(filtered.map((o) => o.siparisNo), selectedNo, setSelectedNo, isLoading)
  const selectedRow = filtered.find((o) => o.siparisNo === selectedNo) ?? null
  const pt = selectedRow?.paraTipi

  // İptal edilenler de gelir (üstü çizili gösterilir, toplama girmez).
  const { data: transactions = [] } = useQuery({
    queryKey: ['order-tx', selectedNo, 'all'],
    queryFn: () => getTransactionsForOrder(selectedNo!, true),
    enabled: !!selectedNo,
  })

  // ── Yeni tahsilat ─────────────────────────────────────────────────────
  const [txTutar, setTxTutar] = useState<number | null>(null)
  const [txTarih, setTxTarih] = useState<string>(() => localDateInput())
  const [maliyetForm, setMaliyetForm] = useState<{ maliyet: number; maliyetDetayi: string }>({ maliyet: 0, maliyetDetayi: '' })
  const [exAciklama, setExAciklama] = useState('')
  const [exTutar, setExTutar] = useState<number>(0)
  // Seçim değişince formlar o siparişe göre sıfırlanır; arka plan tazelemeleri
  // yazılanı ezmesin diye yalnız selectedNo bağımlılığı var.
  useEffect(() => {
    setTxTutar(null)
    setTxTarih(localDateInput())
    setMaliyetForm({ maliyet: selectedRow?.maliyet ?? 0, maliyetDetayi: selectedRow?.maliyetDetayi ?? '' })
    setExAciklama(''); setExTutar(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNo])

  const addMut = useAppMutation({
    mutationFn: ({ no, tutar, tarih }: { no: string; tutar: number; tarih: string; paraTipi?: string | null }) =>
      addTransaction({ siparisNo: no, odenenMiktar: tutar, tarih }),
    successTitle: (_d, v) => t('accounting.tahsilat.saved', { amount: formatCurrency(v.tutar, v.paraTipi ?? undefined) }),
    successDescription: (_d, v) => v.no,
    errorTitle: t('common.error'),
    onSuccess: () => { setTxTutar(null); setTimeout(() => amountRef.current?.focus(), 0) },
  })

  // Kalan bakiyeyi aşan tahsilat engellenmez (gerçek fazla ödeme olabilir) ama
  // sorulur — Muhasebe · Onaylar ile aynı kural ve aynı pencere.
  const saveTx = async () => {
    const tutar = txTutar ?? 0
    if (!selectedRow || tutar <= 0 || addMut.isPending) return
    const kalan = Math.max(selectedRow.kalanBakiye ?? 0, 0)
    if (tutar > kalan) {
      const ok = await confirm({
        title: t('accApproval.overpay.title'),
        description: `${selectedRow.siparisNo} — ${selectedRow.musteriAd}`,
        warnings: [t('accApproval.warn.overpay', { kalan: formatCurrency(kalan, pt), fark: formatCurrency(tutar - kalan, pt) })],
        impact: [t('accounting.tahsilat.impact', { amount: formatCurrency(tutar, pt) })],
        confirmLabel: t('accounting.tahsilat.save'),
      })
      if (!ok) return
    }
    addMut.mutate({ no: selectedRow.siparisNo, tutar, tarih: txTarih, paraTipi: pt })
  }

  // ── Maliyet talebi ────────────────────────────────────────────────────
  const maliyetMut = useAppMutation({
    mutationFn: (_: void) => {
      const body: SubmitMaliyetRequest = {
        maliyet: maliyetForm.maliyet,
        maliyetDetayi: maliyetForm.maliyetDetayi.trim() || undefined,
        toplamSiparis: selectedRow?.toplamFiyat ?? undefined,
        kaporaBakiyesi: selectedRow?.kaparoFiyat ?? undefined,
        kalanBakiyeTalep: selectedRow?.kalanBakiye ?? undefined,
        pesinYuzde: selectedRow?.pesinYuzde,
      }
      return submitMaliyetTalep(selectedNo!, body)
    },
    successTitle: t('accountingFull.toast.maliyetSent'),
    errorTitle: t('common.error'),
  })

  // ── Ek maliyet kalemleri (açıklama + tutar → proformaya yansır) ───────
  // Düzenleme penceresi: cari/lojistik onay akışı (Siparis/Planlama/Hazir).
  const canEditExtras = !!selectedRow && ['Siparis', 'Planlama', 'Hazir'].includes(selectedRow.siparisMiTeklifMi ?? '')
  const { data: extraCosts = [] } = useQuery({
    queryKey: ['order-extra-costs', selectedNo],
    queryFn: () => getExtraCosts(selectedNo!),
    enabled: !!selectedNo,
  })
  const addExtraMut = useAppMutation({
    mutationFn: (_: void) => addExtraCost(selectedNo!, exAciklama.trim(), exTutar),
    successTitle: t('accountingFull.ekstra.added'),
    errorTitle: t('common.error'),
    onSuccess: () => { setExAciklama(''); setExTutar(0) },
  })
  const undoable = useUndoableDelete()
  const delExtraMut = useAppMutation({
    mutationFn: (id: number) => deleteExtraCost(id),
    errorTitle: t('common.error'),
    onSuccess: (_d, id) => {
      const ex = (extraCosts ?? []).find((x) => x.ekMaliyetID === id)
      undoable({ title: t('accountingFull.ekstra.deleted'), name: ex?.aciklama ?? `#${id}`, restore: () => restoreExtraCost(id),
        onRestored: () => invalidateOrderGraph(qc) })
    },
  })

  // PROMPT-v6 §1 — "Muhasebe Onayla" butonu kaldırıldı: Cari onay gate'i
  // Burcu ekranında (/accounting/approval) yaşıyor.

  // Alt toplam döviz başına ayrı satırda (footerGroups) → her hücre tek döviz, tek satır.
  const money = (key: keyof AccountingOrderListDto) => (rows: Row[]) =>
    formatCurrency(sumOf(rows, (r) => r[key] as number), rows[0]?.paraTipi)

  // Açık gelen sütunlar: hangi sipariş, ne kadar, ne kaldı. Diğerleri
  // "Sütunlar"dan açılır; ayrıntı zaten sağ panelde.
  const cols: Column<Row>[] = [
    { key: 'siparisNo', pin: 'left', header: t('common.orderNo'),  sortable: true, hideable: false, render: (r) => <span className="font-mono">{r.siparisNo}</span> },
    { key: 'musteriAd', truncate: '10rem', header: t('common.customer'), sortable: true },
    { key: 'mUlke',         header: t('common.country'),  sortable: true, defaultHidden: true },
    { key: 'sirket',        header: t('accountingFull.cols.sirket'), sortable: true, defaultHidden: true, render: (r) => (r.sirket as string) ?? '—' },
    { key: 'paraTipi',      header: t('common.currency'), sortable: true, defaultHidden: true },
    { key: 'toplamFiyat',   header: t('common.totalAmount'), sortable: true, type: 'money',
      render: (r) => formatCurrency(r.toplamFiyat ?? 0, r.paraTipi), footer: money('toplamFiyat') },
    { key: 'kaparoFiyat',   header: t('accountingFull.cols.kaparo'), sortable: true, type: 'money', defaultHidden: true,
      render: (r) => formatCurrency(r.kaparoFiyat ?? 0, r.paraTipi), footer: money('kaparoFiyat') },
    { key: 'kalanBakiye',   header: t('common.balance'), sortable: true, type: 'money',
      render: (r) => <span className={cn((r.kalanBakiye ?? 0) < 0 && 'text-danger')}>{formatCurrency(r.kalanBakiye ?? 0, r.paraTipi)}</span>,
      footer: money('kalanBakiye') },
    { key: 'pesinYuzde',    header: t('accountingFull.cols.pesinYuzde'), sortable: true, type: 'number', defaultHidden: true, render: (r) => `%${r.pesinYuzde}` },
    { key: 'maliyet',       header: t('accountingFull.cols.maliyet'), sortable: true, type: 'money', defaultHidden: true,
      render: (r) => r.maliyet != null ? formatCurrency(r.maliyet, r.paraTipi) : '—' },
    { key: 'kar',           header: t('accountingFull.cols.kar'), sortable: true, type: 'money', defaultHidden: true,
      render: (r) => r.kar != null ? formatCurrency(r.kar, r.paraTipi) : '—' },
    { key: 'teslimatCesiti',header: t('accountingFull.cols.teslimatCesiti'), defaultHidden: true, render: (r) => (r.teslimatCesiti as string) ?? '—' },
    { key: 'odemeDurum',    header: t('common.status'), sortable: true, defaultHidden: true, render: (r) => <StatusBadge value={r.odemeDurum} context="odeme" /> },
    { key: 'siparisMiTeklifMi', header: t('accountingFull.cols.asama'), sortable: true, defaultHidden: true,
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
    { key: 'muhasebeDurumu',header: t('accountingFull.cols.muhasebeDurum'), sortable: true, defaultHidden: true, render: (r) => r.muhasebeDurumu ? <StatusBadge value={r.muhasebeDurumu} context="purchase" /> : '—' },
    { key: 'tarih',         header: t('common.date'), sortable: true, type: 'date', defaultHidden: true, render: (r) => formatDateShort(r.tarih ?? '-') },
    // Satır başına buton yok: tahsilat, klasör ve sipariş detayı sağ panelde.
  ]

  const openOrder = (no: string) => setParams((p) => { const np = new URLSearchParams(p); np.set('order', no); return np })
  const focusAmount = () => setTimeout(() => amountRef.current?.focus(), 0)

  useShortcutHints([
    { keys: '↑↓', label: t('shortcuts.moveRow') },
    { keys: 'Enter', label: t('accounting.tahsilat.shortcut') },
  ])

  return (
    <FillPage>
      <PageHeader
        density="compact"
        title={t('accounting.title')}
        actions={
          <Button variant="outline" size="sm" loading={excelBusy} title={t('accounting.historyExcelHint')} onClick={async () => {
            setExcelBusy(true)
            try { await downloadAccountingExcel() } catch (e) { toastApiError(toast, t('common.error'), e) } finally { setExcelBusy(false) }
          }}>
            <FileSpreadsheet className="h-4 w-4" /> {t('accounting.historyExcel')}
          </Button>
        }
      />


      {/* Hangi sipariş? (solda)  —  ödeme durumu ve yeni tahsilat (sağda, hep açık) */}
      <MasterDetailLayout
        pageId="accounting"
        open
        defaultShare={0.4}
        panelLabel={t('accounting.panel')}
        title={selectedRow ? <span className="font-mono">{selectedRow.siparisNo}</span> : t('accounting.panel')}
        headerActions={selectedRow && (
          <Button size="xs" variant="ghost" onClick={() => openOrder(selectedRow.siparisNo)}>
            <Eye className="h-4 w-4" aria-hidden /> {t('common.openOrder')}
          </Button>
        )}
        list={<>
          {/* Filtreler yalnız listeyi süzer: liste sütununun üstünde durur, sağ panel sayfa başlığının hemen altından başlar. */}
          <FilterBar className="mb-2 shrink-0" onReset={reset} tableId="accounting" values={f} onApplyView={(v) => setAll(v as typeof FILTER_DEFAULTS)}
          primaryCount={2} moreActiveCount={moreFilterCount(f, FILTER_DEFAULTS, ['q', 'odemeDurum'])}>
          <FilterField label={t('accounting.filter.search')}>
            <Input inputSize="sm" placeholder={t('common.quickFilter')} value={f.q} onChange={(e) => set('q', e.target.value)} />
          </FilterField>
          <FilterField label={t('common.status')}>
            <Select value={f.odemeDurum} onValueChange={(v) => set('odemeDurum', v)}>
              <SelectTrigger size="sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('common.all')}</SelectItem>
                <SelectItem value="Beklemede">{statusLabel(t, 'Beklemede')}</SelectItem>
                <SelectItem value="Ödendi">{statusLabel(t, 'Ödendi')}</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label={t('common.stage')}>
            <Select value={f.asama} onValueChange={(v) => set('asama', v)}>
              <SelectTrigger size="sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('common.all')}</SelectItem>
                {stageOptions.map((s) => <SelectItem key={s} value={s}>{statusLabel(t, s)}</SelectItem>)}
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
            tableId="accounting-v2"
            rowGoneNotice={false}
            exportFileName="muhasebe-tahsilat"
            columns={cols}
            data={filtered as Row[]}
            keyField="siparisNo"
            loading={isLoading}
            error={isError}
            singleLineRows
            showFooter
            footerGroups={{ by: (r) => r.paraTipi, order: PARA_TIPLERI }}
            activeRowKey={selectedNo}
            onActiveRowChange={(r) => setSelectedNo(r.siparisNo)}
            onRowClick={(r) => setSelectedNo(r.siparisNo)}
            // Enter: seçili siparişin tutar alanına geç.
            onRowActivate={(r) => { setSelectedNo(r.siparisNo); focusAmount() }}
            actionBar={false}
            rowActions={[
              { key: 'tx', label: t('accounting.tahsilat.add'), shortcut: 'Enter', icon: <Wallet className="h-3.5 w-3.5" />, onSelect: (r) => { setSelectedNo(r.siparisNo); focusAmount() } },
              { key: 'detail', label: t('common.openOrder'), icon: <Eye className="h-3.5 w-3.5" />, onSelect: (r) => openOrder(r.siparisNo) },
              { key: 'folder', label: t('folder.button'), icon: <FolderOpen className="h-3.5 w-3.5" />, separatorBefore: true, onSelect: (r) => setFolderNo(r.siparisNo) },
            ]}
          />
        </>}
        detail={
          <TahsilatPanel
            row={selectedRow}
            emptyText={t(filtered.length ? 'masterDetail.selectHint' : 'masterDetail.emptyList')}
            transactions={transactions}
            onCancelTx={canCancelTx && selectedRow
              ? (tx) => setCancelTx({ ...tx, paraTipi: selectedRow.paraTipi, kalanBakiye: selectedRow.kalanBakiye ?? 0 })
              : undefined}
            onOpenFolder={() => selectedRow && setFolderNo(selectedRow.siparisNo)}
            tutar={txTutar} onTutar={setTxTutar}
            tarih={txTarih} onTarih={setTxTarih}
            pending={addMut.isPending}
            onSave={() => void saveTx()}
            amountRef={amountRef}
          >
            {selectedRow && (
              <>
                {/* Maliyet — talep olarak gider, onay bekler. */}
                <CollapsibleSection
                  key={`m-${selectedRow.siparisNo}`}
                  title={t('accountingFull.tabs.maliyet')}
                  summary={selectedRow.maliyet != null ? formatCurrency(selectedRow.maliyet, pt) : t('accounting.cost.none')}
                >
                  <div className="space-y-3 p-3">
                    <div className="grid grid-cols-2 gap-3">
                      <FormField label={`${t('accountingFull.maliyet.maliyet')} (${pt ?? ''})`}>
                        <DecimalInput value={maliyetForm.maliyet} onValueChange={(v) => setMaliyetForm((x) => ({ ...x, maliyet: v === '' ? 0 : v }))} />
                      </FormField>
                      <FormField label={t('accountingFull.maliyet.kar')}>
                        <Input
                          value={selectedRow.toplamFiyat != null ? formatCurrency((selectedRow.toplamFiyat ?? 0) - maliyetForm.maliyet, pt) : ''}
                          readOnly disabled
                        />
                      </FormField>
                    </div>
                    <FormField label={t('accountingFull.maliyet.notu')}>
                      <Textarea rows={3} value={maliyetForm.maliyetDetayi} onChange={(e) => setMaliyetForm((x) => ({ ...x, maliyetDetayi: e.target.value }))} />
                    </FormField>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      {selectedRow.muhasebeDurumu ? (
                        <p className="text-sm text-muted-foreground">
                          {t('accountingFull.maliyet.lastStatus')}: <StatusBadge value={selectedRow.muhasebeDurumu} context="purchase" />
                          {selectedRow.muhasebeRedNotu && <> — {selectedRow.muhasebeRedNotu}</>}
                        </p>
                      ) : <span />}
                      <Button variant="outline" loading={maliyetMut.isPending} disabled={maliyetForm.maliyet < 0} onClick={() => maliyetMut.mutate()}>
                        {t('accountingFull.actions.talepGonder')}
                      </Button>
                    </div>
                  </div>
                </CollapsibleSection>

                {/* Ek maliyet — proformaya ek satır olarak yansır, tutarı toplama eklenir. */}
                <CollapsibleSection
                  key={`e-${selectedRow.siparisNo}`}
                  title={t('accountingFull.tabs.ekstra')}
                  summary={extraCosts.length > 0
                    ? t('accounting.extra.summary', { count: extraCosts.length, total: formatCurrency(sumOf(extraCosts, (x) => x.tutar), pt) })
                    : t('accountingFull.ekstra.none')}
                >
                  <div className="space-y-3 p-3">
                    <p className="text-sm text-muted-foreground">{t('accountingFull.ekstra.hint')}</p>
                    {extraCosts.length > 0 && (
                      <ul className="divide-y rounded-md border text-sm">
                        {extraCosts.map((ex) => (
                          <li key={ex.ekMaliyetID} className="flex items-center gap-3 px-3 py-1">
                            <span className="min-w-0 flex-1 break-words">{ex.aciklama}</span>
                            <span className="shrink-0 font-medium tabular-nums">{formatCurrency(ex.tutar, pt)}</span>
                            {canEditExtras && (
                              <Button
                                size="xs" variant="ghost" className="shrink-0 text-danger"
                                loading={delExtraMut.isPendingFor((id) => id === ex.ekMaliyetID)}
                                onClick={async () => {
                                  if (await confirm({ title: t('orders.confirm.extraRemoveTitle'), description: `${ex.aciklama} · ${formatCurrency(ex.tutar, pt)}`, destructive: true, confirmLabel: t('common.delete') }))
                                    delExtraMut.mutate(ex.ekMaliyetID)
                                }}
                              ><Trash2 className="h-4 w-4" aria-hidden /> {t('common.delete')}</Button>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                    {canEditExtras ? (
                      <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); if (exAciklama.trim() && exTutar > 0) addExtraMut.mutate() }}>
                        <FormField label={t('accountingFull.ekstra.aciklama')}>
                          <Input value={exAciklama} onChange={(e) => setExAciklama(e.target.value)} placeholder={t('accountingFull.ekstra.aciklamaPlaceholder')} />
                        </FormField>
                        <div className="flex items-end gap-3">
                          <FormField className="flex-1" label={`${t('accountingFull.ekstra.tutar')} (${pt ?? ''})`}>
                            <DecimalInput value={exTutar} onValueChange={(v) => setExTutar(v === '' ? 0 : v)} />
                          </FormField>
                          <Button type="submit" variant="outline" loading={addExtraMut.isPending} disabled={!exAciklama.trim() || exTutar <= 0}>
                            <Plus className="h-4 w-4" aria-hidden /> {t('common.add')}
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <p className="text-sm text-muted-foreground">{t('accountingFull.ekstra.locked')}</p>
                    )}
                  </div>
                </CollapsibleSection>
              </>
            )}
          </TahsilatPanel>
        }
      />

      <AccountingFolderDialog siparisNo={folderNo} onClose={() => setFolderNo(null)} />
      <CancelTransactionDialog target={cancelTx} onClose={() => setCancelTx(null)} />
    </FillPage>
  )
}

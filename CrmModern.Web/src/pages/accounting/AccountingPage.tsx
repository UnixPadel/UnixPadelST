import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { Eye, Plus, Upload, Trash2, X, FileSpreadsheet, Wallet, FileSearch } from 'lucide-react'
import {
  getAccountingOrders, addTransaction, uploadMuhasebeEk, downloadAccountingExcel,
  getTransactionsForOrder,
  submitMaliyetTalep,
  getExtraCosts, addExtraCost, deleteExtraCost,
  type SubmitMaliyetRequest,
} from '@/api/accounting'
import { getOrderDetail } from '@/api/orders'
import { getUlkeler } from '@/api/customers'
import { PageHeader } from '@/components/PageHeader'
import { FillPage, FillRegion, ResizableTop } from '@/components/FillPage'
import { DataTable, type Column } from '@/components/DataTable'
import { StatusBadge } from '@/components/StatusBadge'
import { FilterBar, FilterField, ALL, useFilterState } from '@/components/FilterBar'
import { statusLabel } from '@/lib/status'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DecimalInput } from '@/components/DecimalInput'
import { Textarea } from '@/components/ui/textarea'
import { FormField } from '@/components/ui/form-field'
import { KeyValue } from '@/components/ui/key-value'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { MuhasebeRowDetailDialog } from '@/components/MuhasebeRowDetailDialog'
import { CancelTransactionDialog, CancelTxButton, type CancelTxTarget } from '@/components/CancelTransactionDialog'
import { useAuth } from '@/hooks/useAuth'
import { useAppMutation } from '@/hooks/useAppMutation'
import { isAccountingApprover } from '@/lib/permissions'
import { formatDate, formatDateShort, formatCurrency, formatPhone, cn } from '@/lib/utils'
import { sumOf } from '@/lib/export'
import { PARA_TIPLERI } from '@/lib/orderForm'
import { trLower } from '@/components/ui/combobox'
import { useToast } from '@/components/ToastProvider'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { useShortcutHints } from '@/components/StatusBar'
import { toastApiError } from '@/lib/apiError'
import type { AccountingOrderListDto, AccountingTransactionDto, OrderDetail } from '@/types'
import { localDateInput } from '@/lib/date'

/**
 * PROMPT.md ACCOUNTING #14: legacy Muhasebe.cs 1:1 (logical) port.
 *
 * Layout — split: üstte seçili satırın sekmeli formu (Detay / Müşteri / Teslimat /
 * Temsilci / Maliyet / Ekstra), altta tam genişlik grid.
 *
 * Bu turdaki iyileştirmeler:
 *  • SR-5 — etiketli, URL'de kalıcı filtre çubuğu (ham <select> kalktı).
 *  • E-7 — para kolonlarında döviz bazlı alt toplam, görünüm dışa aktarma,
 *    sağ tık menüsü (Detay / Tahsilat / Muhasebe Ek / Sipariş Geçmişi).
 *  • Tahsilat penceresi: Enter kaydeder, "Kaydet ve kapat", bakiye kutusu canlı.
 *  • QW-12 — sekmelerdeki sabit Türkçe etiketler ve "BLOB" teknik notu i18n'e alındı.
 */
type Row = AccountingOrderListDto & Record<string, unknown>
const FILTER_DEFAULTS = { q: '', odemeDurum: ALL, asama: ALL, from: '', to: '' }

export function AccountingPage() {
  const { toast } = useToast()
  const { confirm } = useConfirm()
  const { t } = useTranslation()
  const { getUser } = useAuth()
  const [params, setParams] = useSearchParams()

  // ── Selected row (drives top form) ────────────────────────────────────
  const [selectedNo, setSelectedNo] = useState<string | null>(() => params.get('sel'))
  const [doubleClickRow, setDoubleClickRow] = useState<AccountingOrderListDto | null>(null)

  const [txNo, setTxNo] = useState<string | null>(null)
  const [txTutar, setTxTutar] = useState<number>(0)
  const [txTarih, setTxTarih] = useState<string>(() => localDateInput())
  const [ekTarget, setEkTarget] = useState<string | null>(null)
  const [excelBusy, setExcelBusy] = useState(false)
  const amountRef = useRef<HTMLInputElement>(null)
  // Tahsilat iptali — yalnız Muhasebe Onay kullanıcıları (backend aynı kapı).
  const canCancelTx = isAccountingApprover(getUser())
  const [cancelTx, setCancelTx] = useState<CancelTxTarget | null>(null)

  const { values: f, set, setAll, reset } = useFilterState(FILTER_DEFAULTS)

  // ── Data queries ──────────────────────────────────────────────────────
  const { data: orders = [], isLoading, isError } = useQuery({
    queryKey: ['accounting-orders'],
    queryFn: getAccountingOrders,
  })
  // PROMPT-v6 §3 — telefon prefix'i için ülke lookup'ı (Ulkeler.NumaraBirimi).
  const { data: ulkeler = [] } = useQuery({ queryKey: ['ulkeler'], queryFn: getUlkeler })

  const { data: orderDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['order-detail', selectedNo],
    queryFn: () => getOrderDetail(selectedNo!),
    enabled: !!selectedNo,
  })
  const selectedRow = orders.find((o) => o.siparisNo === selectedNo) ?? null
  // Tahsilat penceresi her zaman güncel satırı okur (kayıttan sonra bakiye yenilenir).
  const txRow = orders.find((o) => o.siparisNo === txNo) ?? null

  const [maliyetForm, setMaliyetForm] = useState<{ maliyet: number; maliyetDetayi: string }>({ maliyet: 0, maliyetDetayi: '' })
  // Seçim değişince Maliyet girdileri satırdaki değerlerden yenilenir; arka plan
  // tazelemeleri yazılanı ezmesin diye yalnız selectedNo bağımlılığı var.
  useEffect(() => {
    setMaliyetForm({ maliyet: selectedRow?.maliyet ?? 0, maliyetDetayi: selectedRow?.maliyetDetayi ?? '' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNo])

  // ── Tahsilat ───────────────────────────────────────────────────────────
  const { data: txForOrder = [] } = useQuery({
    queryKey: ['order-tx', txNo],
    queryFn: () => getTransactionsForOrder(txNo!),
    enabled: !!txNo,
  })
  const closeAfterSave = useRef(false)
  const addMut = useAppMutation({
    mutationFn: (_: void) => addTransaction({ siparisNo: txNo!, odenenMiktar: txTutar, tarih: txTarih }),
    successTitle: () => t('accounting.tahsilat.saved', { amount: formatCurrency(txTutar, txRow?.paraTipi) }),
    successDescription: () => txNo ?? undefined,
    errorTitle: t('common.error'),
    onSuccess: () => {
      setTxTutar(0)
      if (closeAfterSave.current) setTxNo(null)
      else setTimeout(() => amountRef.current?.focus(), 0)
    },
  })

  const openTx = (r: AccountingOrderListDto) => {
    setTxNo(r.siparisNo)
    setTxTutar(Math.max(Number(r.kalanBakiye ?? 0), 0))
    setTxTarih(localDateInput())
  }

  // Kalan bakiyeyi aşan tahsilatta onay iste (Muhasebe Onay ile aynı kural).
  // QW-6 — native window.confirm yerine uygulama içi onay penceresi.
  const confirmOverpay = async (): Promise<boolean> => {
    if (!txRow) return true
    const kalan = Math.max(txRow.kalanBakiye ?? 0, 0)
    if (txTutar <= kalan) return true
    return confirm({
      title: t('accApproval.overpay.title'),
      description: t('accApproval.overpay.confirm', {
        fark: formatCurrency(txTutar - kalan, txRow.paraTipi),
        kalan: formatCurrency(kalan, txRow.paraTipi),
      }),
      confirmLabel: t('common.save'),
    })
  }
  const saveTx = async (close: boolean) => {
    if (txTutar <= 0 || addMut.isPending) return
    if (!(await confirmOverpay())) return
    closeAfterSave.current = close
    addMut.mutate()
  }

  const uploadMut = useAppMutation({
    mutationFn: ({ no, file }: { no: string; file: File }) => uploadMuhasebeEk(no, file),
    successTitle: t('accounting.tahsilat.ekUploaded'),
    successDescription: (_d, v) => v.no,
    errorTitle: t('common.failed'),
    invalidate: false,
    onSuccess: () => setEkTarget(null),
  })

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

  // ── Ekstra maliyet kalemleri (açıklama + tutar → proformaya yansır) ───
  // Düzenleme penceresi: cari/lojistik onay akışı (Siparis/Planlama/Hazir).
  const canEditExtras = !!selectedRow && ['Siparis', 'Planlama', 'Hazir'].includes(selectedRow.siparisMiTeklifMi ?? '')
  const { data: extraCosts = [] } = useQuery({
    queryKey: ['order-extra-costs', selectedNo],
    queryFn: () => getExtraCosts(selectedNo!),
    enabled: !!selectedNo,
  })
  const [exAciklama, setExAciklama] = useState('')
  const [exTutar, setExTutar] = useState<number>(0)
  const addExtraMut = useAppMutation({
    mutationFn: (_: void) => addExtraCost(selectedNo!, exAciklama.trim(), exTutar),
    successTitle: t('accountingFull.ekstra.added'),
    errorTitle: t('common.error'),
    onSuccess: () => { setExAciklama(''); setExTutar(0) },
  })
  const delExtraMut = useAppMutation({
    mutationFn: (id: number) => deleteExtraCost(id),
    successTitle: t('accountingFull.ekstra.deleted'),
    errorTitle: t('common.error'),
  })

  // PROMPT-v6 §1 — "Muhasebe Onayla" butonu kaldırıldı: Cari onay gate'i
  // Burcu ekranında (/accounting/approval) yaşıyor.

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

  // Alt toplam döviz başına ayrı satırda (footerGroups) → her hücre tek döviz, tek satır.
  const money = (key: keyof AccountingOrderListDto) => (rows: Row[]) =>
    formatCurrency(sumOf(rows, (r) => r[key] as number), rows[0]?.paraTipi)

  const cols: Column<Row>[] = [
    { key: 'siparisNo', pin: 'left', header: t('common.orderNo'),  sortable: true, hideable: false, render: (r) => <span className="font-mono">{r.siparisNo}</span> },
    { key: 'musteriAd', truncate: '16rem', header: t('common.customer'), sortable: true },
    { key: 'mUlke',         header: t('common.country'),  sortable: true },
    { key: 'sirket',        header: t('accountingFull.cols.sirket'), sortable: true, render: (r) => (r.sirket as string) ?? '—' },
    { key: 'paraTipi',      header: t('common.currency'), sortable: true },
    { key: 'toplamFiyat',   header: t('common.totalAmount'), sortable: true, type: 'money',
      render: (r) => formatCurrency(r.toplamFiyat ?? 0, r.paraTipi), footer: money('toplamFiyat') },
    { key: 'kaparoFiyat',   header: t('accountingFull.cols.kaparo'), sortable: true, type: 'money',
      render: (r) => formatCurrency(r.kaparoFiyat ?? 0, r.paraTipi), footer: money('kaparoFiyat') },
    { key: 'kalanBakiye',   header: t('common.balance'), sortable: true, type: 'money',
      render: (r) => <span className={cn((r.kalanBakiye ?? 0) < 0 && 'text-destructive')}>{formatCurrency(r.kalanBakiye ?? 0, r.paraTipi)}</span>,
      footer: money('kalanBakiye') },
    { key: 'pesinYuzde',    header: t('accountingFull.cols.pesinYuzde'), sortable: true, type: 'number', render: (r) => `%${r.pesinYuzde}` },
    { key: 'maliyet',       header: t('accountingFull.cols.maliyet'), sortable: true, type: 'money',
      render: (r) => r.maliyet != null ? formatCurrency(r.maliyet, r.paraTipi) : '—' },
    { key: 'kar',           header: t('accountingFull.cols.kar'), sortable: true, type: 'money',
      render: (r) => r.kar != null ? formatCurrency(r.kar, r.paraTipi) : '—' },
    { key: 'teslimatCesiti',header: t('accountingFull.cols.teslimatCesiti'), render: (r) => (r.teslimatCesiti as string) ?? '—' },
    { key: 'siparisMiTeklifMi', header: t('accountingFull.cols.asama'), sortable: true, render: (r) => <StatusBadge value={r.siparisMiTeklifMi} context="stage" /> },
    { key: 'odemeDurum',    header: t('common.status'), sortable: true, render: (r) => <StatusBadge value={r.odemeDurum} context="odeme" /> },
    { key: 'muhasebeDurumu',header: t('accountingFull.cols.muhasebeDurum'), sortable: true, render: (r) => r.muhasebeDurumu ? <StatusBadge value={r.muhasebeDurumu} context="purchase" /> : '—' },
    // §6 — yoğun grid: kısa tarih (dd.MM.yy)
    { key: 'tarih',         header: t('common.date'), sortable: true, type: 'date', render: (r) => formatDateShort(r.tarih ?? '-') },
    {
      key: 'actions', pin: 'right', header: t('common.actions'), hideable: false, exportValue: false,
      // Round-Next §12 — ikon butonlar (17 kolon ekrana sığsın); açıklayıcı başlıklar.
      render: (r) => (
        <div className="flex gap-1">
          <Button size="icon-sm" variant="outline" title={t('common.details')} aria-label={t('common.details')} onClick={() => openOrder(r.siparisNo)}><Eye className="h-3.5 w-3.5" /></Button>
          <Button size="icon-sm" title={t('accounting.tahsilat.add')} aria-label={t('accounting.tahsilat.add')} onClick={() => openTx(r)}><Plus className="h-3.5 w-3.5" /></Button>
          <Button size="icon-sm" variant="outline" title={t('accounting.tahsilat.ekUpload')} aria-label={t('accounting.tahsilat.ekUpload')} onClick={() => setEkTarget(r.siparisNo)}><Upload className="h-3.5 w-3.5" /></Button>
        </div>
      ),
    },
  ]

  const openOrder = (no: string) => setParams((p) => { const np = new URLSearchParams(p); np.set('order', no); return np })

  useShortcutHints([
    { keys: '↑↓', label: t('shortcuts.moveRow') },
    { keys: 'Enter', label: t('accounting.tahsilat.add') },
    { keys: 'Shift+F10', label: t('shortcuts.rowMenu') },
    ...(selectedNo ? [{ keys: 'F7', label: t('shortcuts.togglePanel') }] : []),
  ])

  return (
    // Scaling Faz 1 — FillPage: sayfa kaymaz, grid kalan yüksekliği alır. Seçili
    // satırın detay paneli sabit yükseklikli ResizableTop'ta (satır değişince grid
    // zıplamaz; sürüklenebilir/katlanabilir, konumu hatırlanır).
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

      {/* Round-11 §7 + Round-Next §12 — yoğun grid için dar sayfa dolgusu. */}
        {/* ── ÜST FORM (yalnız seçili satır varken) ─────────────────── */}
        {selectedNo && (
          <ResizableTop
            pageId="accounting"
            stable
            className="px-3 pt-2"
            collapsed={
              <div className="flex items-center gap-2 rounded-md border px-3 py-1 text-xs">
                <span className="text-muted-foreground">{t('common.orderNo')}:</span>
                <span className="font-mono font-semibold">{selectedNo}</span>
                {selectedRow && <span className="truncate text-muted-foreground">· {selectedRow.musteriAd}</span>}
                {selectedRow && (
                  <Button size="xs" className="ml-auto" onClick={() => openTx(selectedRow)}><Wallet className="h-3.5 w-3.5" /> {t('accounting.tahsilat.add')}</Button>
                )}
              </div>
            }
          >
          <div className="rounded-md border bg-card">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-card px-4 py-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">{t('common.orderNo')}:</span>
                <span className="font-mono font-semibold">{selectedNo}</span>
                {selectedRow && <StatusBadge value={selectedRow.siparisMiTeklifMi} context="stage" />}
                {detailLoading && <span className="text-xs text-muted-foreground">({t('common.loading')})</span>}
              </div>
              <div className="flex items-center gap-1">
                {selectedRow && (
                  <Button size="xs" onClick={() => openTx(selectedRow)}><Wallet className="h-3.5 w-3.5" /> {t('accounting.tahsilat.add')}</Button>
                )}
                <Button size="icon-sm" variant="ghost" aria-label={t('common.close')} title={t('common.close')} onClick={() => setSelectedNo(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Tabs defaultValue="detay" className="p-4">
              <TabsList>
                <TabsTrigger value="detay">{t('accountingFull.tabs.detay')}</TabsTrigger>
                <TabsTrigger value="musteri">{t('accountingFull.tabs.musteri')}</TabsTrigger>
                <TabsTrigger value="teslimat">{t('accountingFull.tabs.teslimat')}</TabsTrigger>
                <TabsTrigger value="temsilci">{t('accountingFull.tabs.temsilci')}</TabsTrigger>
                <TabsTrigger value="maliyet">{t('accountingFull.tabs.maliyet')}</TabsTrigger>
                <TabsTrigger value="ekstra">{t('accountingFull.tabs.ekstra')} {extraCosts.length > 0 && `(${extraCosts.length})`}</TabsTrigger>
              </TabsList>

              <TabsContent value="detay" className="mt-4">
                <DetailGrid order={orderDetail} row={selectedRow} t={t} />
              </TabsContent>
              <TabsContent value="musteri" className="mt-4">
                <KeyValueGrid pairs={[
                  [t('orderDetail.musteri'), orderDetail?.musteriAd],
                  // PROMPT-v6 §3 — ülke koduyla prefix'li gösterim
                  [t('orderDetail.telefon'), formatPhone(orderDetail?.mUlke, orderDetail?.mTelefon, ulkeler)],
                  [t('orderDetail.email'), orderDetail?.mMail],
                  [t('orderDetail.ulke'), orderDetail?.mUlke],
                  [t('orderDetail.vat'), orderDetail?.mVATNumarasi],
                  [t('common.zipCode'), orderDetail?.mZipKod],
                  [t('orderDetail.adres'), orderDetail?.mAdres],
                ]} />
              </TabsContent>
              <TabsContent value="teslimat" className="mt-4">
                <KeyValueGrid pairs={[
                  [t('orderDetail.teslimAlan'), orderDetail?.tTeslimAlanAdi],
                  [t('orderDetail.ilgiliKisi'), orderDetail?.tIlgiliKisi],
                  [t('orderDetail.telefon'), formatPhone(orderDetail?.tUlke, orderDetail?.tTelefon, ulkeler)],
                  [t('orders.form.altTelefon'), formatPhone(orderDetail?.tUlke, orderDetail?.tAltTelefon, ulkeler)],
                  [t('orderDetail.email'), orderDetail?.tE_Mail],
                  [t('orderDetail.vat'), orderDetail?.tVATNumarasi],
                  [t('common.zipCode'), orderDetail?.tZipKod],
                  [t('orderDetail.ulke'), orderDetail?.tUlke],
                  [t('orderDetail.adres'), orderDetail?.tAdres],
                  [t('accountingFull.cols.teslimatCesiti'), orderDetail?.teslimatCesiti],
                ]} />
              </TabsContent>
              <TabsContent value="temsilci" className="mt-4">
                <KeyValueGrid pairs={[
                  [t('orderDetail.temsilci'), orderDetail?.kullaniciAdi],
                  [t('orderDetail.telefon'), formatPhone(orderDetail?.sUlke, orderDetail?.sTelefon, ulkeler)],
                  [t('qc.fields.fax'), orderDetail?.sFax],
                  [t('qc.fields.web'), orderDetail?.sWeb],
                  [t('orderDetail.email'), orderDetail?.sE_Mail],
                  [t('orderDetail.vat'), orderDetail?.sVatNumarasi],
                  [t('orderDetail.ulke'), orderDetail?.sUlke],
                  [t('orderDetail.adres'), orderDetail?.sAdres],
                ]} />
              </TabsContent>

              <TabsContent value="maliyet" className="mt-4 max-w-2xl space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <FormField label={`${t('accountingFull.maliyet.maliyet')} (${selectedRow?.paraTipi ?? ''})`}>
                    <DecimalInput value={maliyetForm.maliyet} onValueChange={(v) => setMaliyetForm((x) => ({ ...x, maliyet: v === '' ? 0 : v }))} />
                  </FormField>
                  <FormField label={t('accountingFull.maliyet.kar')}>
                    <Input
                      value={selectedRow?.toplamFiyat != null ? formatCurrency((selectedRow.toplamFiyat ?? 0) - maliyetForm.maliyet, selectedRow.paraTipi) : ''}
                      readOnly disabled
                    />
                  </FormField>
                </div>
                <FormField label={t('accountingFull.maliyet.notu')}>
                  <Textarea rows={4} value={maliyetForm.maliyetDetayi} onChange={(e) => setMaliyetForm((x) => ({ ...x, maliyetDetayi: e.target.value }))} />
                </FormField>
                <div className="flex justify-end">
                  <Button loading={maliyetMut.isPending} disabled={maliyetForm.maliyet < 0} onClick={() => maliyetMut.mutate()}>
                    {t('accountingFull.actions.talepGonder')}
                  </Button>
                </div>
                {selectedRow?.muhasebeDurumu && (
                  <p className="text-xs text-muted-foreground">
                    {t('accountingFull.maliyet.lastStatus')}: <StatusBadge value={selectedRow.muhasebeDurumu} context="purchase" />
                    {selectedRow.muhasebeRedNotu && <> — {selectedRow.muhasebeRedNotu}</>}
                  </p>
                )}
              </TabsContent>

              {/* Ekstra Maliyet — proformaya ek satır olarak yansır, tutarı toplama eklenir. */}
              <TabsContent value="ekstra" className="mt-4 max-w-2xl space-y-3">
                <p className="text-xs text-muted-foreground">{t('accountingFull.ekstra.hint')}</p>
                <div className="rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-3 py-1.5 text-left text-xs font-medium text-muted-foreground">{t('accountingFull.ekstra.aciklama')}</th>
                        <th className="w-40 px-3 py-1.5 text-right text-xs font-medium text-muted-foreground">{t('accountingFull.ekstra.tutar')}</th>
                        <th className="w-12"><span className="sr-only">{t('common.actions')}</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {extraCosts.length === 0 ? (
                        <tr><td colSpan={3} className="px-3 py-3 text-center text-xs text-muted-foreground">{t('accountingFull.ekstra.none')}</td></tr>
                      ) : extraCosts.map((ex) => (
                        <tr key={ex.ekMaliyetID} className="border-t">
                          <td className="break-words px-3 py-1.5">{ex.aciklama}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{formatCurrency(ex.tutar, selectedRow?.paraTipi)}</td>
                          <td className="px-1 py-1.5 text-center">
                            {canEditExtras && (
                              <Button
                                size="icon-sm" variant="ghost" className="text-destructive"
                                aria-label={t('common.delete')} title={t('common.delete')}
                                loading={delExtraMut.isPendingFor((id) => id === ex.ekMaliyetID)}
                                onClick={async () => {
                                  if (await confirm({ title: t('orders.confirm.extraRemoveTitle'), description: `${ex.aciklama} · ${formatCurrency(ex.tutar, selectedRow?.paraTipi)}`, destructive: true, confirmLabel: t('common.delete') }))
                                    delExtraMut.mutate(ex.ekMaliyetID)
                                }}
                              >{!delExtraMut.isPendingFor((id) => id === ex.ekMaliyetID) && <Trash2 className="h-3.5 w-3.5" />}</Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {canEditExtras ? (
                  <form className="grid grid-cols-[1fr_160px_auto] items-end gap-2" onSubmit={(e) => { e.preventDefault(); if (exAciklama.trim() && exTutar > 0) addExtraMut.mutate() }}>
                    <FormField label={t('accountingFull.ekstra.aciklama')}>
                      <Input value={exAciklama} onChange={(e) => setExAciklama(e.target.value)} placeholder={t('accountingFull.ekstra.aciklamaPlaceholder')} />
                    </FormField>
                    <FormField label={`${t('accountingFull.ekstra.tutar')} (${selectedRow?.paraTipi ?? ''})`}>
                      <DecimalInput value={exTutar} onValueChange={(v) => setExTutar(v === '' ? 0 : v)} />
                    </FormField>
                    <Button type="submit" loading={addExtraMut.isPending} disabled={!exAciklama.trim() || exTutar <= 0}>
                      <Plus className="h-4 w-4" />{t('common.add')}
                    </Button>
                  </form>
                ) : (
                  <p className="text-xs text-muted-foreground">{t('accountingFull.ekstra.locked')}</p>
                )}
              </TabsContent>
            </Tabs>
          </div>
          </ResizableTop>
        )}

        <div className="px-3 pt-2">
        <FilterBar onReset={reset} tableId="accounting" values={f} onApplyView={(v) => setAll(v as typeof FILTER_DEFAULTS)}>
          <FilterField label={t('accounting.filter.search')}>
            <Input inputSize="sm" placeholder={t('common.quickFilter')} value={f.q} onChange={(e) => set('q', e.target.value)} />
          </FilterField>
          <FilterField label={t('common.status')}>
            <Select value={f.odemeDurum} onValueChange={(v) => set('odemeDurum', v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('common.all')}</SelectItem>
                <SelectItem value="Beklemede">{statusLabel(t, 'Beklemede')}</SelectItem>
                <SelectItem value="Ödendi">{statusLabel(t, 'Ödendi')}</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label={t('common.stage')}>
            <Select value={f.asama} onValueChange={(v) => set('asama', v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
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
        </div>

        <FillRegion className="px-3 pt-2">
        <DataTable
          fill
          tableId="accounting"
          exportFileName="muhasebe-tahsilat"
          columns={cols}
          data={filtered as Row[]}
          keyField="siparisNo"
          loading={isLoading}
          error={isError}
          density="compact"
          // Sidebar açıkken yatay alan daralınca bir sipariş tek satırda kalsın.
          singleLineRows
          showFooter
          footerGroups={{ by: (r) => r.paraTipi, order: PARA_TIPLERI }}
          activeRowKey={selectedNo}
          onActiveRowChange={(r) => setSelectedNo(r.siparisNo)}
          onRowActivate={(r) => openTx(r)}
          onRowDoubleClick={(r) => setDoubleClickRow(r)}
          rowActions={[
            { key: 'tx', label: t('accounting.tahsilat.add'), shortcut: 'Enter', icon: <Wallet className="h-3.5 w-3.5" />, onSelect: (r) => openTx(r) },
            { key: 'detail', label: t('common.details'), icon: <Eye className="h-3.5 w-3.5" />, onSelect: (r) => openOrder(r.siparisNo) },
            { key: 'summary', label: t('accounting.rowSummary'), icon: <FileSearch className="h-3.5 w-3.5" />, onSelect: (r) => setDoubleClickRow(r) },
            { key: 'ek', label: t('accounting.tahsilat.ekUpload'), icon: <Upload className="h-3.5 w-3.5" />, separatorBefore: true, onSelect: (r) => setEkTarget(r.siparisNo) },
          ]}
        />
        </FillRegion>

      {/* Tahsilat Ekle — form: Enter kaydeder (açık kalır, bir sonraki tutar için),
          "Kaydet ve kapat" ayrı; bakiye kutusu güncel satırdan okunur. */}
      <Dialog open={!!txNo} onOpenChange={(o) => { if (!o) setTxNo(null) }}>
        <DialogContent size="md">
          <form className="space-y-3 text-sm" onSubmit={(e) => { e.preventDefault(); void saveTx(false) }}>
            <DialogHeader>
              <DialogTitle>{t('accounting.tahsilat.title', { no: txNo })}</DialogTitle>
              {txRow && <DialogDescription>{txRow.musteriAd}</DialogDescription>}
            </DialogHeader>
            <div className="space-y-1 rounded-md border bg-muted/30 p-3">
              <KeyValue label={t('accounting.tahsilat.toplam')} value={<span className="tabular-nums">{formatCurrency(txRow?.toplamFiyat ?? 0, txRow?.paraTipi)}</span>} />
              <KeyValue label={t('accounting.tahsilat.odenen')} value={<span className="tabular-nums">{formatCurrency(txRow?.odenenMiktar ?? 0, txRow?.paraTipi)}</span>} />
              <KeyValue emphasis label={t('accounting.tahsilat.kalan')} value={<span className="tabular-nums">{formatCurrency(txRow?.kalanBakiye ?? 0, txRow?.paraTipi)}</span>} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <FormField label={`${t('accounting.tahsilat.tutar')} (${txRow?.paraTipi ?? ''})`}>
                <DecimalInput ref={amountRef} autoFocus value={txTutar} onValueChange={(v) => setTxTutar(v === '' ? 0 : v)} />
              </FormField>
              <FormField label={t('common.date')}>
                <Input type="date" value={txTarih} onChange={(e) => setTxTarih(e.target.value)} />
              </FormField>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">{t('accounting.tahsilat.previous')}</p>
              <div className="mt-1 max-h-40 overflow-y-auto rounded border">
                {txForOrder.length === 0
                  ? <p className="p-2 text-xs text-muted-foreground">{t('accounting.tahsilat.none')}</p>
                  : <table className="w-full text-xs">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-2 py-1 text-left font-medium">{t('common.date')}</th>
                          <th className="px-2 py-1 text-right font-medium">{t('accounting.tahsilat.tutar')}</th>
                          {canCancelTx && <th className="w-8 px-1 py-1"><span className="sr-only">{t('common.actions')}</span></th>}
                        </tr>
                      </thead>
                      <tbody>
                        {txForOrder.map((tx: AccountingTransactionDto) => (
                          <tr key={tx.id} className="border-t">
                            <td className="px-2 py-1">{formatDate(tx.tarih)}</td>
                            <td className="px-2 py-1 text-right tabular-nums">{formatCurrency(tx.odenenMiktar ?? 0, txRow?.paraTipi)}</td>
                            {canCancelTx && txRow && (
                              <td className="px-1 py-0.5 text-center">
                                <CancelTxButton onClick={() => setCancelTx({ ...tx, paraTipi: txRow.paraTipi, kalanBakiye: txRow.kalanBakiye ?? 0 })} />
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>}
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setTxNo(null)}>{t('common.close')}</Button>
              <Button type="button" variant="secondary" disabled={txTutar <= 0} loading={addMut.isPending && closeAfterSave.current} onClick={() => saveTx(true)}>
                {t('accounting.tahsilat.saveClose')}
              </Button>
              <Button type="submit" disabled={txTutar <= 0} loading={addMut.isPending && !closeAfterSave.current} title="Enter">{t('common.save')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MuhasebeEk uploader */}
      <Dialog open={!!ekTarget} onOpenChange={(o) => { if (!o) setEkTarget(null) }}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{t('accounting.tahsilat.ekTitle', { no: ekTarget })}</DialogTitle>
            <DialogDescription>{t('accounting.tahsilat.ekHint')}</DialogDescription>
          </DialogHeader>
          <FormField label={t('accounting.tahsilat.dosya')}>
            <Input type="file" disabled={uploadMut.isPending} onChange={(e) => {
              const file = e.target.files?.[0]
              if (file && ekTarget) uploadMut.mutate({ no: ekTarget, file })
            }} />
          </FormField>
          {uploadMut.isPending && <p className="text-xs text-muted-foreground">{t('common.loading')}</p>}
        </DialogContent>
      </Dialog>

      <MuhasebeRowDetailDialog row={doubleClickRow} onClose={() => setDoubleClickRow(null)} />
      <CancelTransactionDialog target={cancelTx} onClose={() => setCancelTx(null)} />
    </FillPage>
  )
}

// ── Sekme yardımcıları ─────────────────────────────────────────────────────

function KeyValueGrid({ pairs }: { pairs: Array<[string, React.ReactNode]> }) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-1.5 md:grid-cols-2">
      {pairs.map(([k, v]) => <KeyValue key={k} label={k} value={v} className="justify-start [&>span:first-child]:w-36 [&>span:first-child]:shrink-0 [&>span:last-child]:text-left [&>span:last-child]:font-medium" />)}
    </div>
  )
}

function DetailGrid({ order, row, t }: { order?: OrderDetail; row: AccountingOrderListDto | null; t: TFunction }) {
  if (!order && !row) return <p className="text-sm text-muted-foreground">—</p>
  const pt = row?.paraTipi ?? order?.paraTipi ?? ''
  const yesNo = (b?: boolean) => (b ? t('common.yes') : t('common.no'))
  return (
    <KeyValueGrid pairs={[
      [t('common.orderNo'),                    order?.siparisNo],
      [t('orders.form.siparisNotu'),           order?.siparisNotu],
      [t('orders.form.paraTipi'),              order?.paraTipi],
      [t('orders.form.toplamFiyatLabel'),      order?.toplamFiyat != null ? formatCurrency(order.toplamFiyat ?? 0, pt) : null],
      [t('orders.form.previewBrut'),           order?.brutToplamFiyat != null ? formatCurrency(order.brutToplamFiyat ?? 0, pt) : null],
      [t('orders.form.indirim'),               order?.indirim != null ? `%${order.indirim}` : null],
      [t('orders.form.kdv'),                   order?.kdv != null ? `%${order.kdv}` : null],
      [t('orders.form.pesin'),                 order?.pesinYuzde != null ? `%${order.pesinYuzde}` : null],
      [t('accountingFull.cols.teslimatCesiti'), order?.teslimatCesiti],
      [t('orders.form.montaj'),                yesNo(order?.montajVar)],
      [t('orders.form.montajFiyat'),           order?.montajFiyat != null ? formatCurrency(order.montajFiyat ?? 0, pt) : null],
      [t('orders.form.teslimat'),              yesNo(order?.teslimatVar)],
      [t('orders.form.teslimatFiyat'),         order?.teslimatFiyat != null ? formatCurrency(order.teslimatFiyat ?? 0, pt) : null],
      [t('orders.form.sirket'),                order?.sirket],
      [t('accountingFull.cols.kaparo'),        row?.kaparoFiyat != null ? formatCurrency(row.kaparoFiyat ?? 0, pt) : null],
      [t('common.balance'),                    row?.kalanBakiye != null ? formatCurrency(row.kalanBakiye ?? 0, pt) : null],
    ]} />
  )
}

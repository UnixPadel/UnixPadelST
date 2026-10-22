import { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  getAccountingOrders, getTransactionsForOrder,
  approveMuhasebeAndMoveToPlanning, approveLogistics,
  uploadMuhasebeEk, finalizeCompletion, addTransaction,
} from '@/api/accounting'
import { CancelTransactionDialog, CancelTxButton, type CancelTxTarget } from '@/components/CancelTransactionDialog'
import { getOrderDetail, downloadAttachment, downloadExcel, downloadPdf } from '@/api/orders'
import { DataTable, type Column } from '@/components/DataTable'
import { DecimalInput } from '@/components/DecimalInput'
import { OrderDetailModal } from '@/components/OrderDetailModal'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ToastProvider'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ReadOnlyField } from '@/components/ui/key-value'
import { useShortcutHints } from '@/components/StatusBar'
import { WaitingUpstreamPanel } from '@/components/WaitingUpstreamPanel'
import { useNotHereHint } from '@/hooks/useNotHereHint'
import { ACCOUNTING_VIEW_SCREEN } from '@/lib/workflow'
import { invalidateOrderGraph } from '@/lib/queryKeys'
import { toastApiError } from '@/lib/apiError'
import { sumByCurrency } from '@/lib/export'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { formatDate, formatDateShort, formatCurrency, cn } from '@/lib/utils'
import { resolveClause } from '@/lib/clauses'
import type { AccountingOrderListDto } from '@/types'
import { localDateInput } from '@/lib/date'

/**
 * PROMPT-v6 §1.2 — burcu.karaman Muhasebe onay ekranı (legacy Muhasebe.cs
 * yerleşiminin portu; Kontrol ekranındaki v5 düzeniyle aynı ruh):
 * üstte detay sekmeleri + Özet + Cari aksiyon kartları, altta tam genişlik
 * master grid.
 *
 * Erişim: yalnız burcu.karaman (route RoleGuard + backend username gate'leri).
 *
 * Üç-aşamalı onay zinciri içindeki rolü:
 *   elshan Onayla → Kontrol='Onay' (aşama Siparis kalır) → Cari Onay kuyruğu
 *   Burcu Cari Onayla → Siparis → Planlama → Fabrika kuyruğu (simge.cakir)
 *   simge Hazır → LojistikOnay='Bekliyor' → Lojistik Onay kuyruğu
 *   Burcu Lojistik Onayla → LojistikOnay='Onay' → /logistics/ready listesi
 */

// Master grid görünümleri: 2 kuyruk + legacy hızlı filtre üçlüsü
// (siparisAlDataGridHepsi/Beklenen/Onaylanan_Click, Muhasebe.cs 1206/1267/1328).
type ViewId = 'cariQueue' | 'lojistikQueue' | 'tamamlanmaQueue' | 'hepsi' | 'beklenen' | 'onaylanan'

const VIEWS: ViewId[] = ['cariQueue', 'lojistikQueue', 'tamamlanmaQueue', 'hepsi', 'beklenen', 'onaylanan']

function matchesView(o: AccountingOrderListDto, view: ViewId): boolean {
  switch (view) {
    // Kontrol='Onay' listede zaten garanti (GetAccountingOrdersAsync filtresi).
    case 'cariQueue':     return o.siparisMiTeklifMi === 'Siparis'
    case 'lojistikQueue': return o.siparisMiTeklifMi === 'Hazir' && o.lojistikOnay === 'Bekliyor'
    // Round-9 §19 — sevkiyat tamamlandı, muhasebe finalize bekliyor.
    case 'tamamlanmaQueue': return o.siparisMiTeklifMi === 'TamamlanmaBekliyor'
    case 'hepsi':         return o.siparisMiTeklifMi !== 'Teklif'
    case 'beklenen':      return o.odemeDurum === 'Beklemede' && o.siparisMiTeklifMi === 'Siparis'
    case 'onaylanan':     return o.odemeDurum === 'Ödendi' && o.siparisMiTeklifMi === 'Siparis'
  }
}

// ── Kompakt read-only alanlar (v5 Kontrol kalıbı) ────────────────────────────

// SR-6 — ortak salt-okunur alan.
const ROField = ReadOnlyField

function CariRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_1fr] items-center gap-2">
      <span className="text-xs text-muted-foreground text-right truncate">{label}</span>
      {children}
    </div>
  )
}

function CariValue({ value }: { value?: string | null }) {
  return (
    <div className="rounded border bg-muted/40 px-1.5 py-1 text-xs min-h-[1.6rem] truncate" title={value ?? undefined}>
      {value || '—'}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function AccountingApprovalPage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const { confirm } = useConfirm()
  const { t } = useTranslation()

  // E-10 — Bekleyen İşler "İşle": ?view=…&sel=NO ile ilgili kuyruk ve satır seçili açılır.
  const [params] = useSearchParams()
  const [view, setView] = useState<ViewId>(() => (VIEWS as string[]).includes(params.get('view') ?? '') ? params.get('view') as ViewId : 'cariQueue')
  const [selected, setSelected] = useState<string | null>(() => params.get('sel'))
  const [formNo, setFormNo] = useState<string | null>(null)
  const [ekTarget, setEkTarget] = useState<string | null>(null)

  // araButtonInTab çoklu filtre alanları (Muhasebe.cs :567)
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  // Round-11 §8 — Cari/Lojistik kuyruğundaki bağımsız "Talep Gönder" maliyet
  // alanı kaldırıldı (maliyet yalnız "Tamamlanmayı Bekleyen" finalize'da girilir).
  // Standalone maliyet talebi iş akışı ana Muhasebe ekranında yaşamaya devam eder.

  // Round-9 §19 — "Tamamlanmayı Bekleyen" finalize formu (3. Peşinat + Final Maliyet)
  const [finalizeForm, setFinalizeForm] = useState<{
    pesinat: number | null; pesinatTarihi: string; finalMaliyet: number | null; maliyetDetayi: string
  }>({ pesinat: null, pesinatTarihi: localDateInput(), finalMaliyet: null, maliyetDetayi: '' })

  // Round-10 — Cari/Lojistik kuyruğunda peşinat girişi (tahsilat). Maliyet
  // talep alanından TAMAMEN bağımsız; onay butonuyla birlikte kaydedilir.
  const [pesinatForm, setPesinatForm] = useState<{ pesinat: number | null; pesinatTarihi: string }>({
    pesinat: null, pesinatTarihi: localDateInput(),
  })

  // Yanlış girilen tahsilat/peşinat iptali (satır silinmez, iptal işaretlenir).
  const [cancelTarget, setCancelTarget] = useState<CancelTxTarget | null>(null)

  // ── Veri ────────────────────────────────────────────────────────────────
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['accounting-orders'],
    queryFn: getAccountingOrders,
    // v5 §3 kalıbı — elshan onayı / simge Hazır geçişi Burcu kuyruğuna
    // ≤30 sn'de veya sekme odağında anında düşsün.
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: 'always',
    staleTime: 0,
  })

  const selectedRow = orders.find((o) => o.siparisNo === selected) ?? null

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

  // Seçim değişince Maliyet inputları satırdaki değerlerden yenilenir;
  // arka plan invalidation'ları kullanıcının yazdığını ezmesin diye yalnız
  // `selected` dep'i var (AccountingPage kalıbı).
  useEffect(() => {
    setFinalizeForm({
      pesinat:       null,
      pesinatTarihi: localDateInput(),
      finalMaliyet:  selectedRow?.maliyet ?? null,
      maliyetDetayi: selectedRow?.maliyetDetayi ?? '',
    })
    setPesinatForm({ pesinat: null, pesinatTarihi: localDateInput() })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected])

  const rows = useMemo(() => orders.filter((o) => {
    if (!matchesView(o, view)) return false
    if (search) {
      const s = search.toLowerCase()
      if (!o.siparisNo.toLowerCase().includes(s) && !o.musteriAd.toLowerCase().includes(s)) return false
    }
    if (from && new Date(o.tarih) < new Date(from)) return false
    if (to && new Date(o.tarih) > new Date(to)) return false
    return true
  }), [orders, view, search, from, to])
  const notHere = useNotHereHint(search, !isLoading && rows.length === 0)

  // Kuyruk sayaçları (sekme başlıklarında gösterilir)
  const cariCount = useMemo(() => orders.filter((o) => matchesView(o, 'cariQueue')).length, [orders])
  const lojCount  = useMemo(() => orders.filter((o) => matchesView(o, 'lojistikQueue')).length, [orders])
  const tamCount  = useMemo(() => orders.filter((o) => matchesView(o, 'tamamlanmaQueue')).length, [orders])

  // SR-7 — tüm sipariş grafiği (Fabrika/Lojistik/Siparişlerim dahil) tazelenir.
  // SR-8 — onay sonrası seçim bir sonraki kuyruk satırına geçer (sırayla işleme).
  const refreshAll = (doneNo?: string) => {
    void invalidateOrderGraph(qc)
    if (!doneNo) return
    const i = rows.findIndex((r) => r.siparisNo === doneNo)
    const next = rows.slice(i + 1).find((r) => r.siparisNo !== doneNo) ?? rows.slice(0, Math.max(i, 0)).find((r) => r.siparisNo !== doneNo)
    setSelected(next?.siparisNo ?? null)
  }

  const requireSelection = (): string | null => {
    if (!selected) {
      toast({ title: t('accApproval.selectFirst'), variant: 'warning' })
      return null
    }
    return selected
  }

  // ── Mutations ───────────────────────────────────────────────────────────
  const cariMut = useMutation({
    mutationFn: (no: string) => approveMuhasebeAndMoveToPlanning(no, {
      pesinat:       pesinatForm.pesinat ?? undefined,
      pesinatTarihi: pesinatForm.pesinat && pesinatForm.pesinatTarihi ? pesinatForm.pesinatTarihi : undefined,
    }),
    onSuccess: (_d, no) => {
      refreshAll(no)
      toast({ title: t('accApproval.toast.cariApproved'), description: no, variant: 'success' })
    },
    onError: (e) => toastApiError(toast, t('common.error'), e),
  })

  const lojMut = useMutation({
    mutationFn: (no: string) => approveLogistics(no, {
      pesinat:       pesinatForm.pesinat ?? undefined,
      pesinatTarihi: pesinatForm.pesinat && pesinatForm.pesinatTarihi ? pesinatForm.pesinatTarihi : undefined,
    }),
    onSuccess: (_d, no) => {
      refreshAll(no)
      toast({ title: t('accApproval.toast.logisticsApproved'), description: no, variant: 'success' })
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
      toast({ title: t('accApproval.finalize.done'), description: no, variant: 'success' })
    },
    onError: (e) => toastApiError(toast, t('common.error'), e),
  })

  // Kuyruk dışı (Tamamlandı vb.) siparişe sonradan peşinat: düz tahsilat,
  // aşama değişmez. Seçim korunur → Muhasebe Geçmişi'nde yeni satır görünür.
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

  // Kalan bakiyeyi aşan peşinat girilirken onay iste (engellemez: gerçek fazla
  // ödeme yine girilebilir). Eksi bakiyenin en sık nedeni hatalı/çift giriş.
  // QW-6 — native window.confirm yerine uygulama içi onay penceresi.
  const confirmOverpay = async (amount: number | null): Promise<boolean> => {
    if (!amount || !selectedRow) return true
    const kalan = Math.max(selectedRow.kalanBakiye ?? 0, 0)
    if (amount <= kalan) return true
    return confirm({
      title: t('accApproval.overpay.title'),
      description: t('accApproval.overpay.confirm', {
        fark: formatCurrency(amount - kalan, selectedRow.paraTipi),
        kalan: formatCurrency(kalan, selectedRow.paraTipi),
      }),
      confirmLabel: t('common.save'),
    })
  }

  // Peşinat bir kapı değildir (OrderWorkflow) — ama peşinli siparişin hiç
  // tahsilatı yokken Cari Onay verilirse sipariş ödemesiz üretime gidebilir; uyar.
  const confirmNoPesinat = async (): Promise<boolean> => {
    if (pesinatForm.pesinat || !selectedRow || !(selectedRow.pesinYuzde > 0)) return true
    if (transactions.some((tx) => !tx.iptal)) return true
    return confirm({
      title: t('accApproval.noPesinat.title'),
      description: t('accApproval.noPesinat.confirm', {
        kapora: formatCurrency(((selectedRow.toplamFiyat ?? 0) * selectedRow.pesinYuzde) / 100, selectedRow.paraTipi),
        yuzde: selectedRow.pesinYuzde,
      }),
      confirmLabel: t('accApproval.actions.cariOnayla'),
    })
  }

  const uploadMut = useMutation({
    mutationFn: ({ no, file }: { no: string; file: File }) => uploadMuhasebeEk(no, file),
    onSuccess: (_d, v) => { toast({ title: t('accounting.tahsilat.ekUploaded'), description: v.no, variant: 'success' }); setEkTarget(null) },
    onError: (e) => toastApiError(toast, t('common.failed'), e),
  })

  // ── Aksiyon handler'ları ────────────────────────────────────────────────
  const handleAttachment = async (type: 'ek' | 'muhasebeek') => {
    const no = requireSelection()
    if (!no) return
    try {
      await downloadAttachment(no, type)
    } catch (e) {
      toastApiError(toast, t('qc.attachmentNotFound'), e)
    }
  }

  const handleExcel = async () => {
    const no = requireSelection()
    if (!no) return
    try {
      await downloadExcel(no)
    } catch (e) {
      toastApiError(toast, t('common.error'), e)
    }
  }

  const handlePdf = async () => {
    const no = requireSelection()
    if (!no) return
    try {
      await downloadPdf(no)
    } catch (e) {
      toastApiError(toast, t('common.error'), e)
    }
  }

  // Seçili satırın kuyruğuna göre tek bağlamsal onay aksiyonu.
  const canCari = !!selectedRow && matchesView(selectedRow, 'cariQueue')
  const canLoj  = !!selectedRow && matchesView(selectedRow, 'lojistikQueue')
  const canFinalize = !!selectedRow && matchesView(selectedRow, 'tamamlanmaQueue')
  // Hiçbir kuyrukta olmayan sipariş (Tamamlandı, Planlama, Üretim, Lojistik…):
  // onay aksiyonu yok, yalnız sonradan peşinat girilebilir.
  const canEkPesinat = !!selectedRow && !canCari && !canLoj && !canFinalize
    && !['Teklif', 'Iptal'].includes(selectedRow.siparisMiTeklifMi ?? '')
  // Etiket için sıradaki peşinat no (tarih sırası backend'de; geçmiş tarih öne kayar).
  const nextPesinatNo = transactions.filter((tx) => !tx.iptal).length + 1

  // ── Master grid kolonları ───────────────────────────────────────────────
  const moneyFooter = (key: keyof AccountingOrderListDto) => (rs: (AccountingOrderListDto & Record<string, unknown>)[]) =>
    sumByCurrency(rs, (r) => r[key] as number, (r) => r.paraTipi).map(([c, v]) => formatCurrency(v, c)).join(' · ')
  const queueLabel = (o: AccountingOrderListDto) =>
    matchesView(o, 'cariQueue') ? t('accApproval.queueBadge.cari')
      : matchesView(o, 'lojistikQueue') ? t('accApproval.queueBadge.lojistik')
        : matchesView(o, 'tamamlanmaQueue') ? t('accApproval.queueBadge.tamamlanma') : ''
  useShortcutHints([
    { keys: '↑↓', label: t('shortcuts.moveRow') },
    { keys: 'Enter', label: t('accApproval.shortcut.form') },
  ])
  const columns: Column<AccountingOrderListDto & Record<string, unknown>>[] = [
    { key: 'siparisNo', header: t('qc.grid.siparisNo'), sortable: true,
      render: (r) => <span className="font-mono text-xs">{r.siparisNo as string}</span> },
    { key: 'musteriAd', header: t('qc.grid.musteriAd'), sortable: true },
    { key: 'mUlke', header: t('qc.grid.ulke'), sortable: true },
    { key: 'toplamFiyat', header: t('qc.grid.toplamSiparis'), sortable: true, type: 'money',
      render: (r) => formatCurrency((r.toplamFiyat as number) ?? 0, r.paraTipi as string), footer: moneyFooter('toplamFiyat') },
    { key: 'kaparoFiyat', header: t('qc.grid.kaparoBakiyesi'), sortable: true, type: 'money',
      render: (r) => formatCurrency((r.kaparoFiyat as number) ?? 0, r.paraTipi as string), footer: moneyFooter('kaparoFiyat') },
    { key: 'kalanBakiye', header: t('qc.grid.kalanBakiye'), sortable: true, type: 'money',
      render: (r) => formatCurrency((r.kalanBakiye as number) ?? 0, r.paraTipi as string), footer: moneyFooter('kalanBakiye') },
    { key: 'pesinYuzde', header: t('qc.grid.pesinYuzde'), sortable: true, type: 'number',
      render: (r) => `%${r.pesinYuzde}` },
    { key: 'paraTipi', header: t('qc.grid.paraTipi'), sortable: true },
    { key: 'odemeDurum', header: t('qc.grid.odemeDurumu'), sortable: true,
      render: (r) => <StatusBadge value={r.odemeDurum as string} context="odeme" /> },
    { key: 'siparisMiTeklifMi', header: t('qc.grid.asama'), sortable: true,
      render: (r) => <StatusBadge value={r.siparisMiTeklifMi as string} context="stage" /> },
    { key: 'kuyruk', header: t('accApproval.grid.kuyruk'), exportValue: (r) => queueLabel(r as AccountingOrderListDto),
      sortValue: (r) => queueLabel(r as AccountingOrderListDto),
      render: (r) => {
        const o = r as AccountingOrderListDto
        if (matchesView(o, 'cariQueue')) return <Badge variant="warning">{t('accApproval.queueBadge.cari')}</Badge>
        if (matchesView(o, 'lojistikQueue')) return <Badge variant="info">{t('accApproval.queueBadge.lojistik')}</Badge>
        if (matchesView(o, 'tamamlanmaQueue')) return <Badge variant="success">{t('accApproval.queueBadge.tamamlanma')}</Badge>
        return <span className="text-xs text-muted-foreground">—</span>
      } },
    // §6 — yoğun grid: kısa tarih (dd.MM.yy)
    { key: 'tarih', header: t('qc.grid.tarih'), sortable: true, type: 'date',
      render: (r) => formatDateShort(r.tarih as string) },
  ]

  const d = detail
  const toplam = selectedRow?.toplamFiyat ?? d?.toplamFiyat ?? 0
  const pt = selectedRow?.paraTipi ?? d?.paraTipi ?? ''
  const pesinYuzde = selectedRow?.pesinYuzde ?? d?.pesinYuzde ?? 0
  const brutKapora = (toplam * pesinYuzde) / 100

  const sortedTx = useMemo(
    () => [...transactions].sort((a, b) => (b.tarih ?? '').localeCompare(a.tarih ?? '')),
    [transactions],
  )

  return (
    <div className="flex h-full flex-col">
      {/* ── Kompakt başlık ─────────────────────────────────────────────── */}
      <div className="shrink-0">
        <PageHeader
          density="compact"
          title={t('accApproval.title')}
          meta={
            <span className="flex flex-wrap gap-1">
              <Badge variant={cariCount ? 'warning' : 'neutral'}>{t('accApproval.queueBadge.cari')}: {cariCount}</Badge>
              <Badge variant={lojCount ? 'info' : 'neutral'}>{t('accApproval.queueBadge.lojistik')}: {lojCount}</Badge>
              <Badge variant={tamCount ? 'success' : 'neutral'}>{t('accApproval.queueBadge.tamamlanma')}: {tamCount}</Badge>
            </span>
          }
        />
      </div>

      {/* ── Üst bölge: detay sekmeleri + Özet + Cari (scroll'suz, doğal yükseklik) ── */}
      <div className="flex shrink-0 flex-wrap gap-2 px-4 py-2 xl:flex-nowrap">

        {/* 1 — Detay sekmeleri (legacy tabControl2 sırası) */}
        <div className="flex min-w-0 flex-1 basis-full flex-col rounded-md border p-2 xl:basis-auto">
          <Tabs defaultValue="muhasebe" className="flex flex-1 flex-col">
            <TabsList className="h-8 w-full shrink-0 justify-start overflow-x-auto">
              <TabsTrigger className="px-2 py-1 text-xs" value="muhasebe">{t('qc.tabs.muhasebeGecmisi')}</TabsTrigger>
              <TabsTrigger className="px-2 py-1 text-xs" value="detay">{t('qc.tabs.detay')}</TabsTrigger>
              <TabsTrigger className="px-2 py-1 text-xs" value="musteri">{t('qc.tabs.musteri')}</TabsTrigger>
              <TabsTrigger className="px-2 py-1 text-xs" value="teslimat">{t('qc.tabs.teslimat')}</TabsTrigger>
              <TabsTrigger className="px-2 py-1 text-xs" value="temsilci">{t('qc.tabs.satisTemsilcisi')}</TabsTrigger>
            </TabsList>

            {/* Muhasebe Geçmişi — siparişin tahsilat satırları */}
            <TabsContent value="muhasebe">
              <div className="max-h-56 overflow-y-auto rounded border">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted/80">
                    <tr>
                      <th className="px-2 py-1 text-left font-medium">{t('qc.tx.musteriAdi')}</th>
                      <th className="px-2 py-1 text-left font-medium">{t('qc.tx.ulke')}</th>
                      <th className="px-2 py-1 text-left font-medium">{t('qc.tx.paraTuru')}</th>
                      <th className="px-2 py-1 text-right font-medium">{t('qc.tx.odenenBakiye')}</th>
                      <th className="px-2 py-1 text-left font-medium">{t('qc.tx.tarih')}</th>
                      <th className="w-8 px-1 py-1" />
                    </tr>
                  </thead>
                  <tbody>
                    {!selectedRow || sortedTx.length === 0 ? (
                      <tr><td colSpan={6} className="px-2 py-2 text-muted-foreground">{t('common.noData')}</td></tr>
                    ) : sortedTx.map((tx) => (
                      <tr key={tx.id}
                        className={cn('border-t', tx.iptal && 'text-muted-foreground line-through')}
                        title={tx.iptal ? t('accApproval.cancelTx.cancelledInfo', {
                          kim: tx.iptalKullaniciAdSoyad ?? '—',
                          tarih: tx.iptalTarihi ? formatDate(tx.iptalTarihi) : '—',
                        }) : undefined}>
                        <td className="px-2 py-1">{selectedRow.musteriAd}</td>
                        <td className="px-2 py-1">{selectedRow.mUlke ?? ''}</td>
                        <td className="px-2 py-1">{pt}</td>
                        <td className="px-2 py-1 text-right">{formatCurrency(tx.odenenMiktar ?? 0, pt)}</td>
                        <td className="px-2 py-1">{formatDate(tx.tarih)}</td>
                        <td className="px-1 py-0.5 text-center">
                          {tx.iptal ? (
                            <span className="inline-block text-[10px] font-medium text-destructive">
                              {t('accApproval.cancelTx.badge')}
                            </span>
                          ) : (
                            <CancelTxButton onClick={() => setCancelTarget({
                              ...tx, paraTipi: pt, kalanBakiye: selectedRow.kalanBakiye ?? 0,
                            })} />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* Detay — DetayTablo satırları + Ürün & Bileşen */}
            <TabsContent value="detay" className="space-y-2">
              <div>
                <p className="mb-1 text-xs font-semibold">{t('qc.blocks.detay')}</p>
                <div className="max-h-32 overflow-y-auto rounded border">
                  {!d || d.details.length === 0 ? (
                    <p className="p-2 text-xs text-muted-foreground">{t('common.noData')}</p>
                  ) : (
                    <ul className="divide-y">
                      {d.details.map((line, i) => (
                        <li key={i} className="px-2 py-1 text-xs">{resolveClause(t, line)}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold">{t('qc.blocks.urunBilesen')}</p>
                <div className="max-h-40 overflow-auto rounded border">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-muted/80">
                      <tr>
                        <th className="px-2 py-1 text-left font-medium">{t('qc.items.kategori')}</th>
                        <th className="px-2 py-1 text-left font-medium">{t('qc.items.oznitelik')}</th>
                        <th className="px-2 py-1 text-left font-medium">{t('qc.items.bilesenAdi')}</th>
                        <th className="px-2 py-1 text-left font-medium">{t('qc.items.birim')}</th>
                        <th className="px-2 py-1 text-right font-medium">{t('qc.items.adet')}</th>
                        <th className="px-2 py-1 text-right font-medium">{t('qc.items.fiyat')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!d || d.items.length === 0 ? (
                        <tr><td colSpan={6} className="px-2 py-2 text-muted-foreground">{t('common.noData')}</td></tr>
                      ) : d.items.map((i, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="px-2 py-1">{i.kategoriAdi ?? ''}</td>
                          <td className="px-2 py-1">{i.oznitelikAdi ?? ''}</td>
                          <td className="px-2 py-1">{i.bilesenAdi ?? ''}</td>
                          <td className="px-2 py-1">{i.birim ?? ''}</td>
                          <td className="px-2 py-1 text-right">{i.adet}</td>
                          {/* Legacy quirk: bileşen satırlarında Fiyat hücresi boş */}
                          <td className="px-2 py-1 text-right">
                            {i.bilesenAdi ? '' : formatCurrency(i.fiyat ?? 0, pt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            {/* Müşteri */}
            <TabsContent value="musteri">
              <div className="grid grid-cols-3 gap-1.5">
                <ROField label={t('qc.fields.isim')} value={d?.musteriAd} />
                <ROField label={t('qc.fields.telefon')} value={d?.mTelefon} />
                <ROField label={t('qc.fields.ulke')} value={d?.mUlke} />
                <ROField label={t('qc.fields.zipKodu')} value={d?.mZipKod} />
                <ROField label={t('qc.fields.email')} value={d?.mMail} />
                <ROField label={t('qc.fields.vat')} value={d?.mVATNumarasi} />
                <ROField label={t('qc.fields.adres')} value={d?.mAdres} multiline className="col-span-3" />
              </div>
            </TabsContent>

            {/* Teslimat */}
            <TabsContent value="teslimat">
              <div className="grid grid-cols-3 gap-1.5">
                <ROField label={t('qc.fields.teslimAlanAdi')} value={d?.tTeslimAlanAdi} />
                <ROField label={t('qc.fields.ilgiliKisi')} value={d?.tIlgiliKisi} />
                <ROField label={t('qc.fields.ulke')} value={d?.tUlke} />
                <ROField label={t('qc.fields.telefon')} value={d?.tTelefon} />
                <ROField label={t('qc.fields.altTelefon')} value={d?.tAltTelefon} />
                <ROField label={t('qc.fields.email')} value={d?.tE_Mail} />
                <ROField label={t('qc.fields.zipKodu')} value={d?.tZipKod} />
                <ROField label={t('qc.fields.vat')} value={d?.tVATNumarasi} />
                <ROField label={t('qc.fields.adres')} value={d?.tAdres} multiline className="col-span-3" />
              </div>
            </TabsContent>

            {/* Satış Temsilcisi */}
            <TabsContent value="temsilci">
              <div className="grid grid-cols-3 gap-1.5">
                <ROField label={t('qc.fields.temsilciAdi')} value={d?.kullaniciAdi} />
                <ROField label={t('qc.fields.telefon')} value={d?.sTelefon} />
                <ROField label={t('qc.fields.fax')} value={d?.sFax} />
                <ROField label={t('qc.fields.web')} value={d?.sWeb} />
                <ROField label={t('qc.fields.email')} value={d?.sE_Mail} />
                <ROField label={t('qc.fields.vat')} value={d?.sVatNumarasi} />
                <ROField label={t('qc.fields.ulke')} value={d?.sUlke} />
                <ROField label={t('qc.fields.adres')} value={d?.sAdres} multiline className="col-span-3" />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* 2 — Özet kartı (legacy ozetTabPage) */}
        <div className="flex w-full shrink-0 flex-col gap-1.5 rounded-md border p-2 sm:w-[300px]">
          <p className="text-sm font-semibold text-center">{t('accApproval.blocks.ozet')}</p>
          <div className="grid grid-cols-2 gap-1.5">
            <ROField label={t('qc.fields.siparisNo')} value={selected} />
            <ROField label={t('accApproval.fields.teslimatCesiti')}
              value={selectedRow ? (selectedRow.teslimatCesiti || t('qc.grid.veriYok')) : null} />
            <ROField label={t('qc.grid.kalanBakiye')}
              value={selectedRow ? formatCurrency(selectedRow.kalanBakiye ?? 0, pt) : null} />
            <ROField label={t('accApproval.fields.kapora')}
              value={selectedRow ? formatCurrency(selectedRow.kaparoFiyat ?? 0, pt) : null} />
            <ROField label={t('accApproval.fields.brutKapora')}
              value={selectedRow ? formatCurrency(brutKapora, pt) : null} />
            <ROField label={t('qc.fields.indirimYuzde')}
              value={d?.indirim != null ? `%${d.indirim}` : null} />
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <Checkbox label={t('qc.fields.montaj')} labelClassName="text-xs" checked={d?.montajVar ?? false} disabled readOnly />
            <Checkbox label={t('qc.fields.teslimat')} labelClassName="text-xs" checked={d?.teslimatVar ?? false} disabled readOnly />
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            <span>{t('qc.fields.montajFiyati')}: {d ? formatCurrency(d.montajFiyat ?? 0, pt) : '—'}</span>
            <span>{t('qc.fields.teslimatFiyati')}: {d ? formatCurrency(d.teslimatFiyat ?? 0, pt) : '—'}</span>
          </div>
          <ROField label={t('accApproval.fields.siparisNotu')} value={d?.siparisNotu} multiline />
          <div className="mt-auto grid grid-cols-2 gap-1.5 pt-1">
            <Button size="xs" variant="outline" disabled={!selected}
              onClick={() => { if (requireSelection()) setFormNo(selected) }}>
              {t('qc.actions.formGetir')}
            </Button>
            <Button size="xs" variant="outline" disabled={!selected} onClick={handleExcel}>
              {t('qc.actions.excelYaz')}
            </Button>
            <Button size="xs" variant="outline" disabled={!selected} onClick={handlePdf}>
              PDF
            </Button>
            <Button size="xs" variant="outline" disabled={!selected} onClick={() => handleAttachment('ek')}>
              {t('qc.actions.saticiEk')}
            </Button>
            <Button size="xs" variant="outline" disabled={!selected}
              onClick={() => { if (requireSelection()) setEkTarget(selected) }}>
              {t('qc.actions.muhasebeEk')}
            </Button>
          </div>
        </div>

        {/* 3 — Cari kartı (legacy tabPage5 "Cari") + onay aksiyonları */}
        <div className="flex w-full shrink-0 flex-col gap-1.5 rounded-md border p-2 sm:w-[320px]">
          <p className="text-sm font-semibold text-center">{t('qc.blocks.cariBilgiler')}</p>
          <CariRow label={t('qc.fields.siparisToplam')}>
            <CariValue value={selectedRow ? formatCurrency(toplam, pt) : ''} />
          </CariRow>
          <CariRow label={t('qc.fields.paraBirimi')}>
            <CariValue value={pt || null} />
          </CariRow>
          <CariRow label={t('qc.fields.kaparoBakiye')}>
            <div className="flex gap-1">
              <div className="w-14 rounded border bg-muted/40 px-1.5 py-1 text-center text-xs min-h-[1.6rem]">
                {selectedRow ? `%${pesinYuzde}` : '—'}
              </div>
              <div className="min-w-0 flex-1 rounded border bg-muted/40 px-1.5 py-1 text-xs min-h-[1.6rem] truncate">
                {selectedRow ? formatCurrency(selectedRow.kaparoFiyat ?? 0, pt) : '—'}
              </div>
            </div>
          </CariRow>
          <CariRow label={t('qc.fields.siparisBakiye')}>
            <CariValue value={selectedRow ? formatCurrency(Math.max(selectedRow.kalanBakiye ?? 0, 0), pt) : ''} />
          </CariRow>
          {/* Round-9 §19 — "Tamamlanmayı Bekleyen" seçiliyse finalize paneli;
              aksi halde §18 etiketli Maliyet/Peşinat talep alanı. */}
          {canFinalize ? (
            <div className="space-y-1.5 rounded border border-success/40 bg-success-soft/50 p-2">
              <p className="text-[11px] text-muted-foreground">{t('accApproval.finalize.hint')}</p>
              <CariRow label={t('accApproval.finalize.pesinat')}>
                <DecimalInput inputSize="sm" className="h-7" value={finalizeForm.pesinat ?? ''}
                  onValueChange={(v) => setFinalizeForm((f) => ({ ...f, pesinat: v === '' ? null : v }))} />
              </CariRow>
              <CariRow label={t('accApproval.finalize.pesinatTarihi')}>
                <Input type="date" inputSize="sm" className="h-7" value={finalizeForm.pesinatTarihi}
                  onChange={(e) => setFinalizeForm((f) => ({ ...f, pesinatTarihi: e.target.value }))} />
              </CariRow>
              <CariRow label={t('accApproval.finalize.finalMaliyet')}>
                <DecimalInput inputSize="sm" className="h-7" value={finalizeForm.finalMaliyet ?? ''}
                  onValueChange={(v) => setFinalizeForm((f) => ({ ...f, finalMaliyet: v === '' ? null : v }))} />
              </CariRow>
              <Textarea
                className="min-h-[2.5rem] resize-none text-xs"
                placeholder={t('accApproval.finalize.maliyetNotu')}
                value={finalizeForm.maliyetDetayi}
                onChange={(e) => setFinalizeForm((f) => ({ ...f, maliyetDetayi: e.target.value }))}
              />
            </div>
          ) : (
            <>
              {/* Lojistik teklif akışı — yöneticinin onayladığı lojistik teklif
                  (firma + fiyat) Burcu'ya salt-okunur gösterilir. */}
              {canLoj && selectedRow?.onayliLojistikFirma && (
                <div className="space-y-1.5 rounded border border-success/40 bg-success-soft/50 p-2">
                  <p className="text-[11px] font-semibold text-success-soft-foreground">{t('logisticsOffer.approvedTitle')}</p>
                  <CariRow label={t('logisticsOffer.firma')}>
                    <span className="text-xs font-medium">{selectedRow.onayliLojistikFirma}</span>
                  </CariRow>
                  <CariRow label={t('logisticsOffer.fiyat')}>
                    <span className="text-xs font-medium tabular-nums">
                      {selectedRow.onayliLojistikFiyat != null ? formatCurrency(selectedRow.onayliLojistikFiyat, selectedRow.onayliLojistikParaBirimi ?? undefined) : '—'}
                    </span>
                  </CariRow>
                </div>
              )}

              {/* Round-10 — Peşinat alanı (Cari/Lojistik kuyruğu): onayla
                  birlikte MuhasebeIslemTablo'ya tahsilat olarak kaydedilir.
                  Kuyruk dışı siparişte "Peşinat Kaydet" ile tek başına kaydedilir.
                  Maliyet talebinden TAMAMEN bağımsız — Maliyet'e yazmaz. */}
              {(canCari || canLoj || canEkPesinat) && (
                <div className="space-y-1.5 rounded border border-info/40 bg-info-soft/50 p-2">
                  <CariRow label={canEkPesinat
                    ? t('accApproval.cariLabel.pesinatN', { n: nextPesinatNo })
                    : t(canLoj ? 'accApproval.cariLabel.pesinat2' : 'accApproval.cariLabel.pesinat1')}>
                    <DecimalInput inputSize="sm" className="h-7" value={pesinatForm.pesinat ?? ''}
                      onValueChange={(v) => setPesinatForm((f) => ({ ...f, pesinat: v === '' ? null : v }))} />
                  </CariRow>
                  <CariRow label={t('accApproval.finalize.pesinatTarihi')}>
                    <Input type="date" inputSize="sm" className="h-7" value={pesinatForm.pesinatTarihi}
                      onChange={(e) => setPesinatForm((f) => ({ ...f, pesinatTarihi: e.target.value }))} />
                  </CariRow>
                  <p className="text-[10px] text-muted-foreground">{t(canEkPesinat ? 'accApproval.pesinat.hintEk' : 'accApproval.pesinat.hint')}</p>
                </div>
              )}

            </>
          )}
          {/* Kuyruğa göre bağlamsal onay aksiyonu */}
          <div className="mt-auto space-y-1 pt-1">
            {canFinalize ? (
              <>
              {(finalizeForm.finalMaliyet ?? -1) < 0 && (
                <p role="status" className="text-[11px] text-warning">{t('accApproval.finalize.needCost')}</p>
              )}
              <Button size="sm" className="w-full"
                loading={finalizeMut.isPending}
                disabled={(finalizeForm.finalMaliyet ?? -1) < 0}
                onClick={async () => { const no = requireSelection(); if (no && await confirmOverpay(finalizeForm.pesinat)) finalizeMut.mutate(no) }}>
                {t('accApproval.actions.tamamla')}
              </Button>
              </>
            ) : canLoj ? (
              <Button size="sm" className="w-full"
                loading={lojMut.isPending}
                onClick={async () => { const no = requireSelection(); if (no && await confirmOverpay(pesinatForm.pesinat)) lojMut.mutate(no) }}>
                {t('accApproval.actions.lojistikOnayla')}
              </Button>
            ) : canEkPesinat ? (
              <Button size="sm" className="w-full"
                loading={ekPesinatMut.isPending}
                disabled={!((pesinatForm.pesinat ?? 0) > 0)}
                onClick={async () => { const no = requireSelection(); if (no && await confirmOverpay(pesinatForm.pesinat)) ekPesinatMut.mutate(no) }}>
                {t('accApproval.actions.pesinatKaydet')}
              </Button>
            ) : (
              <Button size="sm" className="w-full"
                loading={cariMut.isPending}
                disabled={!canCari}
                title={canCari ? undefined : t('accApproval.disabled.cari')}
                onClick={async () => { const no = requireSelection(); if (no && await confirmNoPesinat() && await confirmOverpay(pesinatForm.pesinat)) cariMut.mutate(no) }}>
                {t('accApproval.actions.cariOnayla')}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Alt bölge: kuyruk seçici + filtreler + master grid ──────────── */}
      <div className="min-h-0 flex-1 space-y-2 px-4 pb-2">
        <div className="flex flex-wrap items-end gap-2">
          {/* Kuyruk seçici + legacy hızlı filtre üçlüsü */}
          <div className="flex flex-wrap gap-1">
            {VIEWS.map((v) => (
              <Button key={v} size="xs"
                variant={view === v ? 'default' : 'outline'}
                aria-pressed={view === v}
                onClick={() => { setView(v); setSelected(null) }}>
                {t(`accApproval.views.${v}`)}
                {v === 'cariQueue' && cariCount > 0 && ` (${cariCount})`}
                {v === 'lojistikQueue' && lojCount > 0 && ` (${lojCount})`}
                {v === 'tamamlanmaQueue' && tamCount > 0 && ` (${tamCount})`}
              </Button>
            ))}
          </div>
          {/* İç denetim — aktif kuyruğun bir önceki adımında bekleyenler (cari ← Kontrol,
              lojistik ← Üretim, tamamlanma ← Lojistik teslimat). */}
          <WaitingUpstreamPanel screen={ACCOUNTING_VIEW_SCREEN[view]} variant="button" />
          <Input inputSize="sm" placeholder={t('common.quickFilter')} aria-label={t('common.quickFilter')} value={search}
            onChange={(e) => setSearch(e.target.value)} className="h-7 max-w-[200px]" />
          <div className="flex items-center gap-1">
            <Input inputSize="sm" type="date" aria-label={t('common.startDate')} value={from} onChange={(e) => setFrom(e.target.value)} className="h-7 w-32" />
            <span className="text-muted-foreground text-xs">—</span>
            <Input inputSize="sm" type="date" aria-label={t('common.endDate')} value={to} onChange={(e) => setTo(e.target.value)} className="h-7 w-32" />
          </div>
        </div>

        <DataTable
          tableId="acc-approval"
          exportFileName="muhasebe-onay"
          columns={columns}
          data={rows as (AccountingOrderListDto & Record<string, unknown>)[]}
          keyField="siparisNo"
          loading={isLoading}
          emptyMessage={notHere}
          density="compact"
          showFooter
          // v5 §5 kararı: satır renklendirmesi yok — yalnız seçili (etkin) satır vurgusu.
          activeRowKey={selected}
          onActiveRowChange={(r) => setSelected((r as AccountingOrderListDto).siparisNo)}
          onRowActivate={(r) => setFormNo((r as AccountingOrderListDto).siparisNo)}
          rowActions={[
            { key: 'form', label: t('qc.actions.formGetir'), shortcut: 'Enter', onSelect: (r) => setFormNo((r as AccountingOrderListDto).siparisNo) },
            { key: 'ek', label: t('qc.actions.muhasebeEk'), onSelect: (r) => setEkTarget((r as AccountingOrderListDto).siparisNo) },
          ]}
        />
      </div>

      {/* MuhasebeEk uploader (AccountingPage kalıbı) */}
      <Dialog open={!!ekTarget} onOpenChange={(o) => { if (!o) setEkTarget(null) }}>
        <DialogContent size="sm">
          <DialogHeader><DialogTitle>{t('qc.actions.muhasebeEk')} — {ekTarget}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="aa-ek">{t('accApproval.fields.dosya')}</Label>
            <Input id="aa-ek" type="file" disabled={uploadMut.isPending} onChange={(e) => {
              const f = e.target.files?.[0]
              if (f && ekTarget) uploadMut.mutate({ no: ekTarget, file: f })
            }} />
            <p className="text-xs text-muted-foreground">{uploadMut.isPending ? t('common.loading') : t('accounting.tahsilat.ekHint')}</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tahsilat/peşinat iptali — Kalan Bakiye önizlemeli onay */}
      <CancelTransactionDialog target={cancelTarget} onClose={() => setCancelTarget(null)} />

      {/* Form'u getir — salt-okunur sipariş formu */}
      <OrderDetailModal siparisNo={formNo} onClose={() => setFormNo(null)} />
    </div>
  )
}

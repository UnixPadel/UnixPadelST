import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getPendingQC, getQCById, approveQC, rejectQC } from '@/api/qualityControl'
import {
  getOrders, updatePaidAmount, downloadAttachment, downloadExcel, downloadPdf,
  type OrderFilter,
} from '@/api/orders'
import { getCustomers, getUlkeler } from '@/api/customers'
import { getUsersLookup } from '@/api/users'
import { DataTable, type Column } from '@/components/DataTable'
import { DecimalInput } from '@/components/DecimalInput'
import { OrderDetailModal } from '@/components/OrderDetailModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Combobox } from '@/components/ui/combobox'
import { ReadOnlyField } from '@/components/ui/key-value'
import { FieldError } from '@/components/FieldError'
import { PageHeader } from '@/components/PageHeader'
import { FillPage, FillRegion, ResizableTop } from '@/components/FillPage'
import { StatusBadge } from '@/components/StatusBadge'
import { FilterBar, FilterField } from '@/components/FilterBar'
import { WaitingUpstreamPanel } from '@/components/WaitingUpstreamPanel'
import { useShortcutHints } from '@/components/StatusBar'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { useHotkeys } from '@/hooks/useHotkeys'
import { invalidateOrderGraph } from '@/lib/queryKeys'
import { toastApiError } from '@/lib/apiError'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ToastProvider'
import { formatDateShort, formatCurrency, cn } from '@/lib/utils'
import { statusLabel } from '@/lib/status'
import { resolveClause } from '@/lib/clauses'
import type { OrderListDto, QualityControlListDto } from '@/types'

/**
 * PROMPT-v4 — Kontrol ekranı (legacy Kontrol.cs / KontrolRed.cs 1:1 parity).
 * PROMPT-v6 §2 — yerleşim düzeltmesi: üstte ÜÇ panel (Filtreme | sekmeli
 * Detay | Kontrol; Fabrika kartı kaldırıldı), altta tam genişlik master grid.
 * Üst bölge aktif sekmenin doğal yüksekliğine oturur (iç scroll yok); grid
 * ile arasındaki splitter sürüklenerek grid yüksekliği ayarlanabilir.
 * Yalnız Detay sekmesindeki iki liste kendi içinde kayar (en uzun içerik).
 *
 * Erişim: yalnız elshan.rasulov (route RoleGuard + tüm backend mutasyon gate'leri).
 *
 * PROMPT-v6 §1 onay semantiği: Onayla yalnız Kontrol='Onay' yazar — aşama
 * değişmez; sipariş Burcu'nun Cari Onay kuyruğuna düşer (v4 §5.1 sapması kalktı).
 */

const STAGES = ['Teklif', 'Siparis', 'Planlama', 'Uretim', 'Hazir', 'Lojistik', 'Tamamlandi', 'Iptal']
const CONTROLS = ['Kontrol', 'Onay', 'Reddet']
const PAYMENTS = ['Ödendi', 'Beklemede']

interface Filters {
  siparisNo: string
  musteriAd: string   // 'all' | müşteri adı
  ulke: string        // 'all' | ülke adı
  kullaniciID: string // 'all' | id
  odemeDurum: string  // 'all' | Ödendi | Beklemede
  asama: string       // 'all' | stage
  kontrol: string     // 'all' | Kontrol | Onay | Reddet — default Kontrol
  // Round-Next §11 — tarih (Başlangıç/Bitiş) filtreleri kaldırıldı.
}

const defaultFilters = (): Filters => ({
  siparisNo: '', musteriAd: 'all', ulke: 'all', kullaniciID: 'all',
  odemeDurum: 'all', asama: 'all', kontrol: 'Kontrol',
})

/** Legacy araButtonInTab_Click_1 semantiği: SiparişNo doluysa TÜM diğer filtreler yok sayılır. */
function buildSearchParams(f: Filters): OrderFilter {
  const no = f.siparisNo.trim()
  if (no) {
    // Legacy: 'T…' → 'S…' normalizasyonu (LIKE %…%)
    const normalized = no.toUpperCase().startsWith('T') ? 'S' + no.slice(1) : no
    return { siparisNo: normalized, pageSize: 200 }
  }
  const p: OrderFilter = { pageSize: 200 }
  if (f.musteriAd !== 'all') p.musteriAd = f.musteriAd
  if (f.ulke !== 'all') p.mUlke = f.ulke
  if (f.kullaniciID !== 'all') p.kullaniciID = Number(f.kullaniciID)
  if (f.odemeDurum !== 'all') p.odemeDurum = f.odemeDurum
  if (f.asama !== 'all') p.asama = f.asama
  // Legacy guard: Aşama = Iptal iken Kontrol Durumu filtresi atlanır.
  if (f.kontrol !== 'all' && f.asama !== 'Iptal') p.kontrol = f.kontrol
  // Round-Next §11 — tarih aralığı filtresi kaldırıldı.
  return p
}

/** Master grid satırı — pending (QC DTO) ve filtreli (OrderListDto) yükleri tek şekle indirger. */
interface KontrolRow extends Record<string, unknown> {
  siparisNo: string
  musteriAd: string
  mUlke?: string
  toplamFiyat: number | null
  kaparoFiyat: number
  kalanBakiye: number
  pesinYuzde: number
  teslimatCesiti?: string
  paraTipi: string
  odemeDurum?: string
  siparisMiTeklifMi: string
  tarih: string
  sirket?: string
  kontrol: string
}

function fromPending(r: QualityControlListDto): KontrolRow {
  return {
    siparisNo: r.siparisNo, musteriAd: r.musteriAd, mUlke: r.mUlke,
    toplamFiyat: r.toplamFiyat, kaparoFiyat: r.kaparoFiyat ?? 0,
    // Legacy parity: liste tarafında KalanBakiye clamp'lenmez (negatif olabilir).
    kalanBakiye: r.kalanBakiye ?? 0,
    pesinYuzde: r.pesinYuzde, teslimatCesiti: r.teslimatCesiti,
    paraTipi: r.paraTipi, odemeDurum: r.odemeDurum,
    siparisMiTeklifMi: r.siparisMiTeklifMi, tarih: r.tarih, sirket: r.sirket,
    kontrol: r.kontrol,
  }
}

function fromSearch(r: OrderListDto): KontrolRow {
  const toplam = r.toplamFiyat ?? 0
  const odenen = r.odenenMiktar ?? 0
  return {
    siparisNo: r.siparisNo, musteriAd: r.musteriAd, mUlke: r.mUlke,
    toplamFiyat: r.toplamFiyat,
    kaparoFiyat: Math.max((toplam * r.pesinYuzde) / 100 - odenen, 0),
    kalanBakiye: toplam - odenen,
    pesinYuzde: r.pesinYuzde, teslimatCesiti: r.teslimatCesiti,
    paraTipi: r.paraTipi, odemeDurum: r.odemeDurum,
    siparisMiTeklifMi: r.siparisMiTeklifMi, tarih: r.tarih, sirket: r.sirket,
    kontrol: r.kontrol,
  }
}

// SR-6 — salt-okunur alanlar ortak ReadOnlyField (components/ui/key-value).
const ROField = ReadOnlyField

/** Cari sekmesi satırı — legacy "etiket solda, kutu sağda" düzeni. */
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

export function QualityControlPage() {
  const qc = useQueryClient()
  const nav = useNavigate()
  const { toast } = useToast()
  const { confirm } = useConfirm()
  const { t } = useTranslation()
  const [params] = useSearchParams()

  // ── Filtre + arama state ────────────────────────────────────────────────
  const [filters, setFilters] = useState<Filters>(defaultFilters())
  const [submitted, setSubmitted] = useState<Filters | null>(null)
  // E-10 — Bekleyen İşler "İşle" → ?sel=NO ile satır seçili açılır.
  const [selected, setSelected] = useState<string | null>(() => params.get('sel'))
  // "Sadece onaylı" — görünümü client-side yalnız Kontrol='Onay' satırlara süzer
  // (varsayılan liste bekleyen + son 30 gün onaylıyı içerir; işaretlenince
  // bekleyenler gizlenir). Backend'e ek istek atmaz.
  const [onlyApproved, setOnlyApproved] = useState(false)

  // ── Veri: varsayılan pending listesi (legacy KontorlDataGridLoad) ───────
  const { data: pending = [], isLoading: pendingLoading, isError: pendingError } = useQuery({
    queryKey: ['quality-control'],
    queryFn: getPendingQC,
  })

  // ── Veri: filtreli arama (legacy araButtonInTab_Click_1) ────────────────
  const { data: searchPage, isLoading: searchLoading, isError: searchError } = useQuery({
    queryKey: ['qc-search', submitted],
    queryFn: () => getOrders(buildSearchParams(submitted!)),
    enabled: submitted !== null,
  })

  // QW-7 — boş sonuç artık hata toast'u değil; tablonun boş durumu gösterilir.

  const rows: KontrolRow[] = useMemo(() => {
    const base = submitted !== null
      ? (searchPage?.items ?? []).filter((r) => !r.silindi).map(fromSearch)
      : pending.map(fromPending)
    return onlyApproved ? base.filter((r) => r.kontrol === 'Onay') : base
  }, [submitted, searchPage, pending, onlyApproved])

  // ── Filtre dropdown kaynakları ──────────────────────────────────────────
  const { data: customers = [] } = useQuery({ queryKey: ['musteriler'], queryFn: getCustomers })
  const { data: ulkeler = [] } = useQuery({ queryKey: ['ulkeler'], queryFn: getUlkeler })
  const { data: users = [] } = useQuery({ queryKey: ['users-lookup'], queryFn: getUsersLookup })

  // ── Seçili sipariş detayı ───────────────────────────────────────────────
  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['qc-detail', selected],
    queryFn: () => getQCById(selected!),
    enabled: !!selected,
  })

  // PROMPT-v7 §4 — Muhasebe Geçmişi sekmesi Kontrol ekranından kaldırıldı;
  // qc-transactions query'si ve sortedTx memo'su da gitti. (Burcu ekranı
  // aynı endpoint'i kendi acc-approval-tx query'siyle kullanmaya devam eder.)

  // ── Aksiyon state ───────────────────────────────────────────────────────
  const [rejectOpen, setRejectOpen] = useState(false)
  const [redNotu, setRedNotu] = useState('')
  const [formNo, setFormNo] = useState<string | null>(null)
  const [odenenInput, setOdenenInput] = useState<number | ''>('')
  const [redTouched, setRedTouched] = useState(false)
  // SR-8 — opsiyonel onay notu (api approveQC kontrolNot kabul ediyor).
  const [onayNotu, setOnayNotu] = useState('')

  // Detay yüklenince cari alanını doldur
  useEffect(() => {
    setOdenenInput(detail?.odenenMiktar ?? '')
  }, [detail])

  // SR-7 — tüm sipariş grafiği tazelenir (önceden accounting-orders atlanıyordu).
  // SR-8 — "Onayla ve sonrakine geç": işlemden sonra seçim temizlenmek yerine
  // listedeki bir sonraki bekleyen ('Kontrol') satıra geçer.
  const nextPendingAfter = (no: string): string | null => {
    const i = rows.findIndex((r) => r.siparisNo === no)
    const after = [...rows.slice(i + 1), ...rows.slice(0, Math.max(i, 0))]
    return after.find((r) => r.kontrol === 'Kontrol' && r.siparisNo !== no)?.siparisNo ?? null
  }
  const refreshAll = (no?: string) => {
    void invalidateOrderGraph(qc)
    setSelected(no ? nextPendingAfter(no) : null)
  }

  const requireSelection = (): string | null => {
    if (!selected) {
      toast({ title: t('qc.selectFirst'), variant: 'warning' })
      return null
    }
    return selected
  }

  // ── Mutations ───────────────────────────────────────────────────────────
  const approveMut = useMutation({
    mutationFn: (no: string) => approveQC(no, onayNotu.trim() || undefined),
    onSuccess: (_d, no) => { refreshAll(no); setOnayNotu(''); toast({ title: t('qc.approved'), description: no, variant: 'success' }) },
    onError: (e) => toastApiError(toast, t('qc.approveFailed'), e),
  })

  const rejectMut = useMutation({
    mutationFn: ({ no, red }: { no: string; red: string }) => rejectQC(no, red),
    onSuccess: (_d, vars) => {
      refreshAll(vars.no); setRejectOpen(false); setRedNotu('')
      toast({ title: t('qc.rejected'), description: vars.no, variant: 'success' })
    },
    onError: (e) => toastApiError(toast, t('qc.rejectFailed'), e),
  })

  const cariMut = useMutation({
    mutationFn: ({ no, miktar }: { no: string; miktar: number }) => updatePaidAmount(no, miktar),
    onSuccess: (_d, vars) => {
      // Cari blok yeniden hesaplansın ama seçim korunup form yerinde kalsın.
      void invalidateOrderGraph(qc)
      toast({ title: t('qc.cariUpdated'), description: vars.no, variant: 'success' })
    },
    onError: (e) => toastApiError(toast, t('common.error'), e),
  })

  // PROMPT-v6 §2 — Fabrika kartı (stage mutasyonu) UI'dan kaldırıldı;
  // backend PUT /api/orders/{no}/stage endpoint'i dokunulmadı.

  // ── Aksiyon handler'ları ────────────────────────────────────────────────
  const selectedRow = rows.find((r) => r.siparisNo === selected) ?? null
  // QW-7 — onaylı satırda Onayla anlamsız (backend reddediyordu) → kilitli + sebep.
  const approveBlocked = !selected ? t('qc.selectFirst') : selectedRow?.kontrol === 'Onay' ? t('qc.alreadyApproved') : null

  const handleApprove = () => {
    const no = requireSelection()
    if (no && !approveBlocked) approveMut.mutate(no)
  }
  // Klavye 'O': hızlı ama kazara değil — Enter ile onaylanan kısa bir pencere.
  const handleApproveKey = async () => {
    if (approveBlocked || !selected) { if (approveBlocked) toast({ title: approveBlocked, variant: 'warning' }); return }
    const ok = await confirm({ title: t('qc.approveConfirmTitle'), description: selected + ' — ' + (selectedRow?.musteriAd ?? ''), confirmLabel: t('qc.actions.onayla') })
    if (ok) approveMut.mutate(selected)
  }

  const handleRejectOpen = () => {
    if (requireSelection()) { setRedNotu(''); setRedTouched(false); setRejectOpen(true) }
  }

  const handleRevise = () => {
    const no = requireSelection()
    if (no) nav(`/orders/new?revise=${encodeURIComponent(no)}`)
  }

  // PROMPT-v5 §1 — legacy buttonFormGetir_Click: salt-okunur sipariş formu görüntüleyici.
  const handleFormGetir = () => {
    const no = requireSelection()
    if (no) setFormNo(no)
  }

  const handleCari = () => {
    const no = requireSelection()
    if (!no) return
    if (odenenInput === '' || odenenInput < 0) {
      toast({ title: t('qc.invalidPaidAmount'), variant: 'warning' })
      return
    }
    cariMut.mutate({ no, miktar: odenenInput })
  }

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

  // ── Master grid kolonları (legacy başlıklar birebir) ────────────────────
  const columns: Column<KontrolRow>[] = [
    { key: 'siparisNo', pin: 'left', header: t('qc.grid.siparisNo'), sortable: true,
      render: (r) => <span className="font-mono text-xs">{r.siparisNo}</span> },
    { key: 'musteriAd', truncate: '16rem', header: t('qc.grid.musteriAd'), sortable: true },
    { key: 'mUlke', header: t('qc.grid.ulke'), sortable: true },
    { key: 'toplamFiyat', header: t('qc.grid.toplamSiparis'), sortable: true, type: 'money',
      render: (r) => formatCurrency(r.toplamFiyat ?? 0, r.paraTipi) },
    { key: 'kaparoFiyat', header: t('qc.grid.kaparoBakiyesi'), sortable: true, type: 'money',
      render: (r) => formatCurrency(r.kaparoFiyat, r.paraTipi) },
    { key: 'kalanBakiye', header: t('qc.grid.kalanBakiye'), sortable: true, type: 'money',
      render: (r) => formatCurrency(r.kalanBakiye, r.paraTipi) },
    { key: 'pesinYuzde', header: t('qc.grid.pesinYuzde'), sortable: true, type: 'number' },
    // Legacy COALESCE(TeslimatÇeşiti, 'Veri Yok')
    { key: 'teslimatCesiti', header: t('qc.grid.teslimatCesiti'),
      render: (r) => r.teslimatCesiti || t('qc.grid.veriYok') },
    { key: 'paraTipi', header: t('qc.grid.paraTipi'), sortable: true },
    { key: 'odemeDurum', header: t('qc.grid.odemeDurumu'), sortable: true,
      render: (r) => <StatusBadge value={r.odemeDurum} context="odeme" /> },
    { key: 'siparisMiTeklifMi', header: t('qc.grid.asama'), sortable: true,
      render: (r) => <StatusBadge value={r.siparisMiTeklifMi} context="stage" /> },
    // Bekleyen ('Kontrol') vs onaylı ('Onay') ayrımı — onaylılar da listede
    // görünür olduğundan durum kolonu eklendi.
    { key: 'kontrol', header: t('qc.grid.kontrolDurumu'), sortable: true,
      render: (r) => <StatusBadge value={r.kontrol} context="kontrol" /> },
    // §6 — yoğun grid: kısa tarih (dd.MM.yy)
    { key: 'tarih', header: t('qc.grid.tarih'), sortable: true, type: 'date',
      render: (r) => formatDateShort(r.tarih) },
    { key: 'sirket', header: t('qc.grid.sirket'), sortable: true },
  ]

  // Para birimi etiketi (legacy :2076-2099 sembol eşlemesi formatCurrency içinde)
  const d = detail
  const toplam = d?.toplamFiyat ?? 0
  const odenen = d?.odenenMiktar ?? 0
  const pesinTutar = (toplam * (d?.pesinYuzde ?? 0)) / 100
  const brutKaparo = Math.max(pesinTutar - odenen, 0)
  const siparisBakiye = Math.max(toplam - odenen, 0)

  const loading = submitted !== null ? searchLoading : pendingLoading
  const pendingCount = pending.filter((p) => p.kontrol === 'Kontrol').length
  const capped = submitted !== null && (searchPage?.items.length ?? 0) >= 200

  // E-2 / SR-8 — klavye: ↑↓ satır (tablo), O onayla, R reddet, Enter form detayı.
  useHotkeys({
    o: () => { void handleApproveKey() },
    r: () => handleRejectOpen(),
  })
  useShortcutHints([
    { keys: '↑↓', label: t('shortcuts.moveRow') },
    { keys: 'O', label: t('shortcuts.qcApprove') },
    { keys: 'R', label: t('shortcuts.qcReject') },
    { keys: 'Enter', label: t('shortcuts.openRow') },
    { keys: 'F7', label: t('shortcuts.togglePanel') },
  ])
  const customerOptions = useMemo(
    () => [{ value: 'all', label: t('common.all') }, ...[...customers].sort((a, b) => a.musteriAd.localeCompare(b.musteriAd, 'tr')).map((m) => ({ value: m.musteriAd, label: m.musteriAd, description: m.ulkeAdi }))],
    [customers, t],
  )
  const submitSearch = () => { setSubmitted({ ...filters }); setSelected(null) }

  return (
    // Scaling Faz 1 — FillPage: sayfa dikeyde kaymaz; üst panel (ResizableTop,
    // varsayılan en çok %35, sürüklenebilir/katlanabilir, konumu hatırlanır) ile
    // grid (FillRegion, kalan yükseklik) viewport'u paylaşır.
    <FillPage>
      {/* ── Kompakt başlık (QW-4: ortak PageHeader) ─────────────────────── */}
      <div>
        <PageHeader
          density="compact"
          title={t('qc.title')}
          meta={
            // Sayaç yalnız bekleyenleri sayar (liste onaylıları da içeriyor).
            <Badge variant={pendingCount ? 'warning' : 'success'}>{t('qc.pendingCount', { count: pendingCount })}</Badge>
          }
          actions={
            <>
              {/* İç denetim — reddedilip temsilci düzeltmesi bekleyenler (bir önceki adım). */}
              <WaitingUpstreamPanel screen="qc" variant="button" />
              {/* Sadece onaylı — görünümü client-side Kontrol='Onay' satırlara süzer. */}
              <Checkbox label={t('qc.onlyApproved')} labelClassName="text-xs" checked={onlyApproved} onCheckedChange={setOnlyApproved} />
            </>
          }
        />
      </div>

      {/* ── Üst bölge: üç panel (PROMPT-v6 §2 — Fabrika kartı kalktı) ───
           Bölge aktif sekmenin doğal yüksekliğine oturur (h-auto, iç scroll
           yok). Paneller seçim olmasa da hep görünür; alanlar '—' gösterir,
           aksiyonlar select-first toast'ını atar. */}
      <ResizableTop
        pageId="qc"
        className="flex items-stretch gap-2 px-4 py-1.5"
        collapsed={
          // Katlıyken tek satır: seçili sipariş + karar butonları (tablo ana odak).
          <div className="flex items-center gap-2 rounded-md border px-2 py-1 text-xs">
            <span className="text-muted-foreground">{t('qc.fields.siparisNo')}:</span>
            <span className="font-mono">{selected ?? '—'}</span>
            {selectedRow && <span className="truncate text-muted-foreground">· {selectedRow.musteriAd}</span>}
            <div className="ml-auto flex gap-1.5">
              <Button size="xs" loading={approveMut.isPending} disabled={!!approveBlocked} title={approveBlocked ?? `${t('qc.actions.onayla')} (O)`} onClick={handleApprove}>
                {t('qc.actions.onayla')}
              </Button>
              <Button size="xs" variant="destructive" disabled={!selected} title={`${t('qc.actions.reddet')} (R)`} onClick={handleRejectOpen}>
                {t('qc.actions.reddet')}
              </Button>
            </div>
          </div>
        }
      >

        {/* PROMPT-v7 §4 — Filtreme dikey kartı kaldırıldı; filtreler gridin
            hemen üstüne kompakt yatay bar olarak taşındı (aşağıda). Üst bölgede
            yalnız iki kart kalır: Detay (genişler) | Kontrol (~300px). */}

        {/* 1 — Detay sekmeleri (legacy tab sırası) — doğal yükseklik, iç scroll yok */}
        <div className="flex min-w-0 flex-1 flex-col rounded-md border p-2">
          <Tabs defaultValue="cari" className="flex flex-1 flex-col">
            <TabsList className="h-8 w-full shrink-0 justify-start overflow-x-auto">
              <TabsTrigger className="px-2 py-1 text-xs" value="cari">{t('qc.tabs.cari')}</TabsTrigger>
              {/* PROMPT-v7 §4 — Muhasebe Geçmişi sekmesi kaldırıldı. */}
              <TabsTrigger className="px-2 py-1 text-xs" value="musteri">{t('qc.tabs.musteri')}</TabsTrigger>
              <TabsTrigger className="px-2 py-1 text-xs" value="teslimat">{t('qc.tabs.teslimat')}</TabsTrigger>
              <TabsTrigger className="px-2 py-1 text-xs" value="temsilci">{t('qc.tabs.satisTemsilcisi')}</TabsTrigger>
              <TabsTrigger className="px-2 py-1 text-xs" value="detay">{t('qc.tabs.detay')}</TabsTrigger>
            </TabsList>

            {/* Cari — Cari Bilgiler + Cari Güncelle / Revize Et */}
            <TabsContent value="cari">
              {/* Scaling Faz 1 — iki sütun: 5 satır + 2 buton yerine 3 satır (~150px). */}
              <div className="mx-auto max-w-3xl space-y-1.5 pt-1">
                <p className="text-xs font-semibold text-center">{t('qc.blocks.cariBilgiler')}</p>
                <div className="grid gap-x-4 gap-y-1.5 lg:grid-cols-2">
                  <CariRow label={t('qc.fields.siparisToplam')}>
                    <CariValue value={d ? formatCurrency(toplam, d.paraTipi) : ''} />
                  </CariRow>
                  <CariRow label={t('qc.fields.paraBirimi')}>
                    <CariValue value={d?.paraTipi} />
                  </CariRow>
                  {/* Legacy iki parçalı alan: %PesinYuzde + kaparo tutarı */}
                  <CariRow label={t('qc.fields.kaparoBakiye')}>
                    <div className="flex gap-1">
                      <div className="w-14 rounded border bg-muted/40 px-1.5 py-1 text-center text-xs min-h-[1.6rem]">
                        {d ? `%${d.pesinYuzde}` : '—'}
                      </div>
                      <div className="min-w-0 flex-1 rounded border bg-muted/40 px-1.5 py-1 text-xs min-h-[1.6rem] truncate">
                        {d ? formatCurrency(brutKaparo, d.paraTipi) : '—'}
                      </div>
                    </div>
                  </CariRow>
                  <CariRow label={t('qc.fields.siparisBakiye')}>
                    <CariValue value={d ? formatCurrency(siparisBakiye, d.paraTipi) : ''} />
                  </CariRow>
                  <CariRow label={t('qc.fields.odenenBakiye')}>
                    <DecimalInput inputSize="sm" className="h-7" value={odenenInput} onValueChange={setOdenenInput} disabled={!selected} />
                  </CariRow>
                  <div className="grid grid-cols-2 gap-1.5 lg:pl-[118px]">
                    <Button size="xs" loading={cariMut.isPending} disabled={!selected} onClick={handleCari}>
                      {t('qc.actions.cariGuncelle')}
                    </Button>
                    <Button size="xs" variant="outline" disabled={!selected} onClick={handleRevise}>
                      {t('qc.actions.revizeEt')}
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* PROMPT-v7 §4 — Muhasebe Geçmişi sekmesi içeriği kaldırıldı. */}

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
                <div className="col-span-3 flex flex-wrap items-center gap-3 text-xs">
                  <Checkbox label={t('qc.fields.montaj')} labelClassName="text-xs" checked={d?.montajVar ?? false} disabled readOnly />
                  <Checkbox label={t('qc.fields.teslimat')} labelClassName="text-xs" checked={d?.teslimatVar ?? false} disabled readOnly />
                  <span>{t('qc.fields.montajFiyati')}: {d ? formatCurrency(d.montajFiyat ?? 0, d.paraTipi) : '—'}</span>
                  <span>{t('qc.fields.teslimatFiyati')}: {d ? formatCurrency(d.teslimatFiyat ?? 0, d.paraTipi) : '—'}</span>
                  <span>{t('qc.fields.teslimatCesidi')}: {d ? (d.teslimatCesiti || t('qc.grid.veriYok')) : '—'}</span>
                </div>
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

            {/* Detay — DetayTablo listesi + Ürün & Bileşen. PROMPT-v6 §2:
                 en uzun sekme; sayfa 1920×1080'e sığsın diye YALNIZ bu
                 sekmedeki iki liste max-h ile kendi içinde kayar. */}
            <TabsContent value="detay" className="flex flex-col gap-2">
              <div className="flex flex-col">
                <p className="mb-1 text-xs font-semibold">{t('qc.blocks.detay')}</p>
                <div className="max-h-[12vh] overflow-y-auto rounded border">
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
              <div className="flex flex-col">
                <p className="mb-1 text-xs font-semibold">{t('qc.blocks.urunBilesen')}</p>
                <div className="max-h-[16vh] overflow-auto rounded border">
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
                          {/* Legacy quirk: bileşen satırlarında Fiyat hücresi boş bırakılır */}
                          <td className="px-2 py-1 text-right">
                            {i.bilesenAdi ? '' : formatCurrency(i.fiyat ?? 0, d.paraTipi)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* 3 — Kontrol (Sipariş No + Not + 2×3 aksiyon grid'i) */}
        {/* Scaling Faz 1 — iki iç kolon: solda Sipariş No + Not (kalan yükseklik),
            sağda aksiyonlar. Dikey yerine yatay yayılır → kart ~155px'e iner. */}
        <div className="flex w-[490px] shrink-0 gap-2 rounded-md border p-2">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[11px] font-medium text-muted-foreground">{t('qc.fields.siparisNo')}</span>
            <span className="min-w-0 flex-1 truncate rounded border bg-muted/40 px-1.5 py-0.5 font-mono">{selected ?? '—'}</span>
            {selected && detailLoading && <span className="text-[11px] text-muted-foreground">{t('common.loading')}</span>}
          </div>
          <div className="flex min-h-0 flex-1 flex-col space-y-0.5">
            <p className="text-[11px] font-medium text-muted-foreground">{t('qc.fields.not')}</p>
            {/* Sipariş notu serbest metin — kalan yükseklikte kendi içinde kayar. */}
            <div className="min-h-[2.25rem] flex-1 overflow-y-auto whitespace-pre-wrap break-words rounded border bg-muted/40 px-1.5 py-1 text-xs">
              {d?.siparisNotu || '—'}
            </div>
          </div>
          </div>
          <div className="flex w-[290px] shrink-0 flex-col gap-1.5">
          {/* İkincil aksiyonlar — üstte 3 eş buton, altta proforma ikilisi (Excel/PDF)
              yarım genişlikte: "Proforma (Excel)" etiketi sığsın. */}
          <div className="grid shrink-0 grid-cols-6 gap-1 [&>*]:col-span-2 [&>*]:px-1.5 [&>*:nth-child(n+4)]:col-span-3">
            <Button size="xs" variant="outline" disabled={!selected} onClick={() => handleAttachment('ek')}>
              {t('qc.actions.saticiEk')}
            </Button>
            <Button size="xs" variant="outline" disabled={!selected} onClick={() => handleAttachment('muhasebeek')}>
              {t('qc.actions.muhasebeEk')}
            </Button>
            <Button size="xs" variant="outline" disabled={!selected} onClick={handleFormGetir} title="Enter">
              {t('qc.actions.formGetir')}
            </Button>
            <Button size="xs" variant="outline" disabled={!selected} onClick={handleExcel}>
              {t('qc.actions.excelYaz')}
            </Button>
            <Button size="xs" variant="outline" disabled={!selected} onClick={handlePdf}>
              Proforma (PDF)
            </Button>
          </div>
          {/* Karar — birincil aksiyonlar ayrı ve belirgin (Round-8 §3: Onayla solda). */}
          <div className="mt-auto space-y-1.5">
            <Input
              inputSize="sm"
              value={onayNotu}
              onChange={(e) => setOnayNotu(e.target.value)}
              placeholder={t('qc.approveNotePlaceholder')}
              aria-label={t('qc.approveNotePlaceholder')}
              disabled={!!approveBlocked}
            />
            <div className="grid grid-cols-2 gap-1.5">
              <Button size="sm" className="h-8" loading={approveMut.isPending} disabled={!!approveBlocked} title={approveBlocked ?? `${t('qc.actions.onayla')} (O) — ${t('qc.nextHint')}`} onClick={handleApprove}>
                {t('qc.actions.onayla')}
              </Button>
              <Button size="sm" className="h-8" variant="destructive" disabled={!selected} title={!selected ? t('qc.selectFirst') : `${t('qc.actions.reddet')} (R)`} onClick={handleRejectOpen}>
                {t('qc.actions.reddet')}
              </Button>
            </div>
          </div>
          </div>
        </div>
      </ResizableTop>

      {/* ── Filtre barı (PROMPT-v7 §4) — gridin hemen üstünde kompakt yatay
           bar; sol dikey Filtreme kartının yerini aldı. Alan seti ve davranış
           (Sipariş No diğerlerini ezer, default Kontrol, Ara/Reset) AYNEN. */}
      <div className="px-4 py-2">
        {/* SR-5 — ortak FilterBar: Enter/F8 arar, Sıfırla legacy resetButton_Click. */}
        <FilterBar
          onSubmit={submitSearch}
          submitLabel={t('qc.filter.ara')}
          // Scaling Faz 1 — dar ekranda filtreler gizlenip tabloya yer açılabilir.
          collapsible
          activeCount={(Object.keys(filters) as (keyof Filters)[]).filter((k) => filters[k] !== defaultFilters()[k]).length}
          onReset={() => {
            // Legacy resetButton_Click → DataGrid(): defaultlar + pending listesi + detay temizliği
            setFilters(defaultFilters())
            setSubmitted(null)
            setSelected(null)
          }}
        >
          <FilterField label={t('qc.filter.siparisNo')}>
            <Input inputSize="sm" value={filters.siparisNo}
              onChange={(e) => setFilters((f) => ({ ...f, siparisNo: e.target.value }))} />
          </FilterField>
          <FilterField label={t('qc.filter.musteriAdi')}>
            <Combobox inputSize="sm" options={customerOptions} value={filters.musteriAd}
              onValueChange={(v) => setFilters((f) => ({ ...f, musteriAd: v || 'all' }))} />
          </FilterField>
          <FilterField label={t('qc.filter.temsilci')}>
            <Select value={filters.kullaniciID} onValueChange={(v) => setFilters((f) => ({ ...f, kullaniciID: v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.kullaniciID} value={String(u.kullaniciID)}>{u.ad} {u.soyad}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label={t('qc.filter.ulke')}>
            <Select value={filters.ulke} onValueChange={(v) => setFilters((f) => ({ ...f, ulke: v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                {[...ulkeler].sort((a, b) => a.ulkeAdi.localeCompare(b.ulkeAdi, 'tr'))
                  .map((u) => <SelectItem key={u.ulkelerID} value={u.ulkeAdi}>{u.ulkeAdi}</SelectItem>)}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label={t('qc.filter.kontrolDurumu')}>
            <Select value={filters.kontrol} onValueChange={(v) => setFilters((f) => ({ ...f, kontrol: v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                {CONTROLS.map((c) => <SelectItem key={c} value={c}>{statusLabel(t, c)}</SelectItem>)}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label={t('qc.filter.odemeDurumu')}>
            <Select value={filters.odemeDurum} onValueChange={(v) => setFilters((f) => ({ ...f, odemeDurum: v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                {PAYMENTS.map((p) => <SelectItem key={p} value={p}>{statusLabel(t, p)}</SelectItem>)}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label={t('qc.filter.asama')}>
            <Select value={filters.asama} onValueChange={(v) => setFilters((f) => ({ ...f, asama: v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                {STAGES.map((s) => <SelectItem key={s} value={s}>{statusLabel(t, s)}</SelectItem>)}
              </SelectContent>
            </Select>
          </FilterField>
        </FilterBar>
      </div>

      {/* ── Alt bölge: master grid (tam genişlik, iç scroll) ───────────── */}
      <FillRegion>
          <DataTable
            fill
            tableId="qc"
            exportFileName="kontrol"
            columns={columns}
            data={rows}
            keyField="siparisNo"
            loading={loading}
            error={submitted !== null ? searchError : pendingError}
            density="compact"
            // Scaling Faz 1 — tek satır: satır yüksekliği ~45 → ~34px.
            singleLineRows
            emptyMessage={submitted !== null ? t('qc.noResults') : t('qc.noPending')}
            activeRowKey={selected}
            onActiveRowChange={(r) => setSelected(r.siparisNo)}
            onRowActivate={(r) => setFormNo(r.siparisNo)}
            onRowDoubleClick={(r) => setFormNo(r.siparisNo)}
            toolbar={
              <span className="flex items-center gap-3">
                {/* Renk açıklaması — renk tek başına bilgi taşımaz, Kontrol kolonunda rozet de var. */}
                <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm border border-success/40 bg-success-soft" />{t('qc.legend.approved')}</span>
                {capped && <span className="text-warning">{t('qc.capped')}</span>}
              </span>
            }
            rowActions={[
              { key: 'detail', label: t('qc.actions.formGetir'), shortcut: 'Enter', onSelect: (r) => setFormNo(r.siparisNo) },
              { key: 'approve', label: t('qc.actions.onayla'), shortcut: 'O', disabled: (r) => r.kontrol === 'Onay', onSelect: (r) => { setSelected(r.siparisNo); approveMut.mutate(r.siparisNo) } },
              { key: 'reject', label: t('qc.actions.reddet'), shortcut: 'R', destructive: true, onSelect: (r) => { setSelected(r.siparisNo); setRedNotu(''); setRedTouched(false); setRejectOpen(true) } },
              { key: 'revise', label: t('qc.actions.revizeEt'), separatorBefore: true, onSelect: (r) => nav('/orders/new?revise=' + encodeURIComponent(r.siparisNo)) },
              { key: 'pdf', label: 'PDF', onSelect: (r) => { void downloadPdf(r.siparisNo).catch((e) => toastApiError(toast, t('common.error'), e)) } },
            ]}
            rowClassName={(r) => cn(
              // Onaylı satırlar hafif yeşil zemin — bekleyenlerden ayırt için (lejant üstte).
              // --pin-tint: sabit Sipariş No hücresi de aynı tonu alsın (DataTable PIN_BG).
              r.kontrol === 'Onay' && 'bg-success-soft/50 [--pin-tint:hsl(var(--success-soft)/0.5)]',
            )}
          />
      </FillRegion>

      {/* ── Reddet dialog'u (legacy KontrolRed formu) ──────────────────── */}
      <Dialog open={rejectOpen} onOpenChange={(o) => { if (!o) { setRejectOpen(false); setRedNotu('') } }}>
        <DialogContent>
          {/* QW-14 — form: Ctrl+Enter gönderir; boş gerekçe satır içi hata verir. */}
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              if (!redNotu.trim()) { setRedTouched(true); return }
              rejectMut.mutate({ no: selected!, red: redNotu })
            }}
          >
            <DialogHeader>
              <DialogTitle>{t('qc.rejectTitle')} — {selected}</DialogTitle>
            </DialogHeader>
            <div className="space-y-1">
              <Label htmlFor="qc-red">{t('qc.rejectNote')}</Label>
              <Textarea
                id="qc-red"
                autoFocus
                placeholder={t('qc.rejectPlaceholder')}
                value={redNotu}
                aria-invalid={redTouched && !redNotu.trim()}
                onChange={(e) => setRedNotu(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); e.currentTarget.form?.requestSubmit() } }}
                rows={4}
              />
              {redTouched && !redNotu.trim() && <FieldError message={t('validation.required')} />}
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setRejectOpen(false)}>{t('common.cancel')}</Button>
              <Button type="submit" variant="destructive" loading={rejectMut.isPending} title="Ctrl+Enter">
                {t('common.reject')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Form'u getir — salt-okunur sipariş formu (legacy buttonFormGetir) ── */}
      <OrderDetailModal siparisNo={formNo} onClose={() => setFormNo(null)} />
    </FillPage>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { MousePointerClick, Plus } from 'lucide-react'
import { getPendingQC, getQCById, approveQC, rejectQC } from '@/api/qualityControl'
import { getOrders, updatePaidAmount, type OrderFilter } from '@/api/orders'
import { getCustomers, getUlkeler } from '@/api/customers'
import { getUsersLookup } from '@/api/users'
import { DataTable, type Column } from '@/components/DataTable'
import { DecimalInput } from '@/components/DecimalInput'
import { OrderDetailModal, OrderDetailPanel } from '@/components/OrderDetailModal'
import { MasterDetailLayout } from '@/components/MasterDetailLayout'
import { RowActionsMenu } from '@/components/RowActionsMenu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/ui/form-field'
import { Label } from '@/components/ui/label'
import { Combobox } from '@/components/ui/combobox'
import { FieldError } from '@/components/FieldError'
import { PageHeader } from '@/components/PageHeader'
import { FillPage } from '@/components/FillPage'
import { StatusBadge } from '@/components/StatusBadge'
import { FilterBar, FilterField } from '@/components/FilterBar'
import { WaitingUpstreamPanel } from '@/components/WaitingUpstreamPanel'
import { useShortcutHints } from '@/components/StatusBar'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { useNextStepLabel } from '@/hooks/useNextStep'
import { useHotkeys } from '@/hooks/useHotkeys'
import { invalidateOrderGraph } from '@/lib/queryKeys'
import { toastApiError } from '@/lib/apiError'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ToastProvider'
import { formatDateShort, formatCurrency, cn } from '@/lib/utils'
import { statusLabel } from '@/lib/status'
import type { OrderListDto, QualityControlListDto } from '@/types'

/**
 * Sipariş Kontrolü (elshan.rasulov). Tek iş: siparişi incele, onayla ya da reddet.
 * Düzen Muhasebe · Onaylar ile aynı sırayı izler (40+ ergonomi, 2026-11):
 *
 *   1. Sekmeler      (Kontrol bekleyen · Onaylanan ┊ Tüm siparişlerde ara)
 *   2. Liste (solda) — ilk sipariş kendiliğinden seçilir
 *   3. Sağ panel     — üstte siparişin kendisi (kalemler, şartlar, geçmiş; kayar),
 *                      altta sabit karar bölgesi: onay notu + Onayla | Reddet
 *
 * Önceki düzen legacy Kontrol.cs portuydu: üstte 5 sekmeli detay + 7 butonlu
 * Kontrol kartı, altta 7 alanlı filtre barı ve liste. Müşteri / teslimat /
 * temsilci / kalem sekmeleri artık sipariş detay panelinin kendisi; proforma
 * ve Satıcı Ek o panelin başlığında ve Muhasebe Klasörü'nde.
 *
 * Onay semantiği (PROMPT-v6 §1): Onayla yalnız Kontrol='Onay' yazar, aşama
 * değişmez; sipariş Muhasebe'nin cari onay sırasına düşer.
 */

const STAGES = ['Teklif', 'Siparis', 'Planlama', 'Uretim', 'Hazir', 'Lojistik', 'Tamamlandi', 'Iptal']
const CONTROLS = ['Kontrol', 'Onay', 'Reddet']
const PAYMENTS = ['Ödendi', 'Beklemede']

type TabId = 'pending' | 'approved' | 'search'

interface Filters {
  siparisNo: string
  musteriAd: string   // 'all' | müşteri adı
  ulke: string        // 'all' | ülke adı
  kullaniciID: string // 'all' | id
  odemeDurum: string  // 'all' | Ödendi | Beklemede
  asama: string       // 'all' | stage
  kontrol: string     // 'all' | Kontrol | Onay | Reddet
}

const defaultFilters = (): Filters => ({
  siparisNo: '', musteriAd: 'all', ulke: 'all', kullaniciID: 'all',
  odemeDurum: 'all', asama: 'all', kontrol: 'all',
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
  return p
}

/** Liste satırı — bekleyen (QC DTO) ve arama (OrderListDto) yükleri tek şekle iner. */
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

export function QualityControlPage() {
  const qc = useQueryClient()
  const nav = useNavigate()
  const { toast } = useToast()
  const { confirm } = useConfirm()
  const nextStepLabel = useNextStepLabel()
  const { t } = useTranslation()
  const [params] = useSearchParams()

  const [tab, setTab] = useState<TabId>('pending')
  const [filters, setFilters] = useState<Filters>(defaultFilters())
  const [submitted, setSubmitted] = useState<Filters | null>(null)
  // E-10 — Bekleyen İşler "İşle" → ?sel=NO ile satır seçili açılır.
  const [selected, setSelected] = useState<string | null>(() => params.get('sel'))

  // ── Veri: bekleyenler + son 30 günün onaylıları (legacy KontorlDataGridLoad) ──
  const { data: pending = [], isLoading: pendingLoading, isError: pendingError, dataUpdatedAt, refetch } = useQuery({
    queryKey: ['quality-control'],
    queryFn: getPendingQC,
  })

  // ── Veri: tüm siparişlerde arama ────────────────────────────────────────
  const { data: searchPage, isLoading: searchLoading, isError: searchError } = useQuery({
    queryKey: ['qc-search', submitted],
    queryFn: () => getOrders(buildSearchParams(submitted!)),
    enabled: submitted !== null,
  })

  const rows: KontrolRow[] = useMemo(() => {
    if (tab === 'search') return (searchPage?.items ?? []).filter((r) => !r.silindi).map(fromSearch)
    const want = tab === 'approved' ? 'Onay' : 'Kontrol'
    return pending.map(fromPending).filter((r) => r.kontrol === want)
  }, [tab, searchPage, pending])

  const { data: customers = [] } = useQuery({ queryKey: ['musteriler'], queryFn: getCustomers, enabled: tab === 'search' })
  const { data: ulkeler = [] } = useQuery({ queryKey: ['ulkeler'], queryFn: getUlkeler, enabled: tab === 'search' })
  const { data: users = [] } = useQuery({ queryKey: ['users-lookup'], queryFn: getUsersLookup, enabled: tab === 'search' })

  // Ödenen tutar penceresi ve doğrudan tamamlama için cari değerler.
  const { data: detail } = useQuery({
    queryKey: ['qc-detail', selected],
    queryFn: () => getQCById(selected!),
    enabled: !!selected,
  })

  const [rejectOpen, setRejectOpen] = useState(false)
  const [redNotu, setRedNotu] = useState('')
  const [redTouched, setRedTouched] = useState(false)
  const [expandedNo, setExpandedNo] = useState<string | null>(null)
  const [cariOpen, setCariOpen] = useState(false)
  const [odenenInput, setOdenenInput] = useState<number | ''>('')
  const [onayNotu, setOnayNotu] = useState('')

  // Onay notu isteğe bağlı → kapalı gelir (karar bölgesi ~45 px kısalır, sipariş içeriği uzar).
  const [noteOpen, setNoteOpen] = useState(false)
  useEffect(() => { setOnayNotu(''); setNoteOpen(false) }, [selected])

  const loading = tab === 'search' ? submitted !== null && searchLoading : pendingLoading
  const pendingCount = pending.filter((p) => p.kontrol === 'Kontrol').length
  const capped = tab === 'search' && (searchPage?.items.length ?? 0) >= 200

  // Sekmeye girince (ya da seçili sipariş listeden çıkınca) ilk sipariş seçilir.
  useEffect(() => {
    if (loading) return
    if (selected && rows.some((r) => r.siparisNo === selected)) return
    setSelected(rows[0]?.siparisNo ?? null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, loading])

  const selectedRow = rows.find((r) => r.siparisNo === selected) ?? null

  // Karardan sonra seçim listedeki bir sonraki bekleyen siparişe geçer.
  const refreshAll = (no: string) => {
    void invalidateOrderGraph(qc)
    const i = rows.findIndex((r) => r.siparisNo === no)
    const after = [...rows.slice(i + 1), ...rows.slice(0, Math.max(i, 0))]
    setSelected(after.find((r) => r.kontrol === 'Kontrol' && r.siparisNo !== no)?.siparisNo ?? null)
  }

  // ── Mutasyonlar ─────────────────────────────────────────────────────────
  const approveMut = useMutation({
    mutationFn: (no: string) => approveQC(no, onayNotu.trim() || undefined),
    onSuccess: (_d, no) => {
      refreshAll(no)
      toast({ title: t('qc.approved'), description: no, variant: 'success', popup: true })
    },
    onError: (e) => toastApiError(toast, t('qc.approveFailed'), e),
  })

  const rejectMut = useMutation({
    mutationFn: ({ no, red }: { no: string; red: string }) => rejectQC(no, red),
    onSuccess: (_d, vars) => {
      refreshAll(vars.no); setRejectOpen(false); setRedNotu('')
      toast({ title: t('qc.rejected'), description: vars.no, variant: 'success', popup: true })
    },
    onError: (e) => toastApiError(toast, t('qc.rejectFailed'), e),
  })

  const cariMut = useMutation({
    mutationFn: ({ no, miktar }: { no: string; miktar: number }) => updatePaidAmount(no, miktar),
    onSuccess: (_d, vars) => {
      void invalidateOrderGraph(qc)
      setCariOpen(false)
      toast({ title: t('qc.cariUpdated'), description: vars.no, variant: 'success' })
    },
    onError: (e) => toastApiError(toast, t('common.error'), e),
  })

  // ── Karar ───────────────────────────────────────────────────────────────
  // Onaylı satırda Onayla anlamsız (backend reddeder) → kilitli + sebep.
  const approveBlocked = !selectedRow ? t('qc.selectFirst') : selectedRow.kontrol === 'Onay' ? t('qc.alreadyApproved') : null

  // Fare, O tuşu ve sağ tık aynı etki önizlemeli pencereyi açar.
  const askApprove = async (no: string) => {
    const row = rows.find((r) => r.siparisNo === no)
    if (!row || row.kontrol === 'Onay') return
    const ok = await confirm({
      title: t('qc.approveConfirmTitle'),
      description: `${no} — ${row.musteriAd}`,
      impact: [
        t('qc.impact.approve'),
        ...(no === selected && onayNotu.trim() ? [t('qc.impact.note', { note: onayNotu.trim() })] : []),
      ],
      nextStep: await nextStepLabel(no),
      confirmLabel: t('qc.actions.onayla'),
    })
    if (ok) approveMut.mutate(no)
  }
  const openReject = (no: string) => { setSelected(no); setRedNotu(''); setRedTouched(false); setRejectOpen(true) }
  const openCari = () => { setOdenenInput(detail?.odenenMiktar ?? ''); setCariOpen(true) }

  useHotkeys({
    o: () => { if (selected && !approveBlocked) void askApprove(selected) },
    r: () => { if (selected) openReject(selected) },
  })
  useShortcutHints([
    { keys: '↑↓', label: t('shortcuts.moveRow') },
    { keys: 'O', label: t('shortcuts.qcApprove') },
    { keys: 'R', label: t('shortcuts.qcReject') },
    { keys: 'Enter', label: t('shortcuts.openRow') },
  ])

  // ── Liste kolonları ─────────────────────────────────────────────────────
  const columns: Column<KontrolRow>[] = [
    { key: 'siparisNo', pin: 'left', header: t('qc.grid.siparisNo'), sortable: true, hideable: false,
      render: (r) => <span className="font-mono text-xs">{r.siparisNo}</span> },
    { key: 'musteriAd', truncate: '10rem', header: t('qc.grid.musteriAd'), sortable: true },
    { key: 'mUlke', header: t('qc.grid.ulke'), sortable: true, defaultHidden: true },
    { key: 'toplamFiyat', header: t('qc.grid.toplamSiparis'), sortable: true, type: 'money',
      render: (r) => formatCurrency(r.toplamFiyat ?? 0, r.paraTipi) },
    { key: 'kaparoFiyat', header: t('qc.grid.kaparoBakiyesi'), sortable: true, type: 'money', defaultHidden: true,
      render: (r) => formatCurrency(r.kaparoFiyat, r.paraTipi) },
    { key: 'kalanBakiye', header: t('qc.grid.kalanBakiye'), sortable: true, type: 'money', defaultHidden: true,
      render: (r) => formatCurrency(r.kalanBakiye, r.paraTipi) },
    { key: 'pesinYuzde', header: t('qc.grid.pesinYuzde'), sortable: true, type: 'number', defaultHidden: true },
    { key: 'teslimatCesiti', header: t('qc.grid.teslimatCesiti'), defaultHidden: true,
      render: (r) => r.teslimatCesiti || t('qc.grid.veriYok') },
    { key: 'paraTipi', header: t('qc.grid.paraTipi'), sortable: true, defaultHidden: true },
    { key: 'odemeDurum', header: t('qc.grid.odemeDurumu'), sortable: true, defaultHidden: true,
      render: (r) => <StatusBadge value={r.odemeDurum} context="odeme" /> },
    { key: 'siparisMiTeklifMi', header: t('qc.grid.asama'), sortable: true,
      render: (r) => <StatusBadge value={r.siparisMiTeklifMi} context="stage" /> },
    // Kontrol durumu yalnız aramada: diğer iki sekmede tüm satırlar aynı değeri taşır.
    ...(tab === 'search' ? [{ key: 'kontrol', header: t('qc.grid.kontrolDurumu'), sortable: true,
      render: (r: KontrolRow) => <StatusBadge value={r.kontrol} context="kontrol" /> } satisfies Column<KontrolRow>] : []),
    // Tarih varsayılan gizli: 1366 px'de liste yatay kaymasın (tarih sağdaki sipariş panelinde var).
    { key: 'tarih', header: t('qc.grid.tarih'), sortable: true, type: 'date', defaultHidden: true,
      render: (r) => formatDateShort(r.tarih) },
    { key: 'sirket', header: t('qc.grid.sirket'), sortable: true, defaultHidden: true },
  ]

  const customerOptions = useMemo(
    () => [{ value: 'all', label: t('common.all') }, ...[...customers].sort((a, b) => a.musteriAd.localeCompare(b.musteriAd, 'tr')).map((m) => ({ value: m.musteriAd, label: m.musteriAd, description: m.ulkeAdi }))],
    [customers, t],
  )

  const tabButton = (id: TabId, label: string, count?: number, secondary = false) => (
    <button
      key={id}
      type="button"
      role="tab"
      aria-selected={tab === id}
      onClick={() => { if (tab !== id) { setTab(id); setSelected(null) } }}
      className={cn(
        'inline-flex min-h-ctl-sm items-center gap-2 rounded-md px-3.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        tab === id ? 'bg-primary font-semibold text-primary-foreground'
          : secondary ? 'text-muted-foreground hover:bg-accent hover:text-foreground' : 'font-medium text-foreground hover:bg-accent',
      )}
    >
      {label}
      {count != null && (
        <span className={cn('min-w-[1.5rem] rounded-full px-1.5 text-center text-xs font-semibold tabular-nums',
          tab === id ? 'bg-primary-foreground text-primary' : count > 0 ? 'bg-warning-soft text-warning-soft-foreground' : 'bg-muted text-muted-foreground')}>
          {count}
        </span>
      )}
    </button>
  )

  const emptyMessage = tab === 'search'
    ? (submitted === null ? t('qc.searchPrompt') : t('qc.noResults'))
    : tab === 'approved' ? t('qc.noApproved') : t('qc.noPending')

  return (
    <FillPage>
      {/* 1 — Hangi liste? Sekmeler başlıkla aynı satırda (ayrı satır listeyi ve
          paneli ~55 px kısaltıyordu). */}
      <PageHeader
        density="compact"
        title={t('qc.title')}
        meta={
          <div className="ml-3 flex flex-wrap items-center gap-x-4 gap-y-1">
            <div role="tablist" aria-label={t('qc.listTabs.label')} className="flex flex-wrap items-center gap-1 rounded-lg border bg-card p-0.5">
              {tabButton('pending', t('qc.listTabs.pending'), pendingCount)}
              {tabButton('approved', t('qc.listTabs.approved'))}
              <span className="mx-1 w-px self-stretch bg-border" aria-hidden />
              {tabButton('search', t('qc.listTabs.search'), undefined, true)}
            </div>
            {capped && <span className="text-sm text-warning">{t('qc.capped')}</span>}
          </div>
        }
        // İç denetim — reddedilip satış temsilcisinin düzeltmesini bekleyenler (bir önceki adım).
        actions={<WaitingUpstreamPanel screen="qc" variant="button" />}
      />

      {/* Arama alanları yalnız "Tüm siparişlerde ara" sekmesinde. */}
      {tab === 'search' && (
        <div className="px-4 pt-2">
          <FilterBar
            onSubmit={() => { setSubmitted({ ...filters }); setSelected(null) }}
            submitLabel={t('qc.filter.ara')}
            onReset={() => { setFilters(defaultFilters()); setSubmitted(null); setSelected(null) }}
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
                <SelectTrigger size="sm"><SelectValue /></SelectTrigger>
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
                <SelectTrigger size="sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  {[...ulkeler].sort((a, b) => a.ulkeAdi.localeCompare(b.ulkeAdi, 'tr'))
                    .map((u) => <SelectItem key={u.ulkelerID} value={u.ulkeAdi}>{u.ulkeAdi}</SelectItem>)}
                </SelectContent>
              </Select>
            </FilterField>
            <FilterField label={t('qc.filter.kontrolDurumu')}>
              <Select value={filters.kontrol} onValueChange={(v) => setFilters((f) => ({ ...f, kontrol: v }))}>
                <SelectTrigger size="sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  {CONTROLS.map((c) => <SelectItem key={c} value={c}>{statusLabel(t, c)}</SelectItem>)}
                </SelectContent>
              </Select>
            </FilterField>
            <FilterField label={t('qc.filter.odemeDurumu')}>
              <Select value={filters.odemeDurum} onValueChange={(v) => setFilters((f) => ({ ...f, odemeDurum: v }))}>
                <SelectTrigger size="sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  {PAYMENTS.map((p) => <SelectItem key={p} value={p}>{statusLabel(t, p)}</SelectItem>)}
                </SelectContent>
              </Select>
            </FilterField>
            <FilterField label={t('qc.filter.asama')}>
              <Select value={filters.asama} onValueChange={(v) => setFilters((f) => ({ ...f, asama: v }))}>
                <SelectTrigger size="sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  {STAGES.map((s) => <SelectItem key={s} value={s}>{statusLabel(t, s)}</SelectItem>)}
                </SelectContent>
              </Select>
            </FilterField>
          </FilterBar>
        </div>
      )}

      {/* 2 — Hangi sipariş? (solda)   3 — Sipariş ve karar (sağda, hep açık) */}
      <MasterDetailLayout
        pageId="qc"
        open
        defaultShare={0.47}
        panelLabel={t('qc.panel')}
        title={selectedRow ? <span className="font-mono">{selectedRow.siparisNo}</span> : t('qc.panel')}
        onExpand={selectedRow ? () => setExpandedNo(selectedRow.siparisNo) : undefined}
        list={
          <DataTable
            fill
            rowGoneNotice={false}
            updatedAt={tab === 'search' ? undefined : dataUpdatedAt}
            onRefresh={tab === 'search' ? undefined : () => void refetch()}
            // v2: yeni varsayılan kolon düzeni, eski kayıtlı düzenle ezilmesin.
            tableId="qc-v3"
            exportFileName="kontrol"
            columns={columns}
            data={rows}
            keyField="siparisNo"
            loading={loading}
            error={tab === 'search' ? searchError : pendingError}
            singleLineRows
            emptyMessage={emptyMessage}
            activeRowKey={selected}
            onActiveRowChange={(r) => setSelected(r.siparisNo)}
            onRowActivate={(r) => setExpandedNo(r.siparisNo)}
            // Karar sağ panelde görünür; sağ tık yalnız kısayol.
            actionBar={false}
            rowActions={[
              { key: 'approve', label: t('qc.actions.onayla'), shortcut: 'O', disabled: (r) => r.kontrol === 'Onay', onSelect: (r) => { setSelected(r.siparisNo); void askApprove(r.siparisNo) } },
              { key: 'reject', label: t('qc.actions.reddet'), shortcut: 'R', destructive: true, onSelect: (r) => openReject(r.siparisNo) },
              { key: 'revise', label: t('qc.actions.revizeEt'), separatorBefore: true, onSelect: (r) => nav('/orders/new?revise=' + encodeURIComponent(r.siparisNo)) },
            ]}
          />
        }
        detail={!selectedRow ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-10 text-center text-muted-foreground">
            <MousePointerClick className="h-8 w-8" aria-hidden />
            <p className="text-sm">{t('qc.selectHint')}</p>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            {/* Siparişin kendisi: genel, kalemler, şartlar, geçmiş (kayar). */}
            <OrderDetailPanel key={selectedRow.siparisNo} embedded siparisNo={selectedRow.siparisNo}
              // Seyrek işlemler sipariş detayının tek "Diğer işlemler" menüsünde.
              extraActions={[
                { key: 'revise', label: t('qc.actions.revizeEt'), onSelect: () => nav('/orders/new?revise=' + encodeURIComponent(selectedRow.siparisNo)) },
                { key: 'cari', label: t('qc.actions.cariGuncelle'), onSelect: openCari },
              ]} />

            {/* Karar bölgesi (sabit): onay notu + tek ana buton; Reddet ayraçla ayrı. */}
            <div className="shrink-0 space-y-2 border-t bg-card px-4 py-3">
              {selectedRow.kontrol !== 'Onay' && (noteOpen ? (
                <FormField label={<>{t('qc.approveNoteLabel')}<span className="font-normal text-muted-foreground"> · {t('accApproval.step.optional')}</span></>}>
                  <Input autoFocus value={onayNotu} onChange={(e) => setOnayNotu(e.target.value)} placeholder={t('qc.approveNotePlaceholder')} />
                </FormField>
              ) : (
                <button type="button" onClick={() => setNoteOpen(true)}
                  className="inline-flex items-center gap-1 rounded text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Plus className="h-4 w-4" aria-hidden />
                  {t('qc.addApproveNote')}
                  <span className="font-normal text-muted-foreground">· {t('accApproval.step.optional')}</span>
                </button>
              ))}
              <div className="flex items-start gap-3">
                <Button size="lg" loading={approveMut.isPending} disabled={!!approveBlocked} disabledReason={approveBlocked}
                  wrapperClassName="min-w-0 flex-1" className="w-full" title="O"
                  onClick={() => void askApprove(selectedRow.siparisNo)}>
                  {t('qc.actions.onayla')}
                </Button>
                <span className="w-px self-stretch bg-border" aria-hidden />
                <Button size="lg" variant="outline" className="text-danger" title="R" onClick={() => openReject(selectedRow.siparisNo)}>
                  {t('qc.actions.reddet')}
                </Button>
              </div>
            </div>
          </div>
        )}
      />

      {/* ── Reddet penceresi (legacy KontrolRed formu) ─────────────────── */}
      <Dialog open={rejectOpen} onOpenChange={(o) => { if (!o) { setRejectOpen(false); setRedNotu('') } }}>
        <DialogContent>
          {/* Ctrl+Enter gönderir; boş gerekçe satır içi hata verir. */}
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
              {selectedRow && <DialogDescription>{selectedRow.musteriAd}</DialogDescription>}
            </DialogHeader>
            <div className="rounded-md border bg-muted p-3 text-sm">
              <p className="font-semibold">{t('confirm.impactTitle')}</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                <li>{t('qc.impact.reject')}</li>
              </ul>
              <p className="mt-2"><span className="font-semibold">{t('confirm.nextStep')}:</span> {t('workflow.steps.temsilciDuzeltme')}</p>
            </div>
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
            <DialogFooter className="gap-2 sm:justify-between">
              <Button type="button" variant="outline" onClick={() => setRejectOpen(false)}>{t('common.cancel')}</Button>
              <Button type="submit" variant="destructive" loading={rejectMut.isPending} title="Ctrl+Enter">
                {t('common.reject')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Ödenen tutarı güncelle (eski "Cari" sekmesi) ───────────────── */}
      <Dialog open={cariOpen} onOpenChange={setCariOpen}>
        <DialogContent size="sm">
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault()
            if (!selected || odenenInput === '' || odenenInput < 0) { toast({ title: t('qc.invalidPaidAmount'), variant: 'warning' }); return }
            cariMut.mutate({ no: selected, miktar: odenenInput })
          }}>
            <DialogHeader>
              <DialogTitle>{t('qc.actions.cariGuncelle')} — {selected}</DialogTitle>
              {selectedRow && <DialogDescription>{selectedRow.musteriAd}</DialogDescription>}
            </DialogHeader>
            {detail && (
              <dl className="space-y-1 rounded-md border bg-muted p-3 text-sm">
                <div className="flex justify-between gap-4"><dt>{t('qc.fields.siparisToplam')}</dt><dd className="tabular-nums">{formatCurrency(detail.toplamFiyat ?? 0, detail.paraTipi)}</dd></div>
                <div className="flex justify-between gap-4"><dt>{t('qc.fields.odenenBakiye')}</dt><dd className="tabular-nums">{formatCurrency(detail.odenenMiktar ?? 0, detail.paraTipi)}</dd></div>
              </dl>
            )}
            <FormField label={t('qc.cariNewAmount')}>
              <DecimalInput autoFocus value={odenenInput} onValueChange={setOdenenInput} />
            </FormField>
            <DialogFooter className="gap-2 sm:justify-between">
              <Button type="button" variant="outline" onClick={() => setCariOpen(false)}>{t('common.cancel')}</Button>
              <Button type="submit" loading={cariMut.isPending}>{t('common.save')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Tam ekran / Enter — sipariş detayı büyük pencerede. */}
      <OrderDetailModal siparisNo={expandedNo} onClose={() => setExpandedNo(null)} />
    </FillPage>
  )
}

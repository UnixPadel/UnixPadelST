import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getPendingQC, getQCById, approveQC, rejectQC } from '@/api/qualityControl'
import {
  getOrders, updatePaidAmount, updateStage, downloadAttachment, downloadExcel,
  type OrderFilter,
} from '@/api/orders'
import { getTransactionsForOrder } from '@/api/accounting'
import { getCustomers, getUlkeler } from '@/api/customers'
import { getUsersLookup } from '@/api/users'
import { DataTable, type Column } from '@/components/DataTable'
import { DecimalInput } from '@/components/DecimalInput'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ToastProvider'
import { describeApiError } from '@/lib/axios'
import { formatDate, formatCurrency, cn } from '@/lib/utils'
import type { OrderListDto, QualityControlListDto } from '@/types'

/**
 * PROMPT-v4 — Kontrol ekranı (legacy Kontrol.cs / KontrolRed.cs 1:1 parity).
 *
 * Erişim: yalnız elshan.rasulov (route RoleGuard + tüm backend mutasyon gate'leri).
 * Tek sayfa, 1920×1080'de sayfa scroll'u YOK — yalnız master grid, Detay listesi,
 * Ürün&Bileşen ve Muhasebe Geçmişi kendi içinde kayar.
 *
 * Bilinçli legacy sapması (§5.1): Onayla → Kontrol='Onay' + SiparisMiTeklifMi='Planlama'
 * (sipariş Muhasebe beklemeden doğrudan Fabrika kuyruğuna düşer).
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
  baslangic: string
  bitis: string
}

function tomorrowISO(): string {
  return new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)
}

const defaultFilters = (baslangic = ''): Filters => ({
  siparisNo: '', musteriAd: 'all', ulke: 'all', kullaniciID: 'all',
  odemeDurum: 'all', asama: 'all', kontrol: 'Kontrol',
  baslangic, bitis: tomorrowISO(),
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
  if (f.baslangic && f.bitis && f.baslangic <= f.bitis) {
    p.baslangicTarih = f.baslangic
    p.bitisTarih = f.bitis
  }
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
  }
}

// ── Kompakt read-only alan (form görünümlü muted input) ───────────────────────

function ROField({ label, value, multiline = false, className }: {
  label: string
  value?: string | null
  multiline?: boolean
  className?: string
}) {
  return (
    <div className={cn('space-y-0.5 min-w-0', className)}>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground truncate">{label}</p>
      {multiline ? (
        <div className="rounded border bg-muted/40 px-1.5 py-1 text-xs whitespace-pre-wrap break-words min-h-[2.5rem] max-h-20 overflow-y-auto">
          {value || '—'}
        </div>
      ) : (
        <div className="rounded border bg-muted/40 px-1.5 py-1 text-xs truncate" title={value ?? undefined}>
          {value || '—'}
        </div>
      )}
    </div>
  )
}

function Block({ title, children, className }: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('rounded-md border p-2 min-w-0', className)}>
      <p className="text-xs font-semibold mb-1.5">{title}</p>
      {children}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function QualityControlPage() {
  const qc = useQueryClient()
  const nav = useNavigate()
  const { toast } = useToast()
  const { t } = useTranslation()

  // ── Filtre + arama state ────────────────────────────────────────────────
  const [filters, setFilters] = useState<Filters>(defaultFilters())
  const [submitted, setSubmitted] = useState<Filters | null>(null)
  const [selected, setSelected] = useState<string | null>(null)

  // ── Veri: varsayılan pending listesi (legacy KontorlDataGridLoad) ───────
  const { data: pending = [], isLoading: pendingLoading } = useQuery({
    queryKey: ['quality-control'],
    queryFn: getPendingQC,
  })

  // ── Veri: filtreli arama (legacy araButtonInTab_Click_1) ────────────────
  const { data: searchPage, isLoading: searchLoading } = useQuery({
    queryKey: ['qc-search', submitted],
    queryFn: () => getOrders(buildSearchParams(submitted!)),
    enabled: submitted !== null,
  })

  // Boş sonuç → toast (legacy MessageBox)
  useEffect(() => {
    if (submitted !== null && searchPage && searchPage.items.length === 0)
      toast({ title: t('qc.noResults'), variant: 'destructive' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchPage])

  // Baş tarih default = pending listesindeki MIN(Tarih) (legacy DataGrid())
  const minTarih = useMemo(
    () => (pending.length > 0
      ? pending.reduce((acc, r) => (r.tarih && r.tarih < acc ? r.tarih : acc), pending[0].tarih).slice(0, 10)
      : ''),
    [pending],
  )
  useEffect(() => {
    if (minTarih) setFilters((f) => (f.baslangic === '' ? { ...f, baslangic: minTarih } : f))
  }, [minTarih])

  const rows: KontrolRow[] = useMemo(
    () => (submitted !== null
      ? (searchPage?.items ?? []).map(fromSearch)
      : pending.map(fromPending)),
    [submitted, searchPage, pending],
  )

  // ── Filtre dropdown kaynakları ──────────────────────────────────────────
  const { data: customers = [] } = useQuery({ queryKey: ['musteriler'], queryFn: getCustomers })
  const { data: ulkeler = [] } = useQuery({ queryKey: ['ulkeler'], queryFn: getUlkeler })
  const { data: users = [] } = useQuery({ queryKey: ['users-lookup'], queryFn: getUsersLookup })

  // ── Seçili sipariş detayı ───────────────────────────────────────────────
  const { data: detail } = useQuery({
    queryKey: ['qc-detail', selected],
    queryFn: () => getQCById(selected!),
    enabled: !!selected,
  })

  const { data: transactions = [] } = useQuery({
    queryKey: ['qc-transactions', selected],
    queryFn: () => getTransactionsForOrder(selected!),
    enabled: !!selected,
  })

  // ── Aksiyon state ───────────────────────────────────────────────────────
  const [rejectOpen, setRejectOpen] = useState(false)
  const [redNotu, setRedNotu] = useState('')
  const [odenenInput, setOdenenInput] = useState<number | ''>('')
  const [asama, setAsama] = useState('')
  const [asamaTarih, setAsamaTarih] = useState(() => new Date().toISOString().slice(0, 10))
  const [asamaNot, setAsamaNot] = useState('')

  // Detay yüklenince cari + fabrika alanlarını doldur
  useEffect(() => {
    setOdenenInput(detail?.odenenMiktar ?? '')
    setAsama('')
    setAsamaTarih(new Date().toISOString().slice(0, 10))
    setAsamaNot(detail?.kontrolNot ?? '')
  }, [detail])

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ['quality-control'] })
    qc.invalidateQueries({ queryKey: ['qc-search'] })
    qc.invalidateQueries({ queryKey: ['qc-detail'] })
    qc.invalidateQueries({ queryKey: ['qc-transactions'] })
    setSelected(null)
  }

  const requireSelection = (): string | null => {
    if (!selected) {
      toast({ title: t('qc.selectFirst'), variant: 'destructive' })
      return null
    }
    return selected
  }

  // ── Mutations ───────────────────────────────────────────────────────────
  const approveMut = useMutation({
    mutationFn: (no: string) => approveQC(no),
    onSuccess: () => { refreshAll(); toast({ title: t('qc.approved') }) },
    onError: (e) => toast({ title: t('qc.approveFailed'), description: describeApiError(e), variant: 'destructive' }),
  })

  const rejectMut = useMutation({
    mutationFn: ({ no, red }: { no: string; red: string }) => rejectQC(no, red),
    onSuccess: () => {
      refreshAll(); setRejectOpen(false); setRedNotu('')
      toast({ title: t('qc.rejected') })
    },
    onError: (e) => toast({ title: t('qc.rejectFailed'), description: describeApiError(e), variant: 'destructive' }),
  })

  const cariMut = useMutation({
    mutationFn: ({ no, miktar }: { no: string; miktar: number }) => updatePaidAmount(no, miktar),
    onSuccess: (_d, vars) => {
      // Cari blok yeniden hesaplansın ama seçim korunup form yerinde kalsın.
      qc.invalidateQueries({ queryKey: ['quality-control'] })
      qc.invalidateQueries({ queryKey: ['qc-search'] })
      qc.invalidateQueries({ queryKey: ['qc-detail', vars.no] })
      qc.invalidateQueries({ queryKey: ['qc-transactions', vars.no] })
      toast({ title: t('qc.cariUpdated') })
    },
    onError: (e) => toast({ title: t('common.error'), description: describeApiError(e), variant: 'destructive' }),
  })

  const stageMut = useMutation({
    mutationFn: ({ no, dto }: { no: string; dto: { asama: string; sTarih: string; kontrolNot?: string } }) =>
      updateStage(no, dto),
    onSuccess: () => { refreshAll(); toast({ title: t('qc.stageSaved') }) },
    onError: (e) => toast({ title: t('common.error'), description: describeApiError(e), variant: 'destructive' }),
  })

  // ── Aksiyon handler'ları ────────────────────────────────────────────────
  const handleApprove = () => {
    const no = requireSelection()
    if (no) approveMut.mutate(no)
  }

  const handleRejectOpen = () => {
    if (requireSelection()) { setRedNotu(''); setRejectOpen(true) }
  }

  const handleRevise = () => {
    const no = requireSelection()
    if (no) nav(`/orders/new?revise=${encodeURIComponent(no)}`)
  }

  const handleCari = () => {
    const no = requireSelection()
    if (!no) return
    if (odenenInput === '' || odenenInput < 0) {
      toast({ title: t('qc.invalidPaidAmount'), variant: 'destructive' })
      return
    }
    cariMut.mutate({ no, miktar: odenenInput })
  }

  const handleStageSave = () => {
    const no = requireSelection()
    if (!no) return
    if (!asama) {
      toast({ title: t('qc.stageRequired'), variant: 'destructive' })
      return
    }
    stageMut.mutate({ no, dto: { asama, sTarih: asamaTarih, kontrolNot: asamaNot.trim() } })
  }

  const handleAttachment = async (type: 'ek' | 'muhasebeek') => {
    const no = requireSelection()
    if (!no) return
    try {
      await downloadAttachment(no, type)
    } catch {
      toast({ title: t('qc.attachmentNotFound'), variant: 'destructive' })
    }
  }

  const handleExcel = async () => {
    const no = requireSelection()
    if (!no) return
    try {
      await downloadExcel(no)
    } catch (e) {
      toast({ title: t('common.error'), description: describeApiError(e), variant: 'destructive' })
    }
  }

  // ── Master grid kolonları (legacy başlıklar birebir) ────────────────────
  const columns: Column<KontrolRow>[] = [
    { key: 'siparisNo', header: t('qc.grid.siparisNo'), sortable: true,
      render: (r) => <span className="font-mono text-xs">{r.siparisNo}</span> },
    { key: 'musteriAd', header: t('qc.grid.musteriAd'), sortable: true },
    { key: 'mUlke', header: t('qc.grid.ulke'), sortable: true },
    { key: 'toplamFiyat', header: t('qc.grid.toplamSiparis'), sortable: true,
      render: (r) => formatCurrency(r.toplamFiyat ?? 0, r.paraTipi) },
    { key: 'kaparoFiyat', header: t('qc.grid.kaparoBakiyesi'), sortable: true,
      render: (r) => formatCurrency(r.kaparoFiyat, r.paraTipi) },
    { key: 'kalanBakiye', header: t('qc.grid.kalanBakiye'), sortable: true,
      render: (r) => formatCurrency(r.kalanBakiye, r.paraTipi) },
    { key: 'pesinYuzde', header: t('qc.grid.pesinYuzde'), sortable: true },
    // Legacy COALESCE(TeslimatÇeşiti, 'Veri Yok')
    { key: 'teslimatCesiti', header: t('qc.grid.teslimatCesiti'),
      render: (r) => r.teslimatCesiti || t('qc.grid.veriYok') },
    { key: 'paraTipi', header: t('qc.grid.paraTipi'), sortable: true },
    { key: 'odemeDurum', header: t('qc.grid.odemeDurumu'), sortable: true,
      render: (r) => r.odemeDurum || '' },
    { key: 'siparisMiTeklifMi', header: t('qc.grid.asama'), sortable: true },
    { key: 'tarih', header: t('qc.grid.tarih'), sortable: true,
      render: (r) => formatDate(r.tarih) },
    { key: 'sirket', header: t('qc.grid.sirket'), sortable: true },
  ]

  // Para birimi etiketi (legacy :2076-2099 sembol eşlemesi formatCurrency içinde)
  const d = detail
  const toplam = d?.toplamFiyat ?? 0
  const odenen = d?.odenenMiktar ?? 0
  const pesinTutar = (toplam * (d?.pesinYuzde ?? 0)) / 100
  const brutKaparo = Math.max(pesinTutar - odenen, 0)
  const siparisBakiye = Math.max(toplam - odenen, 0)

  const sortedTx = useMemo(
    () => [...transactions].sort((a, b) => (b.tarih ?? '').localeCompare(a.tarih ?? '')),
    [transactions],
  )

  const loading = submitted !== null ? searchLoading : pendingLoading

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ── Kompakt başlık ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b px-4 py-2 shrink-0">
        <h1 className="text-base font-semibold">{t('qc.title')}</h1>
        <p className="text-xs text-muted-foreground">{t('qc.pendingCount', { count: pending.length })}</p>
      </div>

      {/* ── Filtreme barı (legacy "Filtreme" grubu) ────────────────────── */}
      <div className="border-b px-4 py-2 shrink-0">
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-36">
            <Label className="text-[10px]">{t('qc.filter.siparisNo')}</Label>
            <Input className="h-7 text-xs" value={filters.siparisNo}
              onChange={(e) => setFilters((f) => ({ ...f, siparisNo: e.target.value }))} />
          </div>
          <div className="w-40">
            <Label className="text-[10px]">{t('qc.filter.musteriAdi')}</Label>
            <Select value={filters.musteriAd} onValueChange={(v) => setFilters((f) => ({ ...f, musteriAd: v }))}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                {[...customers].sort((a, b) => a.musteriAd.localeCompare(b.musteriAd, 'tr'))
                  .map((m) => <SelectItem key={m.musteriID} value={m.musteriAd}>{m.musteriAd}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="w-36">
            <Label className="text-[10px]">{t('qc.filter.temsilci')}</Label>
            <Select value={filters.kullaniciID} onValueChange={(v) => setFilters((f) => ({ ...f, kullaniciID: v }))}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.kullaniciID} value={String(u.kullaniciID)}>{u.ad} {u.soyad}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-32">
            <Label className="text-[10px]">{t('qc.filter.ulke')}</Label>
            <Select value={filters.ulke} onValueChange={(v) => setFilters((f) => ({ ...f, ulke: v }))}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                {[...ulkeler].sort((a, b) => a.ulkeAdi.localeCompare(b.ulkeAdi, 'tr'))
                  .map((u) => <SelectItem key={u.ulkelerID} value={u.ulkeAdi}>{u.ulkeAdi}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="w-28">
            <Label className="text-[10px]">{t('qc.filter.kontrolDurumu')}</Label>
            <Select value={filters.kontrol} onValueChange={(v) => setFilters((f) => ({ ...f, kontrol: v }))}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                {CONTROLS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="w-28">
            <Label className="text-[10px]">{t('qc.filter.odemeDurumu')}</Label>
            <Select value={filters.odemeDurum} onValueChange={(v) => setFilters((f) => ({ ...f, odemeDurum: v }))}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                {PAYMENTS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="w-28">
            <Label className="text-[10px]">{t('qc.filter.asama')}</Label>
            <Select value={filters.asama} onValueChange={(v) => setFilters((f) => ({ ...f, asama: v }))}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                {STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="w-32">
            <Label className="text-[10px]">{t('qc.filter.bas')}</Label>
            <Input className="h-7 text-xs" type="date" value={filters.baslangic}
              onChange={(e) => setFilters((f) => ({ ...f, baslangic: e.target.value }))} />
          </div>
          <div className="w-32">
            <Label className="text-[10px]">{t('qc.filter.son')}</Label>
            <Input className="h-7 text-xs" type="date" value={filters.bitis}
              onChange={(e) => setFilters((f) => ({ ...f, bitis: e.target.value }))} />
          </div>
          <Button size="sm" className="h-7" onClick={() => { setSubmitted({ ...filters }); setSelected(null) }}>
            {t('qc.filter.ara')}
          </Button>
          <Button size="sm" variant="outline" className="h-7" onClick={() => {
            // Legacy resetButton_Click → DataGrid(): defaultlar + pending listesi + detay temizliği
            setFilters(defaultFilters(minTarih))
            setSubmitted(null)
            setSelected(null)
          }}>
            {t('qc.filter.reset')}
          </Button>
        </div>
      </div>

      {/* ── Master grid (iç scroll, sayfa scroll'u yok) ────────────────── */}
      <div className="shrink-0 px-4 pt-2 h-[36vh] min-h-[200px]">
        <div className="h-full overflow-auto rounded-md">
          <DataTable
            columns={columns}
            data={rows}
            keyField="siparisNo"
            loading={loading}
            onRowClick={(r) => setSelected(r.siparisNo)}
            rowClassName={(r) => cn(
              // Legacy siparisAlDataGrid_CellFormatting: OdemeDurum != 'Beklemede' → sarı/siyah
              (r.odemeDurum ?? '') !== 'Beklemede' && 'bg-yellow-200 text-black hover:bg-yellow-300 dark:bg-yellow-200 dark:text-black',
              selected === r.siparisNo && 'outline outline-2 -outline-offset-2 outline-primary',
            )}
          />
        </div>
      </div>

      {/* ── Detay paneli ───────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-hidden px-4 py-2">
        {!selected || !d ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            {t('qc.emptyHint')}
          </div>
        ) : (
          <div className="flex h-full flex-col gap-2 min-h-0">
            {/* Üç kolon */}
            <div className="grid grid-cols-3 gap-2 min-h-0 flex-1 overflow-hidden">
              {/* 1 — Satış Temsilcisi + Müşteri */}
              <div className="flex flex-col gap-2 min-h-0 overflow-y-auto pr-0.5">
                <Block title={t('qc.blocks.satisTemsilcisi')}>
                  <div className="grid grid-cols-2 gap-1.5">
                    <ROField label={t('qc.fields.temsilciAdi')} value={d.kullaniciAdi} />
                    <ROField label={t('qc.fields.telefon')} value={d.sTelefon} />
                    <ROField label={t('qc.fields.fax')} value={d.sFax} />
                    <ROField label={t('qc.fields.web')} value={d.sWeb} />
                    <ROField label={t('qc.fields.email')} value={d.sE_Mail} />
                    <ROField label={t('qc.fields.vat')} value={d.sVatNumarasi} />
                    <ROField label={t('qc.fields.ulke')} value={d.sUlke} />
                    <ROField label={t('qc.fields.adres')} value={d.sAdres} multiline className="col-span-2" />
                  </div>
                </Block>
                <Block title={t('qc.blocks.musteri')}>
                  <div className="grid grid-cols-2 gap-1.5">
                    <ROField label={t('qc.fields.isim')} value={d.musteriAd} />
                    <ROField label={t('qc.fields.telefon')} value={d.mTelefon} />
                    <ROField label={t('qc.fields.ulke')} value={d.mUlke} />
                    <ROField label={t('qc.fields.zipKodu')} value={d.mZipKod} />
                    <ROField label={t('qc.fields.email')} value={d.mMail} />
                    <ROField label={t('qc.fields.vat')} value={d.mVATNumarasi} />
                    <ROField label={t('qc.fields.adres')} value={d.mAdres} multiline className="col-span-2" />
                  </div>
                </Block>
              </div>

              {/* 2 — Teslimat + Detay listesi */}
              <div className="flex flex-col gap-2 min-h-0 overflow-hidden">
                <div className="overflow-y-auto min-h-0">
                  <Block title={t('qc.blocks.teslimatDetaylari')}>
                    <div className="grid grid-cols-2 gap-1.5">
                      <ROField label={t('qc.fields.teslimAlanAdi')} value={d.tTeslimAlanAdi} />
                      <ROField label={t('qc.fields.ilgiliKisi')} value={d.tIlgiliKisi} />
                      <ROField label={t('qc.fields.ulke')} value={d.tUlke} />
                      <ROField label={t('qc.fields.telefon')} value={d.tTelefon} />
                      <ROField label={t('qc.fields.altTelefon')} value={d.tAltTelefon} />
                      <ROField label={t('qc.fields.email')} value={d.tE_Mail} />
                      <ROField label={t('qc.fields.zipKodu')} value={d.tZipKod} />
                      <ROField label={t('qc.fields.vat')} value={d.tVATNumarasi} />
                      <ROField label={t('qc.fields.adres')} value={d.tAdres} multiline className="col-span-2" />
                      <div className="col-span-2 flex flex-wrap items-center gap-3 text-xs">
                        <label className="flex items-center gap-1">
                          <input type="checkbox" checked={d.montajVar} disabled /> {t('qc.fields.montaj')}
                        </label>
                        <label className="flex items-center gap-1">
                          <input type="checkbox" checked={d.teslimatVar} disabled /> {t('qc.fields.teslimat')}
                        </label>
                        <span>{t('qc.fields.montajFiyati')}: {formatCurrency(d.montajFiyat ?? 0, d.paraTipi)}</span>
                        <span>{t('qc.fields.teslimatFiyati')}: {formatCurrency(d.teslimatFiyat ?? 0, d.paraTipi)}</span>
                        <span>{t('qc.fields.teslimatCesidi')}: {d.teslimatCesiti || t('qc.grid.veriYok')}</span>
                      </div>
                    </div>
                  </Block>
                </div>
                <Block title={t('qc.blocks.detay')} className="flex-1 min-h-0 flex flex-col">
                  <div className="flex-1 min-h-[4rem] overflow-y-auto rounded border">
                    {d.details.length === 0 ? (
                      <p className="p-2 text-xs text-muted-foreground">{t('common.noData')}</p>
                    ) : (
                      <ul className="divide-y">
                        {d.details.map((line, i) => (
                          <li key={i} className="px-2 py-1 text-xs">{line}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </Block>
              </div>

              {/* 3 — Cari Bilgiler + Kontrol Durumu aksiyonları */}
              <div className="flex flex-col gap-2 min-h-0 overflow-y-auto pr-0.5">
                <Block title={t('qc.blocks.cariBilgiler')}>
                  <div className="grid grid-cols-2 gap-1.5">
                    <ROField label={t('qc.fields.siparisToplam')} value={formatCurrency(toplam, d.paraTipi)} />
                    <ROField label={t('qc.fields.paraBirimi')} value={d.paraTipi} />
                    <ROField label={t('qc.fields.pesinYuzde')} value={`%${d.pesinYuzde}`} />
                    <ROField label={t('qc.fields.indirimYuzde')} value={d.indirim != null ? String(d.indirim) : ''} />
                    <ROField label={t('qc.fields.kaparoBakiye')} value={formatCurrency(brutKaparo, d.paraTipi)} />
                    <ROField label={t('qc.fields.siparisBakiye')} value={formatCurrency(siparisBakiye, d.paraTipi)} />
                    <div className="space-y-0.5">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t('qc.fields.odenenBakiye')}</p>
                      <DecimalInput className="h-7 text-xs" value={odenenInput} onValueChange={setOdenenInput} />
                    </div>
                    <div className="flex items-end">
                      <Button size="sm" variant="outline" className="h-7 w-full text-xs"
                        disabled={cariMut.isPending} onClick={handleCari}>
                        {t('qc.actions.cariGuncelle')}
                      </Button>
                    </div>
                    <ROField label={t('qc.fields.siparisNo')} value={d.siparisNo} />
                    <ROField label={t('qc.fields.not')} value={d.siparisNotu} multiline className="col-span-2" />
                  </div>
                </Block>

                <Block title={t('qc.blocks.kontrolDurumu')}>
                  <div className="grid grid-cols-2 gap-1.5">
                    <Button size="sm" className="h-7 text-xs" disabled={approveMut.isPending} onClick={handleApprove}>
                      {t('qc.actions.onayla')}
                    </Button>
                    <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={handleRejectOpen}>
                      {t('qc.actions.reddet')}
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleRevise}>
                      {t('qc.actions.revizeEt')}
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleExcel}>
                      {t('qc.actions.excelYaz')}
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleAttachment('ek')}>
                      {t('qc.actions.saticiEk')}
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleAttachment('muhasebeek')}>
                      {t('qc.actions.muhasebeEk')}
                    </Button>
                  </div>
                </Block>

                {/* Fabrika grubu (legacy Aşama + Bitiş + Not + Kaydet) */}
                <Block title={t('qc.blocks.fabrika')}>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="space-y-0.5">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t('qc.fields.asama')}</p>
                      <Select value={asama || undefined} onValueChange={setAsama}>
                        <SelectTrigger className="h-7 text-xs"><SelectValue placeholder={t('common.select')} /></SelectTrigger>
                        <SelectContent>
                          {STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t('qc.fields.bitis')}</p>
                      <Input className="h-7 text-xs" type="date" value={asamaTarih}
                        onChange={(e) => setAsamaTarih(e.target.value)} />
                    </div>
                    <div className="col-span-2 space-y-0.5">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t('qc.fields.not')}</p>
                      <Input className="h-7 text-xs" value={asamaNot}
                        onChange={(e) => setAsamaNot(e.target.value)} />
                    </div>
                    <Button size="sm" className="col-span-2 h-7 text-xs"
                      disabled={stageMut.isPending} onClick={handleStageSave}>
                      {t('qc.actions.kaydet')}
                    </Button>
                  </div>
                </Block>
              </div>
            </div>

            {/* Alt şerit: Ürün & Bileşen + Muhasebe Geçmişi */}
            <div className="grid grid-cols-2 gap-2 h-44 shrink-0 min-h-0">
              <Block title={t('qc.blocks.urunBilesen')} className="flex flex-col min-h-0">
                <div className="flex-1 overflow-auto rounded border">
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
                      {d.items.length === 0 ? (
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
              </Block>

              <Block title={t('qc.blocks.muhasebeGecmisi')} className="flex flex-col min-h-0">
                <div className="flex-1 overflow-auto rounded border">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-muted/80">
                      <tr>
                        <th className="px-2 py-1 text-left font-medium">{t('qc.tx.musteriAdi')}</th>
                        <th className="px-2 py-1 text-left font-medium">{t('qc.tx.ulke')}</th>
                        <th className="px-2 py-1 text-left font-medium">{t('qc.tx.temsilci')}</th>
                        <th className="px-2 py-1 text-left font-medium">{t('qc.tx.paraTuru')}</th>
                        <th className="px-2 py-1 text-right font-medium">{t('qc.tx.odenenBakiye')}</th>
                        <th className="px-2 py-1 text-left font-medium">{t('qc.tx.tarih')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedTx.length === 0 ? (
                        <tr><td colSpan={6} className="px-2 py-2 text-muted-foreground">{t('common.noData')}</td></tr>
                      ) : sortedTx.map((tx) => (
                        <tr key={tx.id} className="border-t">
                          <td className="px-2 py-1">{d.musteriAd}</td>
                          <td className="px-2 py-1">{d.mUlke ?? ''}</td>
                          <td className="px-2 py-1">{d.kullaniciAdi ?? ''}</td>
                          <td className="px-2 py-1">{d.paraTipi}</td>
                          <td className="px-2 py-1 text-right">{formatCurrency(tx.odenenMiktar ?? 0, d.paraTipi)}</td>
                          <td className="px-2 py-1">{formatDate(tx.tarih)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Block>
            </div>
          </div>
        )}
      </div>

      {/* ── Reddet dialog'u (legacy KontrolRed formu) ──────────────────── */}
      <Dialog open={rejectOpen} onOpenChange={(o) => { if (!o) { setRejectOpen(false); setRedNotu('') } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('qc.rejectTitle')} — {selected}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>{t('qc.rejectNote')}</Label>
            <Textarea
              placeholder={t('qc.rejectPlaceholder')}
              value={redNotu}
              onChange={(e) => setRedNotu(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>{t('common.cancel')}</Button>
            <Button
              variant="destructive"
              disabled={!redNotu.trim() || rejectMut.isPending}
              onClick={() => rejectMut.mutate({ no: selected!, red: redNotu })}
            >
              {t('common.reject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getPendingQC, getQCById, approveQC, rejectQC } from '@/api/qualityControl'
import {
  getOrders, updatePaidAmount, downloadAttachment, downloadExcel,
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
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ToastProvider'
import { describeApiError } from '@/lib/axios'
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

  // PROMPT-v7 §4 — Muhasebe Geçmişi sekmesi Kontrol ekranından kaldırıldı;
  // qc-transactions query'si ve sortedTx memo'su da gitti. (Burcu ekranı
  // aynı endpoint'i kendi acc-approval-tx query'siyle kullanmaya devam eder.)

  // ── Aksiyon state ───────────────────────────────────────────────────────
  const [rejectOpen, setRejectOpen] = useState(false)
  const [redNotu, setRedNotu] = useState('')
  const [formNo, setFormNo] = useState<string | null>(null)
  const [odenenInput, setOdenenInput] = useState<number | ''>('')

  // Round-Next §11 — splitter ARTIK ÜST bölgenin yüksekliğini ayarlar (eskiden
  // grid'i sabitliyordu; üst h-auto + sayfa scroll'u yüzünden tablo yalnız aşağı
  // uzuyor, yukarı çıkmıyordu). topH=null → üst doğal yükseklik, grid flex-1 kalanı
  // doldurur. Sürüklenince üst sabitlenir; yukarı çekince üst küçülür, grid yukarı
  // çıkar ve satır sayısı artar (boş alan kalmaz; container overflow-hidden).
  const [topH, setTopH] = useState<number | null>(null)
  const topRef = useRef<HTMLDivElement>(null)

  const startSplitterDrag = (e: React.PointerEvent) => {
    e.preventDefault()
    const startY = e.clientY
    const startH = topRef.current?.getBoundingClientRect().height ?? 240
    const onMove = (ev: PointerEvent) => {
      // Yukarı çekilince (dy<0) üst küçülür → grid büyür ve yukarı çıkar.
      const dy = ev.clientY - startY
      setTopH(Math.min(Math.max(startH + dy, 72), window.innerHeight - 220))
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  // Detay yüklenince cari alanını doldur
  useEffect(() => {
    setOdenenInput(detail?.odenenMiktar ?? '')
  }, [detail])

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ['quality-control'] })
    qc.invalidateQueries({ queryKey: ['qc-search'] })
    qc.invalidateQueries({ queryKey: ['qc-detail'] })
    qc.invalidateQueries({ queryKey: ['my-orders'] })
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
      qc.invalidateQueries({ queryKey: ['my-orders'] })
      toast({ title: t('qc.cariUpdated') })
    },
    onError: (e) => toast({ title: t('common.error'), description: describeApiError(e), variant: 'destructive' }),
  })

  // PROMPT-v6 §2 — Fabrika kartı (stage mutasyonu) UI'dan kaldırıldı;
  // backend PUT /api/orders/{no}/stage endpoint'i dokunulmadı.

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

  // PROMPT-v5 §1 — legacy buttonFormGetir_Click: salt-okunur sipariş formu görüntüleyici.
  const handleFormGetir = () => {
    const no = requireSelection()
    if (no) setFormNo(no)
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
      render: (r) => statusLabel(t, r.odemeDurum) },
    { key: 'siparisMiTeklifMi', header: t('qc.grid.asama'), sortable: true,
      render: (r) => statusLabel(t, r.siparisMiTeklifMi) },
    // §6 — yoğun grid: kısa tarih (dd.MM.yy)
    { key: 'tarih', header: t('qc.grid.tarih'), sortable: true,
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

  return (
    // Round-Next §11 — sabit-viewport bölünmüş düzen: container overflow-hidden;
    // üst bölge (topH, kendi içinde kayar) ile grid (flex-1) viewport'u paylaşır,
    // sayfa dikeyde kaymaz. Splitter yukarı çekilince grid gerçekten yukarı çıkar.
    <div className="flex h-full flex-col overflow-hidden">
      {/* ── Kompakt başlık ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b px-4 py-2 shrink-0">
        <h1 className="text-base font-semibold">{t('qc.title')}</h1>
        <p className="text-xs text-muted-foreground">{t('qc.pendingCount', { count: pending.length })}</p>
      </div>

      {/* ── Üst bölge: üç panel (PROMPT-v6 §2 — Fabrika kartı kalktı) ───
           Bölge aktif sekmenin doğal yüksekliğine oturur (h-auto, iç scroll
           yok). Paneller seçim olmasa da hep görünür; alanlar '—' gösterir,
           aksiyonlar select-first toast'ını atar. */}
      <div
        ref={topRef}
        className="flex shrink-0 items-stretch gap-2 overflow-y-auto px-4 py-1.5"
        style={topH !== null ? { height: topH } : undefined}
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
              <div className="mx-auto max-w-md space-y-1.5 pt-1">
                <p className="text-sm font-semibold text-center">{t('qc.blocks.cariBilgiler')}</p>
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
                  <DecimalInput className="h-7 text-xs" value={odenenInput} onValueChange={setOdenenInput} />
                </CariRow>
                <div className="mx-auto flex w-full max-w-[220px] flex-col gap-1.5 pt-2">
                  <Button size="sm" className="h-7 text-xs" disabled={cariMut.isPending} onClick={handleCari}>
                    {t('qc.actions.cariGuncelle')}
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleRevise}>
                    {t('qc.actions.revizeEt')}
                  </Button>
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
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={d?.montajVar ?? false} disabled /> {t('qc.fields.montaj')}
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={d?.teslimatVar ?? false} disabled /> {t('qc.fields.teslimat')}
                  </label>
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
        <div className="flex w-[300px] shrink-0 flex-col gap-1.5 rounded-md border p-2">
          <p className="text-sm font-semibold text-center">{t('qc.title')}</p>
          <div className="space-y-0.5">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t('qc.fields.siparisNo')}</p>
            <div className="rounded border bg-muted/40 px-1.5 py-1 font-mono text-xs min-h-[1.6rem]">
              {selected || '—'}
            </div>
          </div>
          <div className="flex flex-1 flex-col space-y-0.5">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t('qc.fields.not')}</p>
            {/* Sipariş notu serbest metin — yalnız bu kutu max-h ile sınırlı
                 (alan-düzeyi sınır; §2'nin hedefi yarım görünen sekmelerdi). */}
            <div className="min-h-[4rem] max-h-24 flex-1 overflow-y-auto whitespace-pre-wrap break-words rounded border bg-muted/40 px-1.5 py-1 text-xs">
              {d?.siparisNotu || '—'}
            </div>
          </div>
          <div className="grid shrink-0 grid-cols-2 gap-1.5">
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleAttachment('ek')}>
              {t('qc.actions.saticiEk')}
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleAttachment('muhasebeek')}>
              {t('qc.actions.muhasebeEk')}
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleExcel}>
              {t('qc.actions.excelYaz')}
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleFormGetir}>
              {t('qc.actions.formGetir')}
            </Button>
            {/* Round-8 §3 — Onayla solda/üstte, Reddet sağda/altta. */}
            <Button size="sm" className="h-7 text-xs" disabled={approveMut.isPending} onClick={handleApprove}>
              {t('qc.actions.onayla')}
            </Button>
            <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={handleRejectOpen}>
              {t('qc.actions.reddet')}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Splitter (PROMPT-v6 §2) — sürükleyince grid yüksekliği değişir ── */}
      <div
        role="separator"
        aria-orientation="horizontal"
        className="mx-4 flex h-2 shrink-0 cursor-row-resize items-center justify-center rounded bg-border/60 hover:bg-border"
        onPointerDown={startSplitterDrag}
      >
        <div className="h-0.5 w-10 rounded bg-muted-foreground/40" />
      </div>

      {/* ── Filtre barı (PROMPT-v7 §4) — gridin hemen üstünde kompakt yatay
           bar; sol dikey Filtreme kartının yerini aldı. Alan seti ve davranış
           (Sipariş No diğerlerini ezer, default Kontrol, Ara/Reset) AYNEN. */}
      <div className="shrink-0 px-4 pb-2">
        <div className="grid grid-cols-2 gap-2 rounded-md border bg-card p-2 md:grid-cols-4 lg:grid-cols-8">
          <div className="space-y-0.5">
            <Label className="text-[10px]">{t('qc.filter.siparisNo')}</Label>
            <Input className="h-8 text-xs" value={filters.siparisNo}
              onChange={(e) => setFilters((f) => ({ ...f, siparisNo: e.target.value }))} />
          </div>
          <div className="space-y-0.5">
            <Label className="text-[10px]">{t('qc.filter.musteriAdi')}</Label>
            <Select value={filters.musteriAd} onValueChange={(v) => setFilters((f) => ({ ...f, musteriAd: v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                {[...customers].sort((a, b) => a.musteriAd.localeCompare(b.musteriAd, 'tr'))
                  .map((m) => <SelectItem key={m.musteriID} value={m.musteriAd}>{m.musteriAd}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-0.5">
            <Label className="text-[10px]">{t('qc.filter.temsilci')}</Label>
            <Select value={filters.kullaniciID} onValueChange={(v) => setFilters((f) => ({ ...f, kullaniciID: v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.kullaniciID} value={String(u.kullaniciID)}>{u.ad} {u.soyad}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-0.5">
            <Label className="text-[10px]">{t('qc.filter.ulke')}</Label>
            <Select value={filters.ulke} onValueChange={(v) => setFilters((f) => ({ ...f, ulke: v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                {[...ulkeler].sort((a, b) => a.ulkeAdi.localeCompare(b.ulkeAdi, 'tr'))
                  .map((u) => <SelectItem key={u.ulkelerID} value={u.ulkeAdi}>{u.ulkeAdi}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-0.5">
            <Label className="text-[10px]">{t('qc.filter.kontrolDurumu')}</Label>
            <Select value={filters.kontrol} onValueChange={(v) => setFilters((f) => ({ ...f, kontrol: v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                {CONTROLS.map((c) => <SelectItem key={c} value={c}>{statusLabel(t, c)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-0.5">
            <Label className="text-[10px]">{t('qc.filter.odemeDurumu')}</Label>
            <Select value={filters.odemeDurum} onValueChange={(v) => setFilters((f) => ({ ...f, odemeDurum: v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                {PAYMENTS.map((p) => <SelectItem key={p} value={p}>{statusLabel(t, p)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-0.5">
            <Label className="text-[10px]">{t('qc.filter.asama')}</Label>
            <Select value={filters.asama} onValueChange={(v) => setFilters((f) => ({ ...f, asama: v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                {STAGES.map((s) => <SelectItem key={s} value={s}>{statusLabel(t, s)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {/* Round-Next §11 — Başlangıç/Bitiş Tarihi filtreleri kaldırıldı. */}
          <div className="col-span-2 flex items-end gap-1.5 md:col-span-2 lg:col-span-1">
            <Button size="sm" variant="outline" className="h-8 flex-1" onClick={() => {
              // Legacy resetButton_Click → DataGrid(): defaultlar + pending listesi + detay temizliği
              setFilters(defaultFilters())
              setSubmitted(null)
              setSelected(null)
            }}>
              {t('qc.filter.reset')}
            </Button>
            <Button size="sm" className="h-8 flex-1" onClick={() => { setSubmitted({ ...filters }); setSelected(null) }}>
              {t('qc.filter.ara')}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Alt bölge: master grid (tam genişlik, iç scroll) ───────────── */}
      <div className="flex-1 min-h-0 px-4 pb-2">
        <div className="h-full overflow-auto rounded-md">
          <DataTable
            columns={columns}
            data={rows}
            keyField="siparisNo"
            loading={loading}
            density="compact"
            onRowClick={(r) => setSelected(r.siparisNo)}
            rowClassName={(r) => cn(
              selected === r.siparisNo && 'outline outline-2 -outline-offset-2 outline-primary',
            )}
          />
        </div>
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

      {/* ── Form'u getir — salt-okunur sipariş formu (legacy buttonFormGetir) ── */}
      <OrderDetailModal siparisNo={formNo} onClose={() => setFormNo(null)} />
    </div>
  )
}

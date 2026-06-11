import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createOrder, createQuote, getCategories, expandRecipe, uploadAttachment,
  getDeliveryAddresses, getComponentsByCategory,
  // PROMPT.md #20: revise wire-up — pre-load + swap save mutation.
  getOrderDetail, reviseOrder,
  // PROMPT-v3 §6: Formu Getir — kendi siparişlerinden seçip forma yükleme.
  getMyOrders,
} from '@/api/orders'
import { getCustomers, getUlkeler } from '@/api/customers'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DecimalInput } from '@/components/DecimalInput'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ToastProvider'
import { FieldError } from '@/components/FieldError'
import type { CreateOrderDto, OrderDetail, OrderSetInput } from '@/types'

const PARA_TIPLERI_RADIO = ['Euro', 'Dolar', 'TL'] as const
const PARA_TIPLERI_DIGER = ['Sterlin'] as const
const SIRKETLER = ['Unixpadel', 'ArsSport', 'AselCocuk'] as const

// PROMPT-v3 §4.1: legacy teslimatCesiti1 combobox seçenekleri — sıra birebir.
const INCOTERMS = ['EXW', 'FCA', 'CPT', 'CIP', 'DAT', 'DAP', 'DDP', 'FAS', 'FOB', 'MCFR', 'CIF', 'CFR', 'CNF'] as const

/** Currency symbol for any selected paraTipi (Euro/Dolar/TL/Sterlin). */
function currencySymbol(paraTipi: string): string {
  switch (paraTipi) {
    case 'Euro':    return '€'
    case 'Dolar':   return '$'
    case 'TL':      return '₺'
    case 'Sterlin': return '£'
    default:        return ''
  }
}

const SET_COUNT = 5 // Legacy Sipariş 1..5

const blank = (): CreateOrderDto => ({
  musteriAd: '', siparisNotu: '',
  sTelefon: '', sFax: '', sWeb: '', sE_Mail: '', sVatNumarasi: '', sUlke: '', sAdres: '',
  montajVar: false, montajFiyat: 0, mAdet: 1,
  teslimatVar: false, teslimatFiyat: 0, mTeslimat: 1,
  teslimatCesiti: '', tTeslimAlanAdi: '', tIlgiliKisi: '',
  tTelefon: '', tAltTelefon: '', tE_Mail: '', tVATNumarasi: '', tZipKod: '', tUlke: '', tAdres: '',
  mTelefon: '', mMail: '', mUlke: '', mVATNumarasi: '', mZipKod: '', mAdres: '',
  // PROMPT-v2 §3: İndirim/KDV/Peşin başlangıçta boş — "henüz karar vermedi"
  // semantiği. Backend null → 0 coercion'ını total hesaplamada uygular.
  paraTipi: 'Euro', indirim: null, kdv: null, pesinYuzde: null,
  sets: [], details: [], sirket: 'Unixpadel',
})

/**
 * PROMPT-v2 §1b: Bileşen tablosunda her satırın editlenebilir state'i.
 * Adet ve Birim Fiyat kullanıcı tarafından değiştirilir; Toplam computed.
 * PROMPT-v3 §2.3: defaultAdet saklanır — ürün adedi spinner'ı değişince
 * her satırın Adet'i defaultAdet × ürünAdedi olarak yeniden hesaplanır.
 */
interface ComponentRow {
  bilesenID: number
  bilesenAdi: string
  birim: string
  oznitelikSecili: string
  oznitelikSecenekler: string[]
  adet: number
  birimFiyat: number
  defaultAdet: number
}

/**
 * PROMPT-v3 §2.2: bilesenCheckedListBox satırı — kategori seçilince TÜM
 * bileşenler listelenir, reçetede olanlar (inRecipe) ön-işaretli gelir.
 */
interface ChecklistItem {
  bilesenID: number
  bilesenAdi: string
  birim: string
  inRecipe: boolean
  defaultAdet: number
  defaultFiyat: number
  attributes: string[]
  checked: boolean
}

/** Local UI state for the Sipariş 1..5 tabs (legacy "Çarp" → push set). */
interface SetTabState {
  kategoriID: number | null
  kategoriAdi: string     // §2.4 öznitelik auto-default kuralları kategori adına bakar
  kategoriFiyat: number   // tekil fiyat
  adet: number
  checklist: ChecklistItem[]
  // PROMPT-v3 §2.3: grid = checklist'te işaretli satırlar.
  // Çarp basılınca form.sets[i].components'a kopyalanır.
  components: ComponentRow[]
}
const emptySetTab = (): SetTabState =>
  ({ kategoriID: null, kategoriAdi: '', kategoriFiyat: 0, adet: 1, checklist: [], components: [] })

/**
 * PROMPT-v3 §2.4: legacy OznitelikDegistir auto-default kuralları.
 * Dal sırası legacy ile birebir: cam → powder painting → fence-typo.
 * Not: doğru yazımlı "fence powder painting" legacy'de olduğu gibi
 * "powder painting" dalına düşer; typo'lu "fence powder paiting" son dala.
 * Auto değer seçenekler arasında yoksa ekstra option olarak enjekte edilir.
 */
function autoOznitelik(
  kategoriAdi: string, bilesenAdi: string, attributes: string[],
): { secili: string; secenekler: string[] } {
  let auto = ''
  if (bilesenAdi.includes('temperred glass by EN and ISO warranty')) {
    if (kategoriAdi === 'Standard Padel Court')        auto = '10mm'
    else if (kategoriAdi === 'Panoramic Padel Court')  auto = '12mm'
  } else if (bilesenAdi.includes('powder painting')) {
    if (kategoriAdi === 'Standard Padel Court')        auto = 'metalic structure Black 80x60x3mm'
    else if (kategoriAdi === 'Panoramic Padel Court')  auto = 'metalic structure Black 80x80x3mm'
  } else if (bilesenAdi.includes('fence powder paiting') || bilesenAdi.includes('fence powder painting')) {
    auto = 'fence structure 50x50 black'
  }
  const secenekler = auto && !attributes.includes(auto) ? [...attributes, auto] : attributes
  return { secili: auto || attributes[0] || '', secenekler }
}

/** §2.3: yeni işaretlenen checklist satırından grid satırı üretir. */
function buildRow(item: ChecklistItem, kategoriAdi: string, urunAdedi: number): ComponentRow {
  const { secili, secenekler } = autoOznitelik(kategoriAdi, item.bilesenAdi, item.attributes)
  return {
    bilesenID:           item.bilesenID,
    bilesenAdi:          item.bilesenAdi,
    birim:               item.birim,
    oznitelikSecili:     secili,
    oznitelikSecenekler: secenekler,
    adet:                item.defaultAdet * urunAdedi,
    birimFiyat:          item.defaultFiyat,
    defaultAdet:         item.defaultAdet,
  }
}

/**
 * OrderDetail → CreateOrderDto header dolumu. PROMPT.md #20 revise pre-load
 * ile PROMPT-v3 §6 Formu Getir aynı eşlemeyi paylaşır (sets'i çağıran doldurur).
 */
function detailToForm(d: OrderDetail): CreateOrderDto {
  return {
    musteriAd:    d.musteriAd,
    siparisNotu:  d.siparisNotu ?? '',
    sTelefon:     d.sTelefon ?? '',
    sFax:         d.sFax ?? '',
    sWeb:         d.sWeb ?? '',
    sE_Mail:      d.sE_Mail ?? '',
    sVatNumarasi: d.sVatNumarasi ?? '',
    sUlke:        d.sUlke ?? '',
    sAdres:       d.sAdres ?? '',
    montajVar:    d.montajVar,
    montajFiyat:  d.montajFiyat ?? 0,
    mAdet:        d.mAdet,
    teslimatVar:  d.teslimatVar,
    teslimatFiyat: d.teslimatFiyat ?? 0,
    mTeslimat:    d.mTeslimat ?? 1,
    teslimatCesiti: d.teslimatCesiti ?? '',
    tTeslimAlanAdi: d.tTeslimAlanAdi ?? '',
    tIlgiliKisi:  d.tIlgiliKisi ?? '',
    tTelefon:     d.tTelefon ?? '',
    tAltTelefon:  d.tAltTelefon ?? '',
    tE_Mail:      d.tE_Mail ?? '',
    tVATNumarasi: d.tVATNumarasi ?? '',
    tZipKod:      d.tZipKod ?? '',
    tUlke:        d.tUlke ?? '',
    tAdres:       d.tAdres ?? '',
    mTelefon:     d.mTelefon ?? '',
    mMail:        d.mMail ?? '',
    mUlke:        d.mUlke ?? '',
    mVATNumarasi: d.mVATNumarasi ?? '',
    mZipKod:      d.mZipKod ?? '',
    mAdres:       d.mAdres ?? '',
    paraTipi:     d.paraTipi || 'Euro',
    // PROMPT-v2 §3: Kaynak NULL ise boş (null) olarak hidrate edilir.
    indirim:      d.indirim ?? null,
    kdv:          d.kdv ?? null,
    pesinYuzde:   d.pesinYuzde ?? null,
    sirket:       d.sirket ?? 'Unixpadel',
    sets:         [],
    details:      d.details ?? [],
  }
}

export function NewOrderPage() {
  const nav = useNavigate()
  const { t } = useTranslation()
  const { toast } = useToast()
  const { getUser } = useAuth()
  const [params] = useSearchParams()
  const reviseFrom = params.get('revise')

  const user = getUser()
  const temsilciAdSoyad = [user?.ad, user?.soyad].filter(Boolean).join(' ') || user?.kullaniciAdi || ''

  const [form, setForm] = useState<CreateOrderDto>(blank())
  const [createdNo, setCreatedNo] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  // Sipariş 1..5 tab state (per-tab "Tekil Fiyat × Adet" before "Çarp").
  const [setTabs, setSetTabs] = useState<SetTabState[]>(
    () => Array.from({ length: SET_COUNT }, () => emptySetTab()),
  )
  const [ekFileName, setEkFileName] = useState<string>('')

  // ── Revise mode ────────────────────────────────────────────────────────
  // PROMPT.md #20: when ?revise=NO is present we pre-load that order and
  // hydrate the form; save fires reviseOrder instead of createOrder/createQuote.
  const isReviseMode = !!reviseFrom
  const { data: reviseSource, isLoading: reviseLoading } = useQuery({
    queryKey: ['order-detail', reviseFrom],
    queryFn: () => getOrderDetail(reviseFrom!),
    enabled: isReviseMode,
  })
  useEffect(() => {
    if (!reviseSource) return
    setForm(detailToForm(reviseSource))
  }, [reviseSource])

  // ── Data sources ───────────────────────────────────────────────────────
  const { data: customers       = [] } = useQuery({ queryKey: ['customers'],            queryFn: getCustomers })
  const { data: ulkeler         = [] } = useQuery({ queryKey: ['ulkeler'],              queryFn: getUlkeler })
  const { data: categories      = [] } = useQuery({ queryKey: ['order-categories'],     queryFn: getCategories })
  const { data: deliveryAddrs   = [] } = useQuery({ queryKey: ['order-delivery-addrs'], queryFn: getDeliveryAddresses })

  // ── Customer auto-fill (legacy SelectedIndexChanged) ──────────────────
  const onCustomerSelect = (id: number) => {
    const c = customers.find((x) => x.musteriID === id)
    if (!c) return
    setForm((f) => ({
      ...f,
      musteriAd:    c.musteriAd,
      mTelefon:     c.telefon,
      mMail:        c.e_Mail,
      mUlke:        c.ulkeAdi,
      mVATNumarasi: c.vatNumarasi,
      mZipKod:      c.zipKod,
      mAdres:       c.adres,
    }))
  }

  // ── Validation ────────────────────────────────────────────────────────
  const hasLineItems = (form.details?.length ?? 0) > 0 || (form.sets?.length ?? 0) > 0
  const checkValid = (): boolean => {
    setSubmitted(true)
    if (!form.musteriAd.trim()) {
      toast({ title: t('validation.fixErrors'), variant: 'destructive' }); return false
    }
    if (!hasLineItems) {
      toast({ title: t('validation.emptyOrder'), variant: 'destructive' }); return false
    }
    return true
  }

  // ── Save mutations ────────────────────────────────────────────────────
  // PROMPT-v5 §3 — yeni kayıt/revize Siparişlerim listesini değiştirir.
  const queryClient = useQueryClient()
  const orderMut = useMutation({
    mutationFn: () => isReviseMode ? reviseOrder(reviseFrom!, form) : createOrder(form),
    onSuccess: (no) => {
      queryClient.invalidateQueries({ queryKey: ['my-orders'] })
      toast({ title: isReviseMode ? 'Revize edildi' : 'Sipariş oluşturuldu', description: no })
      setCreatedNo(no)
    },
    onError: () => toast({ title: 'Hata', variant: 'destructive' }),
  })
  const quoteMut = useMutation({
    mutationFn: () => isReviseMode ? reviseOrder(reviseFrom!, form) : createQuote(form),
    onSuccess: (no) => {
      queryClient.invalidateQueries({ queryKey: ['my-orders'] })
      toast({ title: isReviseMode ? 'Revize edildi' : 'Teklif oluşturuldu', description: no })
      setCreatedNo(no)
    },
    onError: () => toast({ title: 'Hata', variant: 'destructive' }),
  })
  const expandMut = useMutation({
    mutationFn: ({ no, kategoriId, adet }: { no: string; kategoriId: number; adet: number }) =>
      expandRecipe(no, kategoriId, adet),
    onSuccess: () => toast({ title: 'Reçete açıldı' }),
    onError: () => toast({ title: 'Hata', variant: 'destructive' }),
  })
  const uploadMut = useMutation({
    mutationFn: ({ no, file }: { no: string; file: File }) => uploadAttachment(no, 'ek', file),
    onSuccess: () => toast({ title: 'Ek yüklendi' }),
    onError: () => toast({ title: 'Yükleme başarısız', variant: 'destructive' }),
  })

  const submitOrder = () => { if (checkValid()) orderMut.mutate() }
  const submitQuote = () => { if (checkValid()) quoteMut.mutate() }

  // ── Set tab actions (Çarp / İptal) ────────────────────────────────────
  const updateTab = (idx: number, patch: Partial<SetTabState>) =>
    setSetTabs((s) => s.map((t, i) => i === idx ? { ...t, ...patch } : t))

  /** API bileşen listesini ChecklistItem'lara çevirir (reçetedekiler işaretli). */
  const toChecklist = (list: any[]): ChecklistItem[] =>
    (list ?? []).map((c: any) => ({
      bilesenID:    c.bilesenID,
      bilesenAdi:   c.bilesenAdi ?? '',
      birim:        c.birim ?? '',
      inRecipe:     !!c.inRecipe,
      defaultAdet:  c.defaultAdet ?? 1,
      defaultFiyat: c.defaultFiyat ?? 0,
      attributes:   (c.attributes ?? []) as string[],
      checked:      !!c.inRecipe,
    }))

  /**
   * PROMPT-v3 §2: Legacy anaUrunComboBox_SelectedIndexChanged portu.
   * Kategori seçilince TÜM bileşenler checklist'e yüklenir (reçetedekiler
   * ön-işaretli), grid işaretlilerden yeniden kurulur (ZorlaDegistir=true:
   * eski checklist + tablo temizlenir). Çarp'a kadar payload'a etkisi yok.
   */
  const onCategorySelect = async (idx: number, kategoriID: number) => {
    const cat = categories.find((c) => c.kategoriID === kategoriID)
    const kategoriAdi   = cat?.kategoriAdi ?? ''
    const kategoriFiyat = cat?.fiyat ?? 0
    // Pre-update: kullanıcı UI'ı responsive görsün — bileşenler arkadan gelir.
    updateTab(idx, { kategoriID, kategoriAdi, kategoriFiyat, checklist: [], components: [] })
    try {
      const checklist = toChecklist(await getComponentsByCategory(kategoriID))
      setSetTabs((s) => s.map((t, i) => i !== idx ? t : {
        ...t,
        checklist,
        components: checklist
          .filter((c) => c.checked)
          .map((c) => buildRow(c, kategoriAdi, t.adet)),
      }))
    } catch {
      toast({ title: 'Bileşenler yüklenemedi', variant: 'destructive' })
    }
  }

  /**
   * PROMPT-v3 §2.3: checklist toggle (legacy bilesenCheckedListBox_ItemCheck →
   * RefreshDataGrid). İşaret kalkan satır grid'den düşer; yeni işaretlenen
   * sona eklenir (legacy Rows.Add). Mevcut satırların kullanıcı editleri korunur.
   */
  const toggleComponent = (idx: number, bilesenID: number, checked: boolean) =>
    setSetTabs((s) => s.map((t, i) => {
      if (i !== idx) return t
      const checklist = t.checklist.map((c) => c.bilesenID === bilesenID ? { ...c, checked } : c)
      const components = checked
        ? [...t.components, buildRow(checklist.find((c) => c.bilesenID === bilesenID)!, t.kategoriAdi, t.adet)]
        : t.components.filter((c) => c.bilesenID !== bilesenID)
      return { ...t, checklist, components }
    }))

  /**
   * PROMPT-v3 §2.3: ürün adedi spinner'ı (legacy urunNumericUpDown*_ValueChanged).
   * Her grid satırının Adet'i defaultAdet × ürünAdedi olarak yeniden hesaplanır;
   * satır bazlı manuel Adet editleri bir sonraki spinner değişimine kadar yaşar.
   */
  const onUrunAdetChange = (idx: number, adet: number) =>
    setSetTabs((s) => s.map((t, i) => i !== idx ? t : {
      ...t,
      adet,
      components: t.components.map((c) => ({ ...c, adet: c.defaultAdet * adet })),
    }))

  /** PROMPT-v2 §1b: Tek bir bileşen satırını (Adet / Birim Fiyat / Öznitelik) düzeltir. */
  const updateComponent = (tabIdx: number, rowIdx: number, patch: Partial<ComponentRow>) =>
    setSetTabs((s) => s.map((t, i) => i !== tabIdx ? t : {
      ...t,
      components: t.components.map((c, k) => k === rowIdx ? { ...c, ...patch } : c),
    }))

  /**
   * Legacy "Çarp" button: persists the current tab's selection into form.sets[idx].
   * Components are populated post-save via the "Reçeteden Aç" (expandRecipe) call.
   */
  const carp = (idx: number) => {
    const tab = setTabs[idx]
    if (!tab.kategoriID) {
      toast({ title: 'Ana ürün seçin', variant: 'destructive' })
      return
    }
    // PROMPT-v2 §1b: Editlenmiş bileşen satırları payload'a kopyalanır.
    const set: OrderSetInput = {
      kategoriID:    tab.kategoriID,
      adet:          tab.adet,
      kategoriFiyat: tab.kategoriFiyat,
      components:    tab.components.map((c) => ({
        bilesenID:    c.bilesenID,
        oznitelikAdi: c.oznitelikSecili || undefined,
        adet:         c.adet,
        fiyat:        c.birimFiyat,
      })),
    }
    setForm((f) => {
      const next = [...(f.sets ?? [])]
      next[idx] = set
      return { ...f, sets: next }
    })
    // After-save: if there's already a SiparisNo, expand recipe immediately too.
    if (createdNo) {
      expandMut.mutate({ no: createdNo, kategoriId: tab.kategoriID, adet: tab.adet })
    }
  }

  /** Legacy "İptal" button — clears the current tab and removes its set. */
  const iptalTab = (idx: number) => {
    setSetTabs((s) => s.map((t, i) => i === idx ? emptySetTab() : t))
    setForm((f) => {
      const next = [...(f.sets ?? [])]
      delete next[idx]
      return { ...f, sets: next.filter(Boolean) as OrderSetInput[] }
    })
  }

  // ── Teslimat / Montaj handlers (PROMPT-v3 §3 + §4) ────────────────────
  /**
   * §4.2: Teslim Alan Adı seçilince kayıttan auto-fill (legacy
   * txtTeslimatAd_SelectedIndexChanged). DTO'da ülke `ulkeID` olarak gelir —
   * UlkeAdi'na burada çevrilir (eski `d.ulke` okuması ölü koddu, tUlke hiç dolmuyordu).
   */
  const applyDeliveryAddress = (a: any) => {
    const ulkeAdi = ulkeler.find((u) => u.ulkelerID === (a.ulkeID ?? -1))?.ulkeAdi
    setForm((f) => ({
      ...f,
      tTeslimAlanAdi: a.teslimAlanAdi ?? f.tTeslimAlanAdi,
      tIlgiliKisi:    a.ilgiliKisi   ?? '',
      tTelefon:       a.telefon      ?? '',
      tAltTelefon:    a.altTelefon   ?? '',
      tE_Mail:        a.e_Mail       ?? '',
      tUlke:          ulkeAdi        ?? f.tUlke,
      tZipKod:        a.zipKod       ?? '',
      tVATNumarasi:   a.vatNumarasi  ?? '',
      tAdres:         a.adres        ?? '',
    }))
  }

  /** §3: İlişkilendir (legacy button4_Click) — Müşteri bloğu → Teslimat alanları. */
  const ilisikilendir = () =>
    setForm((f) => ({
      ...f,
      tTeslimAlanAdi: f.musteriAd,
      tIlgiliKisi:    f.musteriAd,
      tTelefon:       f.mTelefon     ?? '',
      tE_Mail:        f.mMail        ?? '',
      tUlke:          f.mUlke        ?? '',
      tZipKod:        f.mZipKod      ?? '',
      tVATNumarasi:   f.mVATNumarasi ?? '',
      tAdres:         f.mAdres       ?? '',
    }))

  /**
   * §4.1: Incoterms seçimi. EXW (legacy teslimatCesiti_SelectedIndexChanged):
   * "Fabrika" adlı kayıtlı teslimat adresi auto-seçilir + teslimatFiyat = 0.
   */
  const onTeslimatCesitiChange = (v: string) => {
    setForm((f) => ({ ...f, teslimatCesiti: v }))
    if (v !== 'EXW') return
    const fabrika = (deliveryAddrs as any[]).find((d) => (d.teslimAlanAdi ?? d.TeslimAlanAdi) === 'Fabrika')
    if (!fabrika) {
      toast({ title: 'Fabrika seçeneği mevcut değil.', variant: 'destructive' })
      return
    }
    applyDeliveryAddress(fabrika)
    setForm((f) => ({ ...f, teslimatFiyat: 0 }))
  }

  /**
   * §4.3: Montaj/Teslimat Çarp (legacy button2_Click / teslimatCarp_Click) —
   * fiyat × miktar sonucu fiyat alanına yazılır; miktar 1'e çekilir ki
   * Brüt Toplam'daki fiyat × miktar formülü çift saymasın.
   */
  const montajCarp = () => {
    const fiyat = Number(form.montajFiyat), miktar = Number(form.mAdet)
    if (!Number.isFinite(fiyat) || !Number.isFinite(miktar)) {
      toast({ title: 'Lütfen geçerli bir sayı giriniz.', variant: 'destructive' })
      return
    }
    setForm((f) => ({ ...f, montajFiyat: fiyat * miktar, mAdet: 1 }))
  }
  const teslimatCarp = () => {
    const fiyat = Number(form.teslimatFiyat), miktar = Number(form.mTeslimat)
    if (!Number.isFinite(fiyat) || !Number.isFinite(miktar)) {
      toast({ title: 'Lütfen geçerli bir sayı giriniz.', variant: 'destructive' })
      return
    }
    setForm((f) => ({ ...f, teslimatFiyat: fiyat * miktar, mTeslimat: 1 }))
  }

  // ── Formu Getir (PROMPT-v3 §6 — legacy FormGetir) ─────────────────────
  const [getirOpen, setGetirOpen]   = useState(false)
  const [getirQuery, setGetirQuery] = useState('')
  const [getirLoading, setGetirLoading] = useState(false)
  // Temsilci'nin kendi siparişleri (backend zaten kendi satırlarına scope'lar).
  const { data: myOrders = [] } = useQuery({
    queryKey: ['my-orders-picker'],
    queryFn:  () => getMyOrders(),
    enabled:  getirOpen,
  })
  const getirList = myOrders.filter((o) => {
    const q = getirQuery.trim().toLowerCase()
    if (!q) return true
    return [o.siparisNo, o.teklifNo, o.musteriAd]
      .some((s) => (s ?? '').toLowerCase().includes(q))
  })

  /**
   * Seçilen siparişi forma YENİ kayıt olarak hidrate eder (revise pre-load'un
   * aksine numaralar boş kalır, kaydet butonları taze Teklif/Sipariş üretir).
   * OrderItem satırları kayıt sırasına göre gruplanır: kategori satırı yeni
   * seti açar, ardından gelen bileşen satırları o sete bağlanır.
   */
  const loadFromOrder = async (no: string) => {
    setGetirLoading(true)
    try {
      const d = await getOrderDetail(no)

      interface Group { kategoriID: number; adet: number; fiyat: number; comps: typeof d.items }
      const groups: Group[] = []
      for (const it of d.items) {
        if (it.kategoriID != null)
          groups.push({ kategoriID: it.kategoriID, adet: it.adet, fiyat: it.fiyat ?? 0, comps: [] })
        else if (it.bilesenID != null && groups.length > 0)
          groups[groups.length - 1].comps.push(it)
      }

      const tabs = Array.from({ length: SET_COUNT }, () => emptySetTab())
      const sets: OrderSetInput[] = []
      for (let i = 0; i < Math.min(groups.length, SET_COUNT); i++) {
        const g = groups[i]
        const kategoriAdi = categories.find((c) => c.kategoriID === g.kategoriID)?.kategoriAdi ?? ''
        const checklist = toChecklist(await getComponentsByCategory(g.kategoriID))
        const savedIds = new Set(g.comps.map((c) => c.bilesenID!))
        const meta = new Map(checklist.map((c) => [c.bilesenID, c]))

        tabs[i] = {
          kategoriID:    g.kategoriID,
          kategoriAdi,
          kategoriFiyat: g.fiyat,
          adet:          g.adet,
          checklist:     checklist.map((c) => ({ ...c, checked: savedIds.has(c.bilesenID) })),
          components:    g.comps.map((sc) => {
            const m = meta.get(sc.bilesenID!)
            const opts = m?.attributes ?? []
            const saved = sc.oznitelikAdi ?? ''
            return {
              bilesenID:           sc.bilesenID!,
              bilesenAdi:          m?.bilesenAdi ?? `#${sc.bilesenID}`,
              birim:               m?.birim ?? '',
              oznitelikSecili:     saved,
              oznitelikSecenekler: saved && !opts.includes(saved) ? [...opts, saved] : opts,
              adet:                sc.adet,
              birimFiyat:          sc.fiyat ?? 0,
              defaultAdet:         m?.defaultAdet ?? 1,
            }
          }),
        }
        sets[i] = {
          kategoriID:    g.kategoriID,
          adet:          g.adet,
          kategoriFiyat: g.fiyat,
          components:    g.comps.map((c) => ({
            bilesenID:    c.bilesenID!,
            oznitelikAdi: c.oznitelikAdi || undefined,
            adet:         c.adet,
            fiyat:        c.fiyat ?? 0,
          })),
        }
      }

      setSetTabs(tabs)
      setForm({ ...detailToForm(d), sets })
      setCreatedNo(null)
      setGetirOpen(false)
      toast({ title: 'Form yüklendi', description: `${no} → yeni kayıt olarak düzenlenebilir` })
    } catch {
      toast({ title: 'Form yüklenemedi', variant: 'destructive' })
    } finally {
      setGetirLoading(false)
    }
  }

  // ── Computed pricing (right column) ───────────────────────────────────
  // Per-tab fiyat = kategoriFiyat × adet (legacy "Sipariş N'in Fiyatı").
  const tabPrice = (idx: number) => setTabs[idx].kategoriFiyat * setTabs[idx].adet
  // Brüt toplam = sets toplam + montaj + teslimat. İndirim çıkar. KDV ekle.
  const brutToplam = useMemo(() => {
    const setsTotal = setTabs.reduce((acc, _t, i) => acc + tabPrice(i), 0)
    const montaj    = (form.montajVar   ? form.montajFiyat   * form.mAdet     : 0)
    const teslimat  = (form.teslimatVar ? form.teslimatFiyat * form.mTeslimat : 0)
    return setsTotal + montaj + teslimat
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setTabs, form.montajVar, form.montajFiyat, form.mAdet, form.teslimatVar, form.teslimatFiyat, form.mTeslimat])

  const toplamFiyat = useMemo(() => {
    const afterIndirim = brutToplam * (1 - (form.indirim || 0) / 100)
    return afterIndirim * (1 + (form.kdv || 0) / 100)
  }, [brutToplam, form.indirim, form.kdv])

  const kaporaMiktari = useMemo(
    () => toplamFiyat * (form.pesinYuzde || 0) / 100,
    [toplamFiyat, form.pesinYuzde],
  )

  const sym = currencySymbol(form.paraTipi)
  const fmt = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  // Para tipi: 3 radyo + "Diğer" dropdown (legacy düzeni birebir).
  const isInRadio = (PARA_TIPLERI_RADIO as readonly string[]).includes(form.paraTipi)

  return (
    <div>
      <PageHeader
        title={isReviseMode ? `${t('orders.reviseTitle')} — ${reviseFrom}` : t('orders.newOrderTitle')}
        description={isReviseMode ? undefined : 'Sipariş Formu — 3 kolon (Müşteri / Setler / Cari)'}
      />

      <div className="p-4 lg:p-6">
        {/* PROMPT.md #20: revise indicator banner — visible while editing a revision. */}
        {isReviseMode && (
          <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900">
            <strong>{t('orders.reviseBanner')}:</strong>{' '}
            <span className="font-mono">{reviseFrom}</span>
            {reviseLoading && <span className="ml-2 text-muted-foreground">({t('common.loading')})</span>}
          </div>
        )}

        {/* ── 3-COLUMN GRID (legacy SiparisForm layout) ────────────────
            PROMPT-v2 §1a: 1920×1080 (100% zoom) yatay scroll'suz sığar;
            13" 1366×768'de de aksiyon bar görünür. Tüm kolonlara `min-w-0`
            verildi, böylece grid çocukları kendi içerikleriyle taşmaz —
            yatay scroll yalnız ortadaki bileşen tablosunda lazım olur.
        */}
        <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)_380px] gap-4">

          {/* ╔══════════ LEFT: MÜŞTERİ + TEMSİLCİ ══════════════════════ */}
          <div className="space-y-4 min-w-0">
            <section className="rounded-md border bg-card">
              <h3 className="text-center text-base font-semibold py-2 border-b">Müşteri</h3>
              <div className="p-3 space-y-2">
                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Müşteri</Label>
                    <Select onValueChange={(v) => onCustomerSelect(Number(v))}>
                      <SelectTrigger><SelectValue placeholder="Müşteri seç" /></SelectTrigger>
                      <SelectContent>
                        {customers.map((c) => (
                          <SelectItem key={c.musteriID} value={String(c.musteriID)}>
                            {c.musteriAd} ({c.ulkeAdi})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => nav('/customers/new')}>
                    Müşteri Ekle
                  </Button>
                </div>

                {/* Müşteri Adı (zorunlu) — legacy formda gizli/ad-soyad ile gelir; biz görünür tutalım. */}
                <Field label="Müşteri Adı *" required>
                  <Input
                    value={form.musteriAd}
                    onChange={(e) => setForm((f) => ({ ...f, musteriAd: e.target.value }))}
                  />
                  {submitted && !form.musteriAd.trim() && <FieldError message={t('validation.required')} />}
                </Field>

                <Field label="Telefon">
                  <Input value={form.mTelefon ?? ''} onChange={(e) => setForm((f) => ({ ...f, mTelefon: e.target.value }))} />
                </Field>
                <Field label="E-Mail">
                  <Input value={form.mMail ?? ''} onChange={(e) => setForm((f) => ({ ...f, mMail: e.target.value }))} />
                </Field>
                <Field label="Ülke">
                  <Select value={form.mUlke ?? ''} onValueChange={(v) => setForm((f) => ({ ...f, mUlke: v }))}>
                    <SelectTrigger><SelectValue placeholder="Ülke seç" /></SelectTrigger>
                    <SelectContent>
                      {ulkeler.map((u) => <SelectItem key={u.ulkelerID} value={u.ulkeAdi}>{u.ulkeAdi}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Zip kodu">
                  <Input value={form.mZipKod ?? ''} onChange={(e) => setForm((f) => ({ ...f, mZipKod: e.target.value }))} />
                </Field>
                <Field label="VAT Numarası">
                  <Input value={form.mVATNumarasi ?? ''} onChange={(e) => setForm((f) => ({ ...f, mVATNumarasi: e.target.value }))} />
                </Field>
                <Field label="Adres">
                  <Textarea rows={3} value={form.mAdres ?? ''} onChange={(e) => setForm((f) => ({ ...f, mAdres: e.target.value }))} />
                </Field>
              </div>
            </section>

            <section className="rounded-md border bg-card">
              <h3 className="text-center text-base font-semibold py-2 border-b">Temsilci</h3>
              <div className="p-3 space-y-2">
                <Field label="Temsilci İsmi">
                  <Input value={temsilciAdSoyad} readOnly disabled />
                </Field>
                <Field label="Not">
                  <Textarea
                    rows={4}
                    value={form.siparisNotu ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, siparisNotu: e.target.value }))}
                  />
                </Field>
                <p className="text-xs text-muted-foreground text-center">
                  Ek'i yalnızca ZIP veya RAR formatında ekleyiniz
                </p>
                <label className="block">
                  <span className="sr-only">Ek dosya</span>
                  <Button asChild variant="outline" className="w-full" disabled={!createdNo}>
                    <span>
                      {ekFileName || 'Ek'}
                      <input
                        type="file"
                        accept=".zip,.rar"
                        className="sr-only"
                        disabled={!createdNo}
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file && createdNo) {
                            setEkFileName(file.name)
                            uploadMut.mutate({ no: createdNo, file })
                          }
                        }}
                      />
                    </span>
                  </Button>
                </label>
                {ekFileName && (
                  <Input value={ekFileName} readOnly disabled className="text-xs" />
                )}
                {!createdNo && (
                  <p className="text-[11px] text-orange-600 text-center">
                    Ek yüklemek için önce sipariş/teklif kaydedin.
                  </p>
                )}
              </div>
            </section>
          </div>

          {/* ╔══════════ CENTER: SET TABS + DETAY ═════════════════════════ */}
          {/* PROMPT-v2 §1a: min-w-0 grid çocuğunun iç tablosunun overflow
              container'ı olarak davranmasını mümkün kılar. */}
          <section className="rounded-md border bg-card min-h-[600px] min-w-0">
            <Tabs defaultValue="set-0">
              <div className="border-b px-2">
                <TabsList className="bg-transparent h-auto py-1">
                  {Array.from({ length: SET_COUNT }, (_, i) => (
                    <TabsTrigger key={`set-${i}`} value={`set-${i}`} className="px-3 py-1 text-xs">
                      Sipariş {i + 1}
                    </TabsTrigger>
                  ))}
                  <TabsTrigger value="detay" className="px-3 py-1 text-xs">Detay</TabsTrigger>
                </TabsList>
              </div>

              {/* Sipariş 1..5 — her sekme bir set */}
              {Array.from({ length: SET_COUNT }, (_, i) => (
                <TabsContent key={`set-${i}`} value={`set-${i}`} className="m-0 p-4 space-y-3">
                  <h4 className="text-center text-base font-semibold">Sipariş {i + 1}</h4>

                  <div className="flex items-end gap-2">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs text-right block">Ana Ürün</Label>
                      <Select
                        value={setTabs[i].kategoriID ? String(setTabs[i].kategoriID) : ''}
                        // PROMPT-v2 §1b: Kategori değişimi bileşen tablosunu yükler.
                        onValueChange={(v) => onCategorySelect(i, Number(v))}
                      >
                        <SelectTrigger><SelectValue placeholder="Ana ürün seç" /></SelectTrigger>
                        <SelectContent>
                          {categories.map((c) => (
                            <SelectItem key={c.kategoriID} value={String(c.kategoriID)}>
                              {c.kategoriAdi}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => iptalTab(i)}>İptal</Button>
                  </div>

                  <div className="grid grid-cols-[1fr_120px_auto] gap-2 items-end">
                    <div className="space-y-1">
                      <Label className="text-xs text-right block">Tekil Fiyat ve Adet</Label>
                      <div className="flex items-center gap-1">
                        <span className="text-sm w-5">{sym}</span>
                        <DecimalInput
                          value={setTabs[i].kategoriFiyat}
                          onValueChange={(v) => updateTab(i, { kategoriFiyat: v === '' ? 0 : v })}
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-right block">Adet</Label>
                      <Input
                        type="number"
                        min={1}
                        value={setTabs[i].adet}
                        // PROMPT-v3 §2.3: spinner değişince tüm satır Adet'leri
                        // defaultAdet × ürünAdedi olarak yeniden hesaplanır.
                        onChange={(e) => onUrunAdetChange(i, Math.max(1, Number(e.target.value)))}
                      />
                    </div>
                    <Button size="sm" onClick={() => carp(i)}>Çarp</Button>
                  </div>

                  <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
                    <div className="space-y-1">
                      <Label className="text-xs text-right block">Sipariş {i + 1}'in Fiyatı</Label>
                      <div className="flex items-center gap-1">
                        <span className="text-sm w-5">{sym}</span>
                        <Input readOnly disabled value={fmt(tabPrice(i))} className="flex-1" />
                      </div>
                    </div>
                  </div>

                  {/*
                    PROMPT-v3 §2.2: bileşen checklist'i (legacy bilesenCheckedListBox).
                    Tüm bileşenler listelenir; reçetedekiler ön-işaretli gelir.
                    İşaretlemek tabloya ekler, kaldırmak siler.
                    §5: sabit yükseklik viewport ayar düğmesi — taşma olursa önce
                    burayı küçült (h-40, eski önizleme kutusuyla aynı).
                  */}
                  <div className="rounded border bg-muted/20 h-40 overflow-y-auto p-2">
                    {setTabs[i].checklist.length === 0
                      ? <p className="text-xs text-muted-foreground text-center pt-14">
                          {setTabs[i].kategoriID ? 'Bileşenler yükleniyor…' : 'Ana ürün seçince bileşen listesi burada görünür.'}
                        </p>
                      : setTabs[i].checklist.map((c) => (
                        <label key={c.bilesenID} className="flex items-center gap-2 text-xs cursor-pointer py-0.5 hover:bg-muted/40 rounded px-1">
                          <input
                            type="checkbox"
                            checked={c.checked}
                            onChange={(e) => toggleComponent(i, c.bilesenID, e.target.checked)}
                          />
                          {/* Legacy etiket formatı birebir: [ID, Ad (Adet: N)] */}
                          <span>[{c.bilesenID}, {c.bilesenAdi} (Adet: {c.defaultAdet})]</span>
                        </label>
                      ))}
                  </div>

                  {/*
                    PROMPT-v2 §1b: checklist'te işaretli bileşenler bu tabloda;
                    Adet / Birim Fiyat / Öznitelik satır bazında editlenebilir,
                    Toplam canlı hesaplanır. Çarp basılınca payload'a alınır.
                    PROMPT-v3 §5 viewport: scroll yalnız checklist + bu tablo
                    içinde — sayfa seviyesinde scroll çıkmamalı.
                  */}
                  <div className="rounded border overflow-auto max-h-64">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/30">
                        <tr>
                          <th className="text-left px-2 py-1">ID</th>
                          <th className="text-left px-2 py-1">Öznitelik</th>
                          <th className="text-left px-2 py-1">Bileşen Adı</th>
                          <th className="text-left px-2 py-1">Birim</th>
                          <th className="text-right px-2 py-1 w-20">Adet</th>
                          <th className="text-right px-2 py-1 w-28">Birim Fiyat</th>
                          <th className="text-right px-2 py-1 w-24">Toplam</th>
                        </tr>
                      </thead>
                      <tbody>
                        {setTabs[i].components.length === 0
                          ? <tr><td colSpan={7} className="text-center text-muted-foreground px-2 py-6">
                              {setTabs[i].kategoriID ? 'Listeden bileşen işaretleyin.' : 'Önce Ana Ürün seçin.'}
                            </td></tr>
                          : setTabs[i].components.map((cmp, k) => (
                            <tr key={`${cmp.bilesenID}-${k}`} className="border-t">
                              <td className="px-2 py-1">{cmp.bilesenID}</td>
                              <td className="px-2 py-1">
                                {/* §2.4: boş seçim serbest; auto-default değer
                                    seçeneklerde yoksa ekstra option enjekte edildi. */}
                                {cmp.oznitelikSecenekler.length > 0 ? (
                                  <select
                                    value={cmp.oznitelikSecili}
                                    onChange={(e) => updateComponent(i, k, { oznitelikSecili: e.target.value })}
                                    className="w-full bg-transparent border rounded px-1 py-0.5 text-xs"
                                  >
                                    <option value=""></option>
                                    {cmp.oznitelikSecenekler.map((o) => <option key={o} value={o}>{o}</option>)}
                                  </select>
                                ) : '—'}
                              </td>
                              <td className="px-2 py-1">{cmp.bilesenAdi}</td>
                              <td className="px-2 py-1">{cmp.birim || '—'}</td>
                              <td className="px-2 py-1 text-right">
                                <Input
                                  type="number" min={1}
                                  value={cmp.adet}
                                  onChange={(e) => updateComponent(i, k, { adet: Math.max(1, Number(e.target.value)) })}
                                  className="h-7 text-xs text-right"
                                />
                              </td>
                              <td className="px-2 py-1 text-right">
                                <DecimalInput
                                  value={cmp.birimFiyat}
                                  onValueChange={(v) => updateComponent(i, k, { birimFiyat: v === '' ? 0 : v })}
                                  className="h-7 text-xs text-right"
                                />
                              </td>
                              <td className="px-2 py-1 text-right tabular-nums">{fmt(cmp.adet * cmp.birimFiyat)}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>
              ))}

              {/* Detay sekmesi */}
              <TabsContent value="detay" className="m-0 p-4 space-y-2">
                <h4 className="text-center text-base font-semibold">Detay</h4>
                <Label className="text-xs">Detaylar (her satır bir not)</Label>
                <Textarea
                  rows={14}
                  value={(form.details ?? []).join('\n')}
                  onChange={(e) => setForm((f) => ({
                    ...f,
                    details: e.target.value.split('\n').filter((s) => s.length > 0),
                  }))}
                  placeholder={'Not 1\nNot 2\n...'}
                />
              </TabsContent>
            </Tabs>
          </section>

          {/* ╔══════════ RIGHT: CARI BİLGİ + TESLİMAT / MONTAJ ════════════ */}
          <div className="space-y-4 min-w-0">
            {/* Teklif / Sipariş No header */}
            <div className="rounded-md border bg-card p-3 space-y-2">
              <Field label="Teklif No">
                <Input readOnly disabled value={createdNo && createdNo.startsWith('T') ? createdNo : ''} />
              </Field>
              <Field label="Sipariş No">
                <Input readOnly disabled value={createdNo && createdNo.startsWith('S') ? createdNo : ''} />
              </Field>
            </div>

            {/* Cari Bilgi */}
            <section className="rounded-md border bg-card">
              <h3 className="text-center text-base font-semibold py-2 border-b">Cari Bilgi</h3>
              <div className="p-3 space-y-3">
                {/* Para Tipi radyolar + Diğer dropdown */}
                <div className="flex items-center gap-3 flex-wrap text-sm">
                  {PARA_TIPLERI_RADIO.map((p) => (
                    <label key={p} className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="paraTipi"
                        value={p}
                        checked={form.paraTipi === p}
                        onChange={() => setForm((f) => ({ ...f, paraTipi: p }))}
                      />
                      <span>{p}</span>
                    </label>
                  ))}
                  <Select
                    value={isInRadio ? '' : form.paraTipi}
                    onValueChange={(v) => setForm((f) => ({ ...f, paraTipi: v }))}
                  >
                    <SelectTrigger className="w-28 h-8"><SelectValue placeholder="Diğer" /></SelectTrigger>
                    <SelectContent>
                      {PARA_TIPLERI_DIGER.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {/* PROMPT-v2 §3: boş → null (display blank); coercion yalnız hesapta. */}
                  <Field label="İndirim" suffix="%">
                    <DecimalInput value={form.indirim ?? ''} onValueChange={(v) => setForm((f) => ({ ...f, indirim: v === '' ? null : v }))} />
                  </Field>
                  <Field label="KDV" suffix="%">
                    <DecimalInput value={form.kdv ?? ''} onValueChange={(v) => setForm((f) => ({ ...f, kdv: v === '' ? null : v }))} />
                  </Field>

                  <Field label="Toplam Fiyat" prefix={sym}>
                    <Input readOnly disabled value={fmt(toplamFiyat)} />
                  </Field>
                  <Field label="Peşin" suffix="%">
                    <DecimalInput value={form.pesinYuzde ?? ''} onValueChange={(v) => setForm((f) => ({ ...f, pesinYuzde: v === '' ? null : v }))} />
                  </Field>

                  <Field label="Kapora Miktarı" prefix={sym}>
                    <Input readOnly disabled value={fmt(kaporaMiktari)} />
                  </Field>
                  <Field label="Şirket">
                    <Select value={form.sirket} onValueChange={(v) => setForm((f) => ({ ...f, sirket: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{SIRKETLER.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                </div>
              </div>
            </section>

            {/* Teslimat ve Montaj */}
            <section className="rounded-md border bg-card">
              <h3 className="text-center text-base font-semibold py-2 border-b">Teslimat / Montaj</h3>
              <div className="p-3 space-y-3">
                <div className="flex items-center justify-around text-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.montajVar}
                      onChange={(e) => setForm((f) => ({ ...f, montajVar: e.target.checked }))}
                    />
                    Montaj
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.teslimatVar}
                      onChange={(e) => setForm((f) => ({ ...f, teslimatVar: e.target.checked }))}
                    />
                    Teslimat
                  </label>
                </div>

                <div className="grid grid-cols-[1fr_80px_auto] gap-2 items-end">
                  <Field label="Montaj Fiyat">
                    <DecimalInput
                      value={form.montajFiyat}
                      onValueChange={(v) => setForm((f) => ({ ...f, montajFiyat: v === '' ? 0 : v }))}
                      disabled={!form.montajVar}
                    />
                  </Field>
                  <Field label="Miktar">
                    <Input
                      type="number" min={1}
                      value={form.mAdet}
                      onChange={(e) => setForm((f) => ({ ...f, mAdet: Math.max(1, Number(e.target.value)) }))}
                      disabled={!form.montajVar}
                    />
                  </Field>
                  {/* PROMPT-v3 §4.3: fiyat × miktar yerinde yazılır, miktar 1'e döner. */}
                  <Button size="sm" variant="outline" disabled={!form.montajVar} onClick={montajCarp}>Çarp</Button>
                </div>

                <div className="grid grid-cols-[1fr_80px_auto] gap-2 items-end">
                  <Field label="Teslimat Fiyat">
                    <DecimalInput
                      value={form.teslimatFiyat}
                      onValueChange={(v) => setForm((f) => ({ ...f, teslimatFiyat: v === '' ? 0 : v }))}
                      disabled={!form.teslimatVar}
                    />
                  </Field>
                  <Field label="Miktar">
                    <Input
                      type="number" min={1}
                      value={form.mTeslimat}
                      onChange={(e) => setForm((f) => ({ ...f, mTeslimat: Math.max(1, Number(e.target.value)) }))}
                      disabled={!form.teslimatVar}
                    />
                  </Field>
                  <Button size="sm" variant="outline" disabled={!form.teslimatVar} onClick={teslimatCarp}>Çarp</Button>
                </div>

                <div className="border-t pt-3 space-y-2">
                  {/* PROMPT-v3 §4.1: Teslim Alan Adı + Teslimat Çeşidi (Incoterms) yan yana. */}
                  <div className="grid grid-cols-[1fr_96px] gap-2 items-end">
                    <Field label="Teslim Alan Adı">
                      <Select
                        value={form.tTeslimAlanAdi ?? ''}
                        onValueChange={(v) => {
                          // §4.2: kayıt seçilince ilgili kişi/telefon/ülke vs. dolsun.
                          const a = (deliveryAddrs as any[]).find((d) => (d.teslimAlanAdi ?? d.TeslimAlanAdi) === v)
                          if (a) applyDeliveryAddress(a)
                          else setForm((f) => ({ ...f, tTeslimAlanAdi: v }))
                        }}
                      >
                        <SelectTrigger><SelectValue placeholder="Seç" /></SelectTrigger>
                        <SelectContent>
                          {/* §3: İlişkilendir sonrası müşteri adı kayıtlı adres olmasa
                              da değer olarak görünebilmeli (legacy editable combo). */}
                          {form.tTeslimAlanAdi &&
                            !(deliveryAddrs as any[]).some((d) => (d.teslimAlanAdi ?? d.TeslimAlanAdi) === form.tTeslimAlanAdi) && (
                            <SelectItem value={form.tTeslimAlanAdi}>{form.tTeslimAlanAdi}</SelectItem>
                          )}
                          {(deliveryAddrs as any[]).map((d, k) => {
                            const name = d.teslimAlanAdi ?? d.TeslimAlanAdi ?? `Adres ${k + 1}`
                            return <SelectItem key={k} value={String(name)}>{String(name)}</SelectItem>
                          })}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Çeşidi">
                      <Select value={form.teslimatCesiti ?? ''} onValueChange={onTeslimatCesitiChange}>
                        <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          {INCOTERMS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>

                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <Field label="İlgili Kişi">
                        <Input value={form.tIlgiliKisi ?? ''} onChange={(e) => setForm((f) => ({ ...f, tIlgiliKisi: e.target.value }))} />
                      </Field>
                    </div>
                    {/* PROMPT-v3 §3: Müşteri bloğunu teslimat alanlarına kopyalar. */}
                    <Button variant="outline" size="sm" onClick={ilisikilendir}>İlişkilendir</Button>
                  </div>

                  <Field label="Ülke">
                    <Select value={form.tUlke ?? ''} onValueChange={(v) => setForm((f) => ({ ...f, tUlke: v }))}>
                      <SelectTrigger><SelectValue placeholder="Ülke seç" /></SelectTrigger>
                      <SelectContent>
                        {ulkeler.map((u) => <SelectItem key={u.ulkelerID} value={u.ulkeAdi}>{u.ulkeAdi}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>

                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Telefon">
                      <Input value={form.tTelefon ?? ''} onChange={(e) => setForm((f) => ({ ...f, tTelefon: e.target.value }))} />
                    </Field>
                    <Field label="Alternatif Telefon">
                      <Input value={form.tAltTelefon ?? ''} onChange={(e) => setForm((f) => ({ ...f, tAltTelefon: e.target.value }))} />
                    </Field>
                    <Field label="E-Mail">
                      <Input value={form.tE_Mail ?? ''} onChange={(e) => setForm((f) => ({ ...f, tE_Mail: e.target.value }))} />
                    </Field>
                    <Field label="Zip kodu">
                      <Input value={form.tZipKod ?? ''} onChange={(e) => setForm((f) => ({ ...f, tZipKod: e.target.value }))} />
                    </Field>
                    <Field label="VAT Numarası">
                      <Input value={form.tVATNumarasi ?? ''} onChange={(e) => setForm((f) => ({ ...f, tVATNumarasi: e.target.value }))} />
                    </Field>
                  </div>
                  <Field label="Adres">
                    <Textarea
                      rows={3}
                      value={form.tAdres ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, tAdres: e.target.value }))}
                    />
                  </Field>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* ╔══════════ FOOTER: AKSIYON BUTONLARI ═════════════════════════ */}
        <div className="mt-4 flex flex-wrap justify-end gap-2 sticky bottom-0 bg-background/95 backdrop-blur py-3 border-t">
          {/* PROMPT-v3 §6: legacy FormGetir — mevcut sipariş seçip forma yükler. */}
          <Button variant="outline" onClick={() => setGetirOpen(true)}>Formu Getir</Button>
          <Button
            variant="secondary"
            disabled={quoteMut.isPending || reviseLoading || isReviseMode}
            onClick={submitQuote}
          >
            Teklifi Hazırla
          </Button>
          <Button
            disabled={orderMut.isPending || reviseLoading || isReviseMode}
            onClick={submitOrder}
          >
            Siparişi Hazırla
          </Button>
          <Button
            variant="default"
            disabled={!isReviseMode || orderMut.isPending || reviseLoading}
            onClick={submitOrder}
          >
            Revize Et
          </Button>
        </div>

        {/* ╔══════════ FORMU GETİR DIALOG (PROMPT-v3 §6) ═════════════════ */}
        <Dialog open={getirOpen} onOpenChange={setGetirOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Formu Getir</DialogTitle>
            </DialogHeader>
            <Input
              autoFocus
              placeholder="Teklif No / Sipariş No / Müşteri adı ara…"
              value={getirQuery}
              onChange={(e) => setGetirQuery(e.target.value)}
            />
            <div className="max-h-72 overflow-y-auto rounded border divide-y">
              {getirList.length === 0
                ? <p className="text-sm text-muted-foreground text-center py-6">Kayıt bulunamadı.</p>
                : getirList.map((o) => (
                  <button
                    key={o.siparisAlID}
                    type="button"
                    disabled={getirLoading}
                    onClick={() => loadFromOrder(o.siparisNo)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent disabled:opacity-50"
                  >
                    <span className="font-mono">{o.siparisMiTeklifMi === 'Teklif' ? o.teklifNo : o.siparisNo}</span>
                    <span className="text-muted-foreground"> — {o.musteriAd}</span>
                    <span className="block text-xs text-muted-foreground">
                      {o.siparisMiTeklifMi} · {o.tarih ? new Date(o.tarih).toLocaleDateString('tr-TR') : ''}
                    </span>
                  </button>
                ))}
            </div>
            {getirLoading && <p className="text-xs text-muted-foreground">Form yükleniyor…</p>}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

// ── Local helpers ──────────────────────────────────────────────────────────

/**
 * Legacy WinForms label-right + control-right layout. We approximate with
 * a small flex row: label on the right with fixed width, control fills.
 * (`prefix`/`suffix` show a currency / "%" hint inside the field row.)
 */
function Field({
  label, required, prefix, suffix, children,
}: {
  label: string
  required?: boolean
  prefix?: string
  suffix?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-right block text-muted-foreground">
        {label}{required && ' *'}
      </Label>
      <div className="flex items-center gap-1">
        {prefix && <span className="text-sm w-5 text-center">{prefix}</span>}
        <div className="flex-1">{children}</div>
        {suffix && <span className="text-sm w-5 text-center">{suffix}</span>}
      </div>
    </div>
  )
}

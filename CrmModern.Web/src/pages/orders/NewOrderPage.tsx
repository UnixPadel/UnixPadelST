import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2, CircleAlert, Eye, FilePlus2, History, Paperclip, Plus, Trash2, UserPlus, X,
} from 'lucide-react'
import {
  createOrder, createQuote, getCategories, expandRecipe, uploadAttachment,
  getDeliveryAddresses, getComponentsByCategory,
  // PROMPT.md #20: revise wire-up — pre-load + swap save mutation.
  getOrderDetail, reviseOrder,
  // Round-8 §7 — yerinde düzenleme.
  amendOrder,
  // Temsilci devri — revize/düzenlemede elshan.rasulov farklı temsilci seçerse.
  changeRepresentative,
} from '@/api/orders'
import { getUsersLookup } from '@/api/users'
import { getExchangeRates } from '@/api/exchangeRates'
import { getCustomerBalance } from '@/api/accounting'
import {
  convert, isoSymbol, normalizeIso, paraTipiToIso, round2, formatMoney, type IsoCurrency, type Rates,
} from '@/lib/currency'
import { isSuperAdmin } from '@/lib/permissions'
import { hideMoneyFor } from '@/lib/visibility'
import { getCustomers, getUlkeler } from '@/api/customers'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { DecimalInput } from '@/components/DecimalInput'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Combobox, type ComboOption } from '@/components/ui/combobox'
import { FormField } from '@/components/ui/form-field'
import { SectionTitle } from '@/components/ui/section-title'
import { CollapsibleSection } from '@/components/ui/accordion'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { LookupDialog } from '@/components/LookupDialog'
import { useShortcutHints } from '@/components/StatusBar'
import { useAuth } from '@/hooks/useAuth'
import { useHotkeys } from '@/hooks/useHotkeys'
import { useEnterNavigation } from '@/hooks/useEnterNavigation'
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useToast } from '@/components/ToastProvider'
import { toastApiError } from '@/lib/apiError'
import { invalidateOrderGraph } from '@/lib/queryKeys'
import { usePreferences } from '@/lib/preferences'
import { readJSON, removeKey, userKey, writeJSON } from '@/lib/storage'
import { formatNumberTR } from '@/lib/number'
import { INCOTERMS } from '@/lib/constants'
// Round-8 §4/§5 — standart şartlar yapılandırılmış KOD olarak saklanır.
import {
  STANDART_DETAY_SARTLARI, CLAUSE, ODEME_PREFIX, TESLIMAT_PREFIX,
  teslimatCode, odemeCode, upsertClause, parseOdemeFromDetails, isFreeNote,
} from '@/lib/clauses'
import {
  PARA_TIPLERI, SIRKETLER, SET_COUNT, blankOrder, emptySetTab, applyCategoryRules, buildRow, buildSets,
  detailToForm, isPanoramicPadel, computeTotals, orderIssues,
  type ChecklistItem, type ComponentRow, type PriceFn, type SetTabState, type OrderIssue,
} from '@/lib/orderForm'
import { SetTabPanel } from './new-order/SetTabPanel'
import { FreeItemsSection } from './new-order/FreeItemsSection'
import { OrderSummaryRail, focusIssue } from './new-order/OrderSummaryRail'
import { LoadOrderDialog } from './new-order/LoadOrderDialog'
import { OrderPreviewDialog } from './new-order/OrderPreviewDialog'
import type { CreateOrderDto, OrderDetail, OrderSetInput } from '@/types'

/**
 * Sipariş/Teklif Oluştur (legacy SiparisForm). SR-1 ile parçalandı:
 *   lib/orderForm.ts            saf fonksiyonlar + computeTotals + orderIssues
 *   new-order/SetTabPanel       set sekmesi (Çarp yok — F0-4)
 *   new-order/FreeItemsSection  serbest kalemler + pencere
 *   new-order/OrderSummaryRail  yapışkan özet + eksikler (E-11)
 *   new-order/LoadOrderDialog   Referanstan oluştur (Formu Getir)
 *   new-order/OrderPreviewDialog  Ctrl+S → gözden geçir → kaydet
 * Modlar (?revise / ?amend / ?copyFrom) aynı sayfada; taslak (E-12) ve
 * kaydedilmemiş değişiklik koruması (SR-9) tüm modlarda çalışır.
 */
interface Draft {
  form: CreateOrderDto
  setTabs: SetTabState[]
  odemeSekli: '' | 'Pesin' | 'Vadeli'
  savedAt: string
}

export function NewOrderPage() {
  const nav = useNavigate()
  const { t } = useTranslation()
  const { toast } = useToast()
  const { confirm } = useConfirm()
  const { getUser } = useAuth()
  const prefs = usePreferences()
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()
  const reviseFrom = params.get('revise')
  // Round-8 §7 — yerinde düzenleme modu (numara değişmez; gerekçe zorunlu).
  const amendFrom = params.get('amend')
  // E-14 — "Kopyala ile yeni" (SAP referansla oluştur): kaynak yeni kayıt olarak yüklenir.
  const copyFrom = params.get('copyFrom')

  const user = getUser()
  const hideMoney = hideMoneyFor(user)
  const temsilciAdSoyad = [user?.ad, user?.soyad].filter(Boolean).join(' ') || user?.kullaniciAdi || ''

  // Temsilci devri — YALNIZ elshan.rasulov (ControlUser) / süper-admin.
  const canReassign = user?.kullaniciAdi === 'elshan.rasulov' || isSuperAdmin(user)
  const [selectedRepId, setSelectedRepId] = useState('')

  const [form, setForm] = useState<CreateOrderDto>(() => blankOrder(prefs))
  const [createdNo, setCreatedNo] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  // PROMPT-v6 §5 — Ödeme Şekli; Detaylar satırı ('Ödeme Şekli: …') olarak persist olur.
  const [odemeSekli, setOdemeSekli] = useState<'' | 'Pesin' | 'Vadeli'>(prefs.defaultOdemeSekli)
  // §7 — yerinde düzenleme gerekçesi (amend modunda zorunlu).
  const [amendGerekce, setAmendGerekce] = useState('')
  const [setTabs, setSetTabs] = useState<SetTabState[]>(() => Array.from({ length: SET_COUNT }, () => emptySetTab()))
  const [activeTab, setActiveTab] = useState('set-0')
  const [ekFileName, setEkFileName] = useState('')
  const [customerId, setCustomerId] = useState<number | null>(null)
  const [customerLookupOpen, setCustomerLookupOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [getirOpen, setGetirOpen] = useState(false)
  const [getirLoading, setGetirLoading] = useState(false)
  const [newDetailNote, setNewDetailNote] = useState('')
  const [leaving, setLeaving] = useState<string | null>(null)
  const ekInputRef = useRef<HTMLInputElement>(null)

  const isReviseMode = !!reviseFrom
  const isAmendMode = !!amendFrom
  const mode: 'new' | 'revise' | 'amend' = isAmendMode ? 'amend' : isReviseMode ? 'revise' : 'new'
  const sourceNo = reviseFrom ?? amendFrom

  // ── Kur çevirici (TCMB, TL bazlı) ──────────────────────────────────────
  const { data: tcmb, dataUpdatedAt: kurZamani } = useQuery({
    queryKey: ['exchange-rates'],
    queryFn: getExchangeRates,
    staleTime: 60 * 60 * 1000,
    refetchInterval: 60 * 60 * 1000,
    refetchIntervalInBackground: true,
  })
  const rates = useMemo<Rates>(() => tcmb?.rates ?? {}, [tcmb])
  const orderIso = paraTipiToIso(form.paraTipi)
  const viewIso = orderIso
  /** Satırın kaynak fiyatı sipariş biriminde; kur yoksa null. */
  const shownPrice = (c: ComponentRow) => {
    const v = convert(c.kaynakFiyat, c.kaynakPara, viewIso, rates)
    return v == null ? null : round2(v)
  }
  const priceIn: PriceFn = (amount, from) => {
    const v = convert(amount, from, orderIso, rates)
    return v == null ? amount : round2(v)
  }
  // Para Tipi ya da kur değişince bileşen satırları kaynak fiyattan yeniden çevrilir.
  useEffect(() => {
    setSetTabs((s) => s.map((tb) => tb.components.length === 0 ? tb : {
      ...tb,
      components: tb.components.map((c) => ({ ...c, birimFiyat: priceIn(c.kaynakFiyat, c.kaynakPara) })),
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderIso, rates])
  // Para Tipi değişince elle girilen tutarlar da (set fiyatı, montaj, teslimat, ekstra)
  // önceki birimden yeni birime çevrilir. Kayıtlı sipariş yüklenirken tutarlar zaten
  // o siparişin biriminde gelir; yükleyici paraIsoRef'i eşitleyerek çeviriyi atlar.
  const paraIsoRef = useRef<IsoCurrency>(orderIso)
  useEffect(() => {
    const from = paraIsoRef.current
    paraIsoRef.current = orderIso
    if (from === orderIso) return
    const cv = (n: number) => { const v = convert(n, from, orderIso, rates); return v == null ? n : round2(v) }
    setSetTabs((s) => s.map((tb) => tb.kategoriFiyat ? { ...tb, kategoriFiyat: cv(tb.kategoriFiyat) } : tb))
    setForm((f) => ({
      ...f,
      montajFiyat:   cv(f.montajFiyat),
      teslimatFiyat: cv(f.teslimatFiyat),
      extraCosts:    (f.extraCosts ?? []).map((e) => ({ ...e, tutar: cv(Number(e.tutar) || 0) })),
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderIso])

  const changeCurrency = async (p: string) => {
    if (p === form.paraTipi) return
    const hasPrices = setTabs.some((tb) => tb.kategoriFiyat > 0) || form.montajFiyat > 0 || form.teslimatFiyat > 0 || (form.extraCosts ?? []).some((e) => Number(e.tutar) > 0)
    if (hasPrices && !(await confirm({
      title: t('orders.confirm.currencyTitle'),
      description: t('orders.confirm.currencyDesc', { from: form.paraTipi, to: p }),
      confirmLabel: t('orders.confirm.currencyOk'),
    }))) return
    setForm((f) => ({ ...f, paraTipi: p }))
  }

  // ── Revize/Amend kaynağı ───────────────────────────────────────────────
  const { data: reviseSource, isLoading: reviseLoading } = useQuery({
    queryKey: ['order-detail', sourceNo],
    queryFn: () => getOrderDetail(sourceNo!),
    enabled: isReviseMode || isAmendMode,
  })
  // F0-5 — hidrasyon (kategori + bileşen çekimi) bitene dek kaydet kapalı.
  const [hydratedNo, setHydratedNo] = useState<string | null>(null)
  const hydrating = (isReviseMode || isAmendMode) && hydratedNo !== sourceNo

  const { data: userOptions = [] } = useQuery({
    queryKey: ['users-lookup'],
    queryFn: getUsersLookup,
    enabled: canReassign && (isReviseMode || isAmendMode),
  })
  const repOptions = useMemo(() => {
    const reps = userOptions.filter((u) => u.yetkiTuru === 'Temsilci')
    const ownerId = reviseSource?.kullaniciID
    if (ownerId && !reps.some((u) => u.kullaniciID === ownerId)) {
      const owner = userOptions.find((u) => u.kullaniciID === ownerId)
      if (owner) reps.unshift(owner)
    }
    return reps
  }, [userOptions, reviseSource])
  useEffect(() => {
    if (reviseSource?.kullaniciID)
      setSelectedRepId((prev) => prev || String(reviseSource.kullaniciID))
  }, [reviseSource])

  // ── Veri kaynakları ────────────────────────────────────────────────────
  const { data: customers     = [], isLoading: customersLoading } = useQuery({ queryKey: ['customers'],            queryFn: getCustomers })
  const { data: ulkeler       = [] } = useQuery({ queryKey: ['ulkeler'],              queryFn: getUlkeler })
  const { data: categories    = [] } = useQuery({ queryKey: ['order-categories'],     queryFn: getCategories })
  const { data: deliveryAddrs = [] } = useQuery({ queryKey: ['order-delivery-addrs'], queryFn: getDeliveryAddresses })

  const customerOptions: ComboOption[] = useMemo(() => customers.map((c) => ({
    value: String(c.musteriID), label: c.musteriAd, description: c.ulkeAdi,
    keywords: `${c.vatNumarasi ?? ''} ${c.telefon ?? ''} ${c.e_Mail ?? ''}`,
  })), [customers])
  const countryOptions: ComboOption[] = useMemo(() => ulkeler.map((u) => ({ value: u.ulkeAdi, label: u.ulkeAdi })), [ulkeler])
  const categoryOptions: ComboOption[] = useMemo(() => categories.map((c) => ({ value: String(c.kategoriID), label: c.kategoriAdi })), [categories])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deliveryNames: string[] = useMemo(() => (deliveryAddrs as any[]).map((d, k) => String(d.teslimAlanAdi ?? d.TeslimAlanAdi ?? `Adres ${k + 1}`)), [deliveryAddrs])
  const deliveryOptions: ComboOption[] = useMemo(() => deliveryNames.map((n) => ({ value: n, label: n })), [deliveryNames])

  // Revize/Getir sonrası müşteri kimliği addan çözülür → seçim kutusu boş görünmez.
  const effectiveCustomerId = customerId ?? customers.find((c) => c.musteriAd === form.musteriAd)?.musteriID ?? null

  // E-16 — LOGO risk kontrolü (bilgilendirici): seçili müşterinin açık bakiyesi.
  const { data: balance } = useQuery({
    queryKey: ['customer-balance', effectiveCustomerId],
    queryFn: () => getCustomerBalance(effectiveCustomerId!),
    enabled: !!effectiveCustomerId && !hideMoney,
    retry: false,
  })
  const openLines = (balance?.lines ?? []).filter((l) => l.kalan > 0.005)

  // ── Müşteri seçimi (legacy SelectedIndexChanged) ───────────────────────
  const onCustomerSelect = async (id: number) => {
    const c = customers.find((x) => x.musteriID === id)
    if (!c) return
    const hasContact = [form.mTelefon, form.mMail, form.mAdres, form.mVATNumarasi].some((v) => (v ?? '').trim())
    if (hasContact && form.musteriAd && form.musteriAd !== c.musteriAd && !(await confirm({
      title: t('orders.confirm.customerTitle'),
      description: t('orders.confirm.customerDesc', { name: c.musteriAd }),
      confirmLabel: t('orders.confirm.overwrite'),
    }))) return
    setCustomerId(id)
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

  // OFFER-DETAILS — checklist toggle: işaretlenen şartı form.details'e ekler/çıkarır.
  const toggleClause = (clause: string, checked: boolean) =>
    setForm((f) => ({
      ...f,
      details: checked
        ? (f.details.includes(clause) ? f.details : [...f.details, clause])
        : f.details.filter((d) => d !== clause),
    }))

  const addDetailNote = () => {
    const note = newDetailNote.trim()
    if (!note) return
    setForm((f) => ({ ...f, details: [...f.details, note] }))
    setNewDetailNote('')
  }

  // ── Doğrulama ──────────────────────────────────────────────────────────
  const issues: OrderIssue[] = orderIssues(form, setTabs, { amend: isAmendMode, amendReason: amendGerekce })
  const checkValid = (): boolean => {
    setSubmitted(true)
    if (issues.length === 0) return true
    toast({
      title: t('validation.fixErrors'),
      description: issues.map((i) => t(`orders.issues.${i}`)).join(' · '),
      variant: 'warning',
    })
    focusIssue(issues[0])
    return false
  }

  // ── Kayıt ──────────────────────────────────────────────────────────────
  const draftKey = userKey('draft', 'order', mode, sourceNo ?? 'new')
  const maybeReassign = async (no: string) => {
    const yeniId = Number(selectedRepId)
    if (!canReassign || !yeniId || yeniId === reviseSource?.kullaniciID) return
    try {
      await changeRepresentative(no, yeniId)
      toast({ title: t('orderDetail.repChanged'), variant: 'success' })
    } catch (e) {
      toastApiError(toast, t('orders.repReassignFailed'), e)
    }
  }
  const afterSave = (no: string, title: string) => {
    void invalidateOrderGraph(queryClient)
    removeKey(draftKey)
    toast({ title, description: no, variant: 'success' })
    setCreatedNo(no)
    setPreviewOpen(false)
  }
  const orderMut = useMutation({
    mutationFn: (payload: CreateOrderDto) => isReviseMode ? reviseOrder(reviseFrom!, payload) : createOrder(payload),
    onSuccess: async (no) => {
      if (isReviseMode) await maybeReassign(no)
      afterSave(no, isReviseMode ? t('orders.toast.revised') : t('orders.toast.created'))
    },
    onError: (e) => toastApiError(toast, t('orders.toast.error'), e),
  })
  const quoteMut = useMutation({
    mutationFn: (payload: CreateOrderDto) => isReviseMode ? reviseOrder(reviseFrom!, payload) : createQuote(payload),
    onSuccess: async (no) => {
      if (isReviseMode) await maybeReassign(no)
      afterSave(no, isReviseMode ? t('orders.toast.revised') : t('orders.toast.quoteCreated'))
    },
    onError: (e) => toastApiError(toast, t('orders.toast.error'), e),
  })
  // Round-8 §7 — yerinde düzenleme: numara değişmez, Guncellendi damgalanır.
  const amendMut = useMutation({
    mutationFn: (payload: CreateOrderDto) => amendOrder(amendFrom!, payload, amendGerekce),
    onSuccess: async (no) => {
      await maybeReassign(no)
      void invalidateOrderGraph(queryClient)
      removeKey(draftKey)
      toast({ title: t('orders.toast.amended'), description: no, variant: 'success' })
      setLeaving('/orders/mine')
    },
    onError: (e) => toastApiError(toast, t('orders.toast.error'), e),
  })
  const expandMut = useMutation({
    mutationFn: ({ no, kategoriId, adet }: { no: string; kategoriId: number; adet: number }) => expandRecipe(no, kategoriId, adet),
    onSuccess: () => toast({ title: t('orders.form.receteAcildi'), variant: 'success' }),
    onError: (e) => toastApiError(toast, t('orders.toast.error'), e),
  })
  const uploadMut = useMutation({
    mutationFn: ({ no, file }: { no: string; file: File }) => uploadAttachment(no, 'ek', file),
    onSuccess: () => toast({ title: t('orders.form.ekYuklendi'), variant: 'success' }),
    onError: (e) => toastApiError(toast, t('orders.toast.uploadFailed'), e),
  })
  const saving = orderMut.isPending || quoteMut.isPending || amendMut.isPending

  const isSubmittingRef = useRef(false)
  const runSave = (kind: 'order' | 'quote' | 'amend') => {
    if (isSubmittingRef.current || createdNo || hydrating) return
    if (!checkValid()) return
    isSubmittingRef.current = true
    const payload = { ...form, sets: buildSets(setTabs) }
    const done = { onSettled: () => { isSubmittingRef.current = false } }
    if (kind === 'amend') amendMut.mutate(payload, done)
    else if (kind === 'quote') quoteMut.mutate(payload, done)
    else orderMut.mutate(payload, done)
  }

  // ── Set sekmeleri ──────────────────────────────────────────────────────
  const updateTab = (idx: number, patch: Partial<SetTabState>) =>
    setSetTabs((s) => s.map((tb, i) => i === idx ? { ...tb, ...patch } : tb))

  /** API bileşen listesini ChecklistItem'lara çevirir (reçetedekiler işaretli). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toChecklist = (list: any[]): ChecklistItem[] =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (list ?? []).map((c: any) => ({
      bilesenID:    c.bilesenID,
      bilesenAdi:   c.bilesenAdi ?? '',
      birim:        c.birim ?? '',
      inRecipe:     !!c.inRecipe,
      defaultAdet:  c.defaultAdet ?? 1,
      defaultFiyat: c.defaultFiyat ?? 0,
      currency:     normalizeIso(c.currency),
      attributes:   (c.attributes ?? []) as string[],
      checked:      !!c.inRecipe,
    }))

  /**
   * PROMPT-v3 §2: kategori seçilince TÜM bileşenler checklist'e yüklenir (reçetedekiler
   * ön-işaretli). Sekmede bileşen varken kategori değişimi artık onay ister.
   */
  const onCategorySelect = async (idx: number, kategoriID: number) => {
    const tab = setTabs[idx]
    if (tab.kategoriID === kategoriID) return
    if (tab.components.length > 0 && !(await confirm({
      title: t('orders.confirm.categoryTitle'),
      description: t('orders.confirm.categoryDesc', { count: tab.components.length }),
      confirmLabel: t('orders.confirm.overwrite'),
    }))) return
    const cat = categories.find((c) => c.kategoriID === kategoriID)
    const kategoriAdi = cat?.kategoriAdi ?? ''
    // Katalog set fiyatı (UrunKategorileri.Fiyat) Euro bazlıdır; siparişin birimine çevrilir.
    const kategoriFiyat = priceIn(cat?.fiyat ?? 0, 'EUR')
    updateTab(idx, { kategoriID, kategoriAdi, kategoriFiyat, checklist: [], components: [] })
    try {
      const checklist = applyCategoryRules(kategoriAdi, toChecklist(await getComponentsByCategory(kategoriID)))
      setSetTabs((s) => s.map((tb, i) => i !== idx ? tb : {
        ...tb,
        checklist,
        components: checklist.filter((c) => c.checked).map((c) => buildRow(c, kategoriAdi, tb.adet, priceIn)),
      }))
    } catch (e) {
      toastApiError(toast, t('orders.toast.bilesenLoadFailed'), e)
    }
  }

  const toggleComponent = (idx: number, bilesenID: number, checked: boolean) =>
    setSetTabs((s) => s.map((tb, i) => {
      if (i !== idx) return tb
      const checklist = tb.checklist.map((c) => c.bilesenID === bilesenID ? { ...c, checked } : c)
      const components = checked
        ? [...tb.components, buildRow(checklist.find((c) => c.bilesenID === bilesenID)!, tb.kategoriAdi, tb.adet, priceIn)]
        : tb.components.filter((c) => c.bilesenID !== bilesenID)
      return { ...tb, checklist, components }
    }))

  /** PROMPT-v3 §2.3: ürün adedi → her satırın Adet'i defaultAdet × ürünAdedi. */
  const onUrunAdetChange = (idx: number, adet: number) =>
    setSetTabs((s) => s.map((tb, i) => i !== idx ? tb : {
      ...tb,
      adet,
      components: tb.components.map((c) => ({ ...c, adet: c.defaultAdet * adet })),
    }))

  const updateComponent = (tabIdx: number, rowIdx: number, patch: Partial<ComponentRow>) =>
    setSetTabs((s) => s.map((tb, i) => i !== tabIdx ? tb : {
      ...tb,
      components: tb.components.map((c, k) => k === rowIdx ? { ...c, ...patch } : c),
    }))

  /** F0-4 — "Seti kaldır" (eski İptal): onaylı; sekme boşalır, kayda girmez. */
  const removeSet = async (idx: number) => {
    const tab = setTabs[idx]
    if (!(await confirm({
      title: t('orders.confirm.setRemoveTitle'),
      description: tab.kategoriAdi,
      destructive: true,
      confirmLabel: t('orders.form.setRemove'),
    }))) return
    setSetTabs((s) => {
      // Dolu sekmeler sola kayar ki boşluk kalmasın.
      const next = s.filter((_, i) => i !== idx)
      next.push(emptySetTab())
      return next
    })
    setActiveTab('set-0')
  }

  // ── Teslimat / Montaj ──────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  const deliveryFilled = [form.tTelefon, form.tE_Mail, form.tAdres, form.tIlgiliKisi].some((v) => (v ?? '').trim())

  /** §3: "Müşteri adresiyle aynı" (legacy İlişkilendir) — doluysa onay ister. */
  const ilisikilendir = async () => {
    if (deliveryFilled && !(await confirm({
      title: t('orders.confirm.deliveryTitle'),
      description: t('orders.confirm.deliveryDesc'),
      confirmLabel: t('orders.confirm.overwrite'),
    }))) return
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
  }

  /** §4.1: Incoterms. EXW → "Fabrika" kayıtlı teslimat adresi + teslimatFiyat = 0. */
  const onTeslimatCesitiChange = (v: string) => {
    setForm((f) => ({
      ...f,
      teslimatCesiti: v,
      details: upsertClause(f.details, TESLIMAT_PREFIX, v ? teslimatCode(v) : null),
    }))
    if (v !== 'EXW') return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fabrika = (deliveryAddrs as any[]).find((d) => (d.teslimAlanAdi ?? d.TeslimAlanAdi) === 'Fabrika')
    if (!fabrika) {
      toast({ title: t('orders.toast.noFabrikaOption'), variant: 'warning' })
      return
    }
    applyDeliveryAddress(fabrika)
    setForm((f) => ({ ...f, teslimatFiyat: 0 }))
    toast({ title: t('orders.toast.exwApplied'), variant: 'default' })
  }

  /** §4.3: Montaj/Teslimat "Çarp" — fiyat × miktar fiyat alanına yazılır, miktar 1'e döner. */
  const carpField = (fiyatKey: 'montajFiyat' | 'teslimatFiyat', miktarKey: 'mAdet' | 'mTeslimat') => {
    const fiyat = Number(form[fiyatKey]), miktar = Number(form[miktarKey])
    if (!Number.isFinite(fiyat) || !Number.isFinite(miktar)) {
      toast({ title: t('orders.toast.invalidNumber'), variant: 'destructive' })
      return
    }
    setForm((f) => ({ ...f, [fiyatKey]: fiyat * miktar, [miktarKey]: 1 }))
  }

  // ── Kayıtlı siparişten forma yükleme (Revize/Amend/Getir/Kopyala) ──────
  const hydrateFromDetail = async (d: OrderDetail) => {
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
    const count = Math.min(groups.length, SET_COUNT)
    // §23 — kategori bileşenleri paralel ve tekilleştirilmiş çekilir.
    const uniqueCatIds = [...new Set(groups.slice(0, count).map((g) => g.kategoriID))]
    const fetched = await Promise.all(uniqueCatIds.map((id) => getComponentsByCategory(id).then(toChecklist)))
    const checklistByCat = new Map(uniqueCatIds.map((id, idx) => [id, fetched[idx]]))

    for (let i = 0; i < count; i++) {
      const g = groups[i]
      const kategoriAdi = categories.find((c) => c.kategoriID === g.kategoriID)?.kategoriAdi ?? ''
      const savedIds = new Set(g.comps.map((c) => c.bilesenID!))
      const checklist = (checklistByCat.get(g.kategoriID) ?? []).filter((c) =>
        !isPanoramicPadel(kategoriAdi) || c.inRecipe || savedIds.has(c.bilesenID))
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
            // Kayıtlı fiyat zaten siparişin para biriminde.
            kaynakFiyat:         sc.fiyat ?? 0,
            kaynakPara:          paraTipiToIso(d.paraTipi || 'Euro'),
          }
        }),
      }
      sets[i] = {
        kategoriID: g.kategoriID, adet: g.adet, kategoriFiyat: g.fiyat,
        components: g.comps.map((c) => ({ bilesenID: c.bilesenID!, oznitelikAdi: c.oznitelikAdi || undefined, adet: c.adet, fiyat: c.fiyat ?? 0 })),
      }
    }
    return { tabs, sets, odemeSekli: parseOdemeFromDetails(d.details ?? []) }
  }

  const applyLoaded = (d: OrderDetail, h: Awaited<ReturnType<typeof hydrateFromDetail>>) => {
    setSetTabs(h.tabs)
    paraIsoRef.current = paraTipiToIso(d.paraTipi || 'Euro')
    const next = { ...detailToForm(d), sets: h.sets }
    setForm(next)
    setOdemeSekli(h.odemeSekli)
    setCustomerId(null)
    setActiveTab('set-0')
    baselineRef.current = snapshotOf(next, h.tabs)
  }

  /** Referanstan oluştur (Formu Getir) / Kopyala ile yeni — YENİ kayıt olarak. */
  const loadFromOrder = async (no: string) => {
    setGetirLoading(true)
    try {
      const d = await getOrderDetail(no)
      applyLoaded(d, await hydrateFromDetail(d))
      setCreatedNo(null)
      setGetirOpen(false)
      toast({ title: t('orders.toast.formLoaded'), description: t('orders.toast.formLoadedDesc', { no }), variant: 'success' })
    } catch (e) {
      toastApiError(toast, t('orders.toast.formLoadFailed'), e)
    } finally {
      setGetirLoading(false)
    }
  }

  // Round-11 §1 — Revize/Amend tam geri-yükleme (kaynak başına bir kez).
  const hydratingRef = useRef<string | null>(null)
  useEffect(() => {
    if (!reviseSource || categories.length === 0 || !sourceNo) return
    if (hydratingRef.current === sourceNo) return
    hydratingRef.current = sourceNo
    let cancelled = false
    ;(async () => {
      try {
        const h = await hydrateFromDetail(reviseSource)
        if (cancelled) return
        applyLoaded(reviseSource, h)
        setHydratedNo(sourceNo)
      } catch (e) {
        hydratingRef.current = null // başarısızsa tekrar denenebilsin
        if (!cancelled) toastApiError(toast, t('orders.toast.formLoadFailed'), e)
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviseSource, categories, sourceNo])

  // E-14 — ?copyFrom=NO: kategoriler gelince bir kez yükle, sonra parametreyi temizle.
  const copiedRef = useRef(false)
  useEffect(() => {
    if (!copyFrom || copiedRef.current || categories.length === 0 || mode !== 'new') return
    copiedRef.current = true
    void loadFromOrder(copyFrom).then(() =>
      setParams((p) => { const np = new URLSearchParams(p); np.delete('copyFrom'); return np }, { replace: true }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [copyFrom, categories])

  // ── Kirli durum + taslak (E-12) + koruma (SR-9) ────────────────────────
  const snapshotOf = (f: CreateOrderDto, tabs: SetTabState[]) =>
    JSON.stringify({ f, s: tabs.map((x) => [x.kategoriID, x.kategoriFiyat, x.adet, x.components]) })
  const baselineRef = useRef<string>(snapshotOf(form, setTabs))
  const debounced = useDebouncedValue({ form, setTabs, odemeSekli }, 600)
  const dirty = useMemo(
    () => !createdNo && snapshotOf(debounced.form, debounced.setTabs) !== baselineRef.current,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [debounced, createdNo],
  )
  useUnsavedChangesGuard(dirty && !leaving && !saving)
  // Kaydet sonrası yönlendirme: koruma kapandıktan SONRA gider (efekt sırası önemli:
  // useBlocker kendi işlevini bu efektten önce günceller).
  useEffect(() => { if (leaving) nav(leaving) }, [leaving, nav])

  const [draft, setDraft] = useState<Draft | null>(() => {
    const d = readJSON<Draft | null>(draftKey, null)
    return d && d.form ? d : null
  })
  // Kirli form periyodik olarak taslağa yazılır (kayıt/atma sonrası silinir).
  useEffect(() => {
    if (!dirty || createdNo || draft) return
    writeJSON(draftKey, { form: debounced.form, setTabs: debounced.setTabs, odemeSekli: debounced.odemeSekli, savedAt: new Date().toISOString() } satisfies Draft)
  }, [debounced, dirty, createdNo, draft, draftKey])
  const restoreDraft = () => {
    if (!draft) return
    paraIsoRef.current = paraTipiToIso(draft.form.paraTipi || 'Euro')
    setForm(draft.form)
    setSetTabs(draft.setTabs.length === SET_COUNT ? draft.setTabs : [...draft.setTabs, ...Array.from({ length: SET_COUNT - draft.setTabs.length }, emptySetTab)].slice(0, SET_COUNT))
    setOdemeSekli(draft.odemeSekli)
    setDraft(null)
    toast({ title: t('orders.draft.restored'), variant: 'success' })
  }
  const discardDraft = () => { removeKey(draftKey); setDraft(null) }

  const resetForm = () => {
    const f = blankOrder(prefs)
    const tabs = Array.from({ length: SET_COUNT }, () => emptySetTab())
    paraIsoRef.current = paraTipiToIso(f.paraTipi)
    setForm(f); setSetTabs(tabs); setOdemeSekli(prefs.defaultOdemeSekli)
    setCreatedNo(null); setSubmitted(false); setCustomerId(null); setEkFileName(''); setActiveTab('set-0')
    baselineRef.current = snapshotOf(f, tabs)
    removeKey(userKey('draft', 'order', 'new', 'new'))
    if (mode !== 'new') nav('/orders/new', { replace: true })
  }

  // ── Toplamlar ──────────────────────────────────────────────────────────
  const totals = useMemo(() => computeTotals(form, setTabs), [form, setTabs])
  const sym = isoSymbol(orderIso)
  const filledTabs = setTabs.filter((tb) => tb.kategoriID != null).length
  const visibleTabCount = Math.min(SET_COUNT, filledTabs + 1)

  // ── Klavye ─────────────────────────────────────────────────────────────
  const onEnterNav = useEnterNavigation({ onSubmit: () => setPreviewOpen(true) })
  useHotkeys({
    // Ctrl+S → gözden geçir ve kaydet (tek tuşla yanlışlıkla sipariş oluşmaz).
    'ctrl+s': () => { if (!createdNo) setPreviewOpen(true) },
  })
  useShortcutHints([
    { keys: 'Ctrl+S', label: t('shortcuts.save') },
    { keys: 'Enter', label: t('shortcuts.nextField') },
    { keys: 'F4', label: t('shortcuts.lookup') },
  ])

  const saveButtons = (
    <>
      {mode === 'new' && (
        <>
          <Button variant="secondary" loading={quoteMut.isPending} disabled={!!createdNo || saving} onClick={() => runSave('quote')}>
            {t('orders.form.teklifiHazirla')}
          </Button>
          <Button loading={orderMut.isPending} disabled={!!createdNo || saving} onClick={() => runSave('order')}>
            {t('orders.form.siparisiHazirla')}
          </Button>
        </>
      )}
      {mode === 'revise' && (
        <Button loading={orderMut.isPending} disabled={!!createdNo || saving || hydrating} onClick={() => runSave('order')}>
          {t('orders.form.revizeEt')}
        </Button>
      )}
      {mode === 'amend' && (
        <Button loading={amendMut.isPending} disabled={!!createdNo || saving || hydrating} onClick={() => runSave('amend')}>
          {t('myOrders.amend.save')}
        </Button>
      )}
    </>
  )

  const sectionNav: { id: string; label: string; ok: boolean | null }[] = [
    { id: 'sec-customer', label: t('orders.sections.musteri'), ok: !issues.includes('musteriAd') },
    { id: 'order-sets', label: t('orders.nav.sets', { count: filledTabs }), ok: !issues.includes('lineItems') },
    { id: 'sec-delivery', label: t('orders.sections.teslimatMontaj'), ok: null },
    { id: 'sec-cari', label: t('orders.sections.cariBilgi'), ok: !issues.includes('pesinYuzde') },
    { id: 'sec-terms', label: t('orders.form.details'), ok: null },
  ]

  const title = isAmendMode ? `${t('myOrders.actions.duzenle')} — ${amendFrom}`
    : isReviseMode ? `${t('orders.reviseTitle')} — ${reviseFrom}` : t('orders.newOrderTitle')

  return (
    <div>
      <PageHeader
        title={title}
        description={mode === 'new' ? t('orders.subtitle') : undefined}
        meta={dirty ? <Badge variant="warning">{t('orders.unsavedBadge')}</Badge> : undefined}
        actions={mode === 'new' && (dirty || createdNo) ? (
          <Button size="sm" variant="ghost" onClick={async () => {
            if (dirty && !(await confirm({ title: t('orders.confirm.resetTitle'), description: t('orders.confirm.resetDesc'), destructive: true, confirmLabel: t('orders.newForm') }))) return
            resetForm()
          }}>
            <FilePlus2 className="h-4 w-4" /> {t('orders.newForm')}
          </Button>
        ) : undefined}
      />

      <div className="space-y-4 p-4 lg:p-6">
        {/* Kayıt sonrası başarı paneli — önceden butonlar sessizce kilitleniyordu. */}
        {createdNo && (
          <div role="status" className="flex flex-wrap items-center gap-3 rounded-md border border-success/40 bg-success-soft px-4 py-3 text-success-soft-foreground">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold">{t('orders.success.title', { no: createdNo })}</p>
              <p className="text-sm opacity-90">{t('orders.success.desc')}</p>
            </div>
            <Button size="sm" variant="outline" className="bg-background" onClick={() => setParams((p) => { const np = new URLSearchParams(p); np.set('order', createdNo); return np })}>
              <Eye className="h-4 w-4" /> {t('common.details')}
            </Button>
            <Button size="sm" variant="outline" className="bg-background" onClick={() => ekInputRef.current?.click()}>
              <Paperclip className="h-4 w-4" /> {t('orders.form.ek')}
            </Button>
            <Button size="sm" variant="outline" className="bg-background" asChild>
              <Link to="/orders/mine">{t('nav.myOrders')}</Link>
            </Button>
            <Button size="sm" onClick={resetForm}><FilePlus2 className="h-4 w-4" /> {t('orders.newForm')}</Button>
          </div>
        )}

        {/* E-12 — kaydedilmemiş taslak */}
        {draft && !createdNo && (
          <div role="status" className="flex flex-wrap items-center gap-3 rounded-md border border-info/40 bg-info-soft px-4 py-2 text-sm text-info-soft-foreground">
            <History className="h-4 w-4 shrink-0" />
            <span className="flex-1">
              {t('orders.draft.found', { time: new Date(draft.savedAt).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' }), customer: draft.form.musteriAd || '—' })}
            </span>
            <Button size="xs" onClick={restoreDraft} disabled={hydrating}>{t('orders.draft.restore')}</Button>
            <Button size="xs" variant="ghost" onClick={discardDraft}>{t('orders.draft.discard')}</Button>
          </div>
        )}

        {isReviseMode && (
          <div className="rounded-md border border-warning/40 bg-warning-soft px-4 py-2 text-sm text-warning-soft-foreground">
            <strong>{t('orders.reviseBanner')}:</strong>{' '}
            <span className="font-mono">{reviseFrom}</span>
            {(reviseLoading || hydrating) && <span className="ml-2 opacity-80">({t('common.loading')})</span>}
          </div>
        )}

        {/* Round-8 §7 — yerinde düzenleme bandı + zorunlu gerekçe. */}
        {isAmendMode && (
          <div className="space-y-2 rounded-md border border-warning/40 bg-warning-soft px-4 py-3 text-sm text-warning-soft-foreground">
            <div>
              <strong>{t('myOrders.amend.banner')}:</strong>{' '}
              <span className="font-mono">{amendFrom}</span>
              {(reviseLoading || hydrating) && <span className="ml-2 opacity-80">({t('common.loading')})</span>}
            </div>
            <FormField
              id="order-amendReason"
              label={t('myOrders.amend.reason')}
              required
              error={submitted && !amendGerekce.trim() ? t('validation.required') : null}
              labelClassName="text-warning-soft-foreground"
            >
              <Textarea rows={2} value={amendGerekce} onChange={(e) => setAmendGerekce(e.target.value)} className="bg-background" />
            </FormField>
          </div>
        )}

        {/* Temsilci devri — YALNIZ elshan.rasulov, revize/düzenleme modunda. */}
        {(isReviseMode || isAmendMode) && canReassign && (
          <div className="space-y-1 rounded-md border px-4 py-3 text-sm">
            <FormField label={t('orderDetail.temsilci')} hint={t('orders.repReassignHint')}>
              <Select value={selectedRepId || undefined} onValueChange={setSelectedRepId}>
                <SelectTrigger className="w-64"><SelectValue placeholder={t('orderDetail.selectRep')} /></SelectTrigger>
                <SelectContent>
                  {repOptions.map((u) => (
                    <SelectItem key={u.kullaniciID} value={String(u.kullaniciID)}>{`${u.ad} ${u.soyad}`.trim()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>
        )}

        {/* Bölüm gezintisi (Fiori Object Page çapa çubuğu) — durum işaretli. */}
        <nav aria-label={t('orders.nav.label')} className="sticky top-0 z-20 -mx-4 flex gap-1 overflow-x-auto border-b bg-background/95 px-4 py-1.5 backdrop-blur lg:-mx-6 lg:px-6">
          {sectionNav.map((s, i) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={(e) => { e.preventDefault(); document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}
              className="flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-xs hover:bg-accent"
            >
              <span className="text-muted-foreground">{i + 1}</span>
              <span>{s.label}</span>
              {s.ok === true && <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
              {s.ok === false && submitted && <CircleAlert className="h-3.5 w-3.5 text-warning" />}
            </a>
          ))}
        </nav>

        <div
          className="grid grid-cols-1 gap-4 xl:grid-cols-[300px_minmax(0,1fr)_340px]"
          onKeyDown={prefs.enterNavigation ? onEnterNav : undefined}
        >
          {/* ── SOL: MÜŞTERİ + TEMSİLCİ ─────────────────────────────────── */}
          <div className="min-w-0 space-y-4">
            <section id="sec-customer" className="scroll-mt-14 space-y-2 rounded-md border bg-card p-3">
              <SectionTitle actions={
                <Button type="button" variant="ghost" size="xs" onClick={() => nav('/customers/new')} title={t('orders.form.musteriEkle')}>
                  <UserPlus className="h-3.5 w-3.5" /> {t('common.add')}
                </Button>
              }>{t('orders.sections.musteri')}</SectionTitle>
              <FormField label={t('orders.form.musteri')} hint={t('orders.form.musteriHint')}>
                <Combobox
                  options={customerOptions}
                  value={effectiveCustomerId ? String(effectiveCustomerId) : ''}
                  onValueChange={(v) => onCustomerSelect(Number(v))}
                  onLookup={() => setCustomerLookupOpen(true)}
                  placeholder={t('orders.form.musteriSec')}
                  loading={customersLoading}
                />
              </FormField>
              {/* E-16 — açık bakiye (bilgilendirici, engellemez). */}
              {openLines.length > 0 && (
                <div className="rounded-md border border-warning/40 bg-warning-soft px-2 py-1.5 text-xs text-warning-soft-foreground">
                  <span className="font-medium">{t('orders.form.openBalance')}:</span>{' '}
                  {openLines.map((l) => formatMoney(l.kalan, l.paraTipi)).join(' · ')}
                </div>
              )}
              <FormField id="order-musteriAd" label={t('orders.form.musteriAd')} required
                error={submitted && !form.musteriAd.trim() ? t('validation.required') : null}>
                <Input value={form.musteriAd} onChange={(e) => setForm((f) => ({ ...f, musteriAd: e.target.value }))} />
              </FormField>
              <div className="grid grid-cols-2 gap-2">
                <FormField label={t('orders.form.telefon')}>
                  <Input value={form.mTelefon ?? ''} onChange={(e) => setForm((f) => ({ ...f, mTelefon: e.target.value }))} />
                </FormField>
                <FormField label={t('orders.form.zipCode')}>
                  <Input value={form.mZipKod ?? ''} onChange={(e) => setForm((f) => ({ ...f, mZipKod: e.target.value }))} />
                </FormField>
              </div>
              <FormField label={t('orders.form.email')}>
                <Input type="email" value={form.mMail ?? ''} onChange={(e) => setForm((f) => ({ ...f, mMail: e.target.value }))} />
              </FormField>
              <FormField label={t('orders.form.ulke')}>
                <Combobox options={countryOptions} value={form.mUlke ?? ''} onValueChange={(v) => setForm((f) => ({ ...f, mUlke: v }))} placeholder={t('orders.form.ulkeSec')} />
              </FormField>
              <FormField label={t('orders.form.vat')}>
                <Input value={form.mVATNumarasi ?? ''} onChange={(e) => setForm((f) => ({ ...f, mVATNumarasi: e.target.value }))} />
              </FormField>
              <FormField label={t('orders.form.adres')}>
                <Textarea rows={3} value={form.mAdres ?? ''} onChange={(e) => setForm((f) => ({ ...f, mAdres: e.target.value }))} />
              </FormField>
            </section>

            <section className="space-y-2 rounded-md border bg-card p-3">
              <SectionTitle>{t('orders.sections.temsilci')}</SectionTitle>
              <FormField label={t('orders.form.temsilciIsmi')}>
                <Input value={temsilciAdSoyad} readOnly disabled data-enter-skip />
              </FormField>
              {/* PROMPT-v7 §6 — Ödeme Şekli: seçim Detaylar'a 'Ödeme Şekli: …' satırı
                  upsert eder; Vadeli, Peşin % değişince senkron kalır. */}
              <FormField label={t('orders.form.odemeSekli')}>
                <Select value={odemeSekli || undefined} onValueChange={(v) => {
                  const sekli = v as 'Pesin' | 'Vadeli'
                  setOdemeSekli(sekli)
                  setForm((f) => ({ ...f, details: upsertClause(f.details, ODEME_PREFIX, odemeCode(sekli, f.pesinYuzde)) }))
                }}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pesin">{t('orders.form.odemePesin')}</SelectItem>
                    <SelectItem value="Vadeli">{t('orders.form.odemeVadeli')}</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label={t('orders.form.siparisNotu')}>
                <Textarea rows={2} value={form.siparisNotu ?? ''} onChange={(e) => setForm((f) => ({ ...f, siparisNotu: e.target.value }))} />
              </FormField>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">{t('orders.form.ek')}</p>
                <Button type="button" variant="outline" size="sm" className="w-full" disabled={!createdNo} loading={uploadMut.isPending} onClick={() => ekInputRef.current?.click()}>
                  <Paperclip className="h-4 w-4" /> {ekFileName || t('orders.form.ekSec')}
                </Button>
                <input
                  ref={ekInputRef}
                  type="file"
                  accept=".zip,.rar"
                  className="sr-only"
                  aria-label={t('orders.form.ekDosya')}
                  disabled={!createdNo}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file && createdNo) {
                      setEkFileName(file.name)
                      uploadMut.mutate({ no: createdNo, file })
                    }
                    e.target.value = ''
                  }}
                />
                <p className="text-[11px] text-muted-foreground">
                  {createdNo ? t('orders.form.ekHint') : t('orders.form.saveFirstHint')}
                </p>
              </div>
            </section>
          </div>

          {/* ── ORTA: SETLER + SERBEST KALEMLER + TESLİMAT ──────────────── */}
          <div className="min-w-0 space-y-4">
            <section id="order-sets" className="scroll-mt-14 rounded-md border bg-card">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="flex items-center gap-2 border-b px-2">
                  <TabsList className="h-auto flex-wrap justify-start bg-transparent py-1">
                    {Array.from({ length: visibleTabCount }, (_, i) => {
                      const tb = setTabs[i]
                      const filled = tb.kategoriID != null
                      return (
                        <TabsTrigger key={i} value={`set-${i}`} className="gap-1.5 px-2.5 py-1 text-xs">
                          {filled ? (
                            <>
                              <span className="h-2 w-2 rounded-full bg-success" aria-hidden />
                              <span className="max-w-[10rem] truncate">{tb.kategoriAdi || t('orders.form.siparisN', { n: i + 1 })}</span>
                              {tb.adet > 1 && <span className="text-muted-foreground">×{tb.adet}</span>}
                              <span className="tabular-nums text-muted-foreground">{formatNumberTR(tb.kategoriFiyat * tb.adet, 0)} {sym}</span>
                            </>
                          ) : (
                            <><Plus className="h-3 w-3" /> {t('orders.form.setAdd')}</>
                          )}
                        </TabsTrigger>
                      )
                    })}
                  </TabsList>
                  <span className="ml-auto hidden shrink-0 text-[11px] text-muted-foreground md:block">
                    {t('orders.form.setIncludedHint')}
                  </span>
                </div>
                {submitted && issues.includes('lineItems') && (
                  <p role="alert" className="px-4 pt-3 text-xs text-destructive">{t('orders.issues.lineItems')}</p>
                )}
                {Array.from({ length: visibleTabCount }, (_, i) => (
                  <TabsContent key={i} value={`set-${i}`} className="m-0 p-4">
                    <SetTabPanel
                      index={i}
                      tab={setTabs[i]}
                      categoryOptions={categoryOptions}
                      sym={sym}
                      viewIso={viewIso}
                      createdNo={createdNo}
                      expandPending={expandMut.isPending}
                      onCategorySelect={(id) => onCategorySelect(i, id)}
                      onRemove={() => removeSet(i)}
                      onUpdate={(patch) => updateTab(i, patch)}
                      onUrunAdetChange={(adet) => onUrunAdetChange(i, adet)}
                      onToggleComponent={(id, c) => toggleComponent(i, id, c)}
                      onUpdateComponent={(k, patch) => updateComponent(i, k, patch)}
                      shownPrice={shownPrice}
                      priceIn={priceIn}
                      onExpandRecipe={() => {
                        const tb = setTabs[i]
                        if (createdNo && tb.kategoriID) expandMut.mutate({ no: createdNo, kategoriId: tb.kategoriID, adet: tb.adet })
                      }}
                    />
                  </TabsContent>
                ))}
              </Tabs>
            </section>

            <FreeItemsSection
              items={form.freeItems ?? []}
              onChange={(next) => setForm((f) => ({ ...f, freeItems: next }))}
              sym={sym}
            />

            <CollapsibleSection
              id="sec-delivery"
              title={t('orders.sections.teslimatMontaj')}
              summary={[
                form.montajVar ? t('orders.form.montaj') : null,
                form.teslimatVar ? `${t('orders.form.teslimat')}${form.teslimatCesiti ? ` (${form.teslimatCesiti})` : ''}` : null,
                (form.extraCosts ?? []).length ? t('orders.form.extraCount', { count: (form.extraCosts ?? []).length }) : null,
              ].filter(Boolean).join(' · ') || t('orders.form.none')}
              defaultOpen
            >
              <div className="space-y-4 p-3">
                <div className="flex flex-wrap items-center gap-6">
                  <Checkbox
                    label={t('orders.form.montaj')}
                    checked={form.montajVar}
                    onCheckedChange={(montajVar) => setForm((f) => ({
                      ...f,
                      montajVar,
                      // §5 — Montaj seçilince "montaj dahil değildir" şartı kaldırılır.
                      details: montajVar
                        ? f.details.filter((s) => s !== CLAUSE.MONTAJ)
                        : (f.details.includes(CLAUSE.MONTAJ) ? f.details : [...f.details, CLAUSE.MONTAJ]),
                    }))}
                  />
                  <Checkbox
                    label={t('orders.form.teslimat')}
                    checked={form.teslimatVar}
                    onCheckedChange={(teslimatVar) => setForm((f) => ({ ...f, teslimatVar }))}
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="grid grid-cols-[1fr_80px_auto] items-end gap-2">
                    <FormField label={t('orders.form.montajFiyat')} prefix={sym}>
                      <DecimalInput value={form.montajFiyat} disabled={!form.montajVar}
                        onValueChange={(v) => setForm((f) => ({ ...f, montajFiyat: v === '' ? 0 : v }))} />
                    </FormField>
                    <FormField label={t('orders.form.miktar')}>
                      <Input type="number" min={1} value={form.mAdet} disabled={!form.montajVar}
                        onChange={(e) => setForm((f) => ({ ...f, mAdet: Math.max(1, Number(e.target.value) || 1) }))} />
                    </FormField>
                    <Button type="button" size="sm" variant="outline" disabled={!form.montajVar} title={t('orders.form.carpHint')} onClick={() => carpField('montajFiyat', 'mAdet')}>
                      {t('orders.form.carp')}
                    </Button>
                  </div>
                  <div className="grid grid-cols-[1fr_80px_auto] items-end gap-2">
                    <FormField label={t('orders.form.teslimatFiyat')} prefix={sym}>
                      <DecimalInput value={form.teslimatFiyat} disabled={!form.teslimatVar}
                        onValueChange={(v) => setForm((f) => ({ ...f, teslimatFiyat: v === '' ? 0 : v }))} />
                    </FormField>
                    <FormField label={t('orders.form.miktar')}>
                      <Input type="number" min={1} value={form.mTeslimat} disabled={!form.teslimatVar}
                        onChange={(e) => setForm((f) => ({ ...f, mTeslimat: Math.max(1, Number(e.target.value) || 1) }))} />
                    </FormField>
                    <Button type="button" size="sm" variant="outline" disabled={!form.teslimatVar} title={t('orders.form.carpHint')} onClick={() => carpField('teslimatFiyat', 'mTeslimat')}>
                      {t('orders.form.carp')}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 border-t pt-3">
                  <div className="grid gap-2 md:grid-cols-[1fr_120px]">
                    <FormField label={t('orders.form.teslimAlanAdi')}>
                      <Combobox
                        options={deliveryOptions}
                        allowCustom
                        value={form.tTeslimAlanAdi ?? ''}
                        placeholder={t('orders.form.sec')}
                        onValueChange={(v, opt) => {
                          // §4.2: kayıt seçilince ilgili kişi/telefon/ülke vs. dolsun.
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          const a = opt ? (deliveryAddrs as any[]).find((d) => String(d.teslimAlanAdi ?? d.TeslimAlanAdi) === v) : null
                          if (a) applyDeliveryAddress(a)
                          else setForm((f) => ({ ...f, tTeslimAlanAdi: v }))
                        }}
                      />
                    </FormField>
                    <FormField label={t('orders.form.cesidi')}>
                      <Select value={form.teslimatCesiti || undefined} onValueChange={onTeslimatCesitiChange}>
                        <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>{INCOTERMS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </FormField>
                  </div>
                  <div className="flex items-end gap-2">
                    <FormField label={t('orders.form.ilgiliKisi')} className="flex-1">
                      <Input value={form.tIlgiliKisi ?? ''} onChange={(e) => setForm((f) => ({ ...f, tIlgiliKisi: e.target.value }))} />
                    </FormField>
                    <Button type="button" variant="outline" size="sm" onClick={ilisikilendir} title={t('orders.form.iliskilendirHint')}>
                      {t('orders.form.sameAsCustomer')}
                    </Button>
                  </div>
                  <div className="grid gap-2 md:grid-cols-3">
                    <FormField label={t('orders.form.ulke')}>
                      <Combobox options={countryOptions} value={form.tUlke ?? ''} onValueChange={(v) => setForm((f) => ({ ...f, tUlke: v }))} placeholder={t('orders.form.ulkeSec')} />
                    </FormField>
                    <FormField label={t('orders.form.telefon')}>
                      <Input value={form.tTelefon ?? ''} onChange={(e) => setForm((f) => ({ ...f, tTelefon: e.target.value }))} />
                    </FormField>
                    <FormField label={t('orders.form.altTelefon')}>
                      <Input value={form.tAltTelefon ?? ''} onChange={(e) => setForm((f) => ({ ...f, tAltTelefon: e.target.value }))} />
                    </FormField>
                    <FormField label={t('orders.form.email')}>
                      <Input type="email" value={form.tE_Mail ?? ''} onChange={(e) => setForm((f) => ({ ...f, tE_Mail: e.target.value }))} />
                    </FormField>
                    <FormField label={t('orders.form.zipCode')}>
                      <Input value={form.tZipKod ?? ''} onChange={(e) => setForm((f) => ({ ...f, tZipKod: e.target.value }))} />
                    </FormField>
                    <FormField label={t('orders.form.vat')}>
                      <Input value={form.tVATNumarasi ?? ''} onChange={(e) => setForm((f) => ({ ...f, tVATNumarasi: e.target.value }))} />
                    </FormField>
                  </div>
                  <FormField label={t('orders.form.adres')}>
                    <Textarea rows={2} value={form.tAdres ?? ''} onChange={(e) => setForm((f) => ({ ...f, tAdres: e.target.value }))} />
                  </FormField>
                </div>

                {/* Ekstra maliyet — her kalem proformaya ayrı satır olur ve toplama eklenir. */}
                <div className="space-y-2 border-t pt-3">
                  <SectionTitle as="h4" actions={
                    <Button type="button" size="xs" variant="outline"
                      onClick={() => setForm((f) => ({ ...f, extraCosts: [...(f.extraCosts ?? []), { aciklama: '', tutar: 0 }] }))}>
                      <Plus className="h-3.5 w-3.5" /> {t('common.add')}
                    </Button>
                  }>{t('orders.form.ekstraMaliyet')}</SectionTitle>
                  {(form.extraCosts ?? []).map((ec, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_130px_auto] items-end gap-2">
                      <FormField label={t('orders.form.ekstraMaliyetAciklama')}>
                        <Input value={ec.aciklama} onChange={(e) => setForm((f) => {
                          const next = [...(f.extraCosts ?? [])]
                          next[idx] = { ...next[idx], aciklama: e.target.value }
                          return { ...f, extraCosts: next }
                        })} />
                      </FormField>
                      <FormField label={t('orders.form.ekstraMaliyetTutar')} suffix={sym}>
                        <DecimalInput value={ec.tutar} onValueChange={(v) => setForm((f) => {
                          const next = [...(f.extraCosts ?? [])]
                          next[idx] = { ...next[idx], tutar: v === '' ? 0 : v }
                          return { ...f, extraCosts: next }
                        })} />
                      </FormField>
                      <Button type="button" size="icon" variant="ghost" className="text-destructive" aria-label={t('common.delete')}
                        onClick={async () => {
                          const filled = ec.aciklama.trim() || Number(ec.tutar) > 0
                          if (filled && !(await confirm({ title: t('orders.confirm.extraRemoveTitle'), description: ec.aciklama || formatMoney(Number(ec.tutar), form.paraTipi), destructive: true, confirmLabel: t('common.delete') }))) return
                          setForm((f) => ({ ...f, extraCosts: (f.extraCosts ?? []).filter((_, i) => i !== idx) }))
                        }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CollapsibleSection>
          </div>

          {/* ── SAĞ: ÖZET (yapışkan) + CARİ BİLGİ ──────────────────────── */}
          <div className="min-w-0 space-y-4 xl:sticky xl:top-12 xl:max-h-[calc(100vh-9rem)] xl:self-start xl:overflow-y-auto">
            <OrderSummaryRail
              totals={totals}
              sym={sym}
              pesinYuzde={form.pesinYuzde}
              indirim={form.indirim}
              kdv={form.kdv}
              issues={issues}
              setCount={filledTabs}
              freeCount={(form.freeItems ?? []).length}
              docNo={createdNo ?? sourceNo}
            />

            <section id="sec-cari" className="scroll-mt-14 space-y-3 rounded-md border bg-card p-3">
              <SectionTitle>{t('orders.sections.cariBilgi')}</SectionTitle>
              {/* Kur çevirici — seçim siparişin Para Tipi'dir; bileşen fiyatları bu birime çevrilir. */}
              <div className="space-y-1.5">
                <div className="grid grid-cols-4 gap-1" role="radiogroup" aria-label={t('orders.form.paraTipi')}>
                  {PARA_TIPLERI.map((p) => {
                    const iso = paraTipiToIso(p)
                    const kur = iso === 'TRY' ? 1 : rates[iso]
                    const secili = form.paraTipi === p
                    return (
                      <Button
                        key={p}
                        type="button"
                        role="radio"
                        aria-checked={secili}
                        size="sm"
                        variant={secili ? 'default' : 'outline'}
                        className="flex h-auto flex-col items-center px-1.5 py-1 leading-tight"
                        onClick={() => changeCurrency(p)}
                        data-enter-skip
                      >
                        <span className="text-xs font-medium">{isoSymbol(iso)} {p}</span>
                        <span className={`text-[10px] tabular-nums ${secili ? 'opacity-90' : 'text-muted-foreground'}`}>
                          {iso === 'TRY' ? '—' : kur ? `${formatNumberTR(kur)} ₺` : '?'}
                        </span>
                      </Button>
                    )
                  })}
                </div>
                <div className="text-[11px] tabular-nums text-muted-foreground">
                  {tcmb?.tarih
                    ? <>{t('currency.source')}: TCMB {tcmb.tarih.split('-').reverse().join('.')}
                        {kurZamani ? <span className="opacity-70"> · {t('currency.refreshed')} {new Date(kurZamani).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {t('currency.hourly')}</span> : null}</>
                    : <span className="text-warning">{t('currency.sourceUnavailable')}</span>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* PROMPT-v2 §3: boş → null (display blank); coercion yalnız hesapta. */}
                <FormField label={t('orders.form.indirim').replace(' %', '')} suffix="%">
                  <DecimalInput value={form.indirim ?? ''} onValueChange={(v) => setForm((f) => ({ ...f, indirim: v === '' ? null : v }))} />
                </FormField>
                <FormField label={t('orders.form.kdv').replace(' %', '')} suffix="%">
                  <DecimalInput value={form.kdv ?? ''} onValueChange={(v) => setForm((f) => ({ ...f, kdv: v === '' ? null : v }))} />
                </FormField>
                <FormField id="order-pesinYuzde" label={t('orders.form.pesin').replace(' %', '')} suffix="%" required
                  error={submitted && (form.pesinYuzde == null || form.pesinYuzde <= 0) ? t('validation.required') : null}>
                  <DecimalInput value={form.pesinYuzde ?? ''} onValueChange={(v) => setForm((f) => {
                    const pesinYuzde = v === '' ? null : v
                    // PROMPT-v6 §5 — Vadeli seçiliyken Ödeme Şekli satırı pesinYuzde ile senkron.
                    const details = odemeSekli === 'Vadeli'
                      ? upsertClause(f.details, ODEME_PREFIX, odemeCode('Vadeli', pesinYuzde))
                      : f.details
                    return { ...f, pesinYuzde, details }
                  })} />
                </FormField>
                <FormField label={t('orders.form.sirket')}>
                  <Select value={form.sirket} onValueChange={(v) => setForm((f) => ({ ...f, sirket: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{SIRKETLER.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </FormField>
              </div>
            </section>
          </div>
        </div>

        {/* §31 — DETAYLAR: 17 standart şart + serbest notlar. Varsayılan kapalı (özetle). */}
        <CollapsibleSection
          id="sec-terms"
          title={t('orders.form.details')}
          summary={t('orders.form.termsSummary', {
            checked: (form.details ?? []).filter((d) => STANDART_DETAY_SARTLARI.includes(d)).length,
            total: STANDART_DETAY_SARTLARI.length,
            notes: (form.details ?? []).filter(isFreeNote).length,
          })}
        >
          <div className="space-y-4 p-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">{t('orders.form.standardTerms')}</p>
                <div className="flex gap-1">
                  <Button type="button" size="xs" variant="ghost" onClick={() => STANDART_DETAY_SARTLARI.forEach((c) => toggleClause(c, true))}>{t('table.selectAll')}</Button>
                  <Button type="button" size="xs" variant="ghost" onClick={() => STANDART_DETAY_SARTLARI.forEach((c) => toggleClause(c, false))}>{t('common.clear')}</Button>
                </div>
              </div>
              <div className="grid gap-x-6 gap-y-1 rounded-md border p-3 sm:grid-cols-2">
                {STANDART_DETAY_SARTLARI.map((clause) => (
                  <Checkbox
                    key={clause}
                    label={clause}
                    labelClassName="items-start text-sm [&>input]:mt-0.5"
                    checked={(form.details ?? []).includes(clause)}
                    onCheckedChange={(c) => toggleClause(clause, c)}
                    data-enter-skip
                  />
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">{t('orders.form.freeNotes')}</p>
              <div className="flex gap-2">
                <Input
                  value={newDetailNote}
                  data-enter-skip
                  onChange={(e) => setNewDetailNote(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDetailNote() } }}
                  placeholder={t('orders.form.freeNotePlaceholder')}
                  aria-label={t('orders.form.freeNotes')}
                />
                <Button type="button" variant="outline" onClick={addDetailNote}>{t('common.add')}</Button>
              </div>
              {(form.details ?? []).filter(isFreeNote).length > 0 && (
                <ul className="space-y-1 rounded-md border p-2">
                  {(form.details ?? []).map((d, i) => isFreeNote(d) ? (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="flex-1 whitespace-pre-wrap">{d}</span>
                      <Button type="button" size="icon-sm" variant="ghost" aria-label={t('common.delete')}
                        onClick={() => setForm((f) => ({ ...f, details: f.details.filter((_, j) => j !== i) }))}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </li>
                  ) : null)}
                </ul>
              )}
            </div>
          </div>
        </CollapsibleSection>

        {/* ── Yapışkan aksiyon çubuğu (dar ekranda toplam burada görünür) ── */}
        <div className="sticky bottom-0 z-20 -mx-4 flex flex-wrap items-center gap-2 border-t bg-background/95 px-4 py-2.5 backdrop-blur lg:-mx-6 lg:px-6">
          <div className="mr-auto flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
            <span>{t('orders.form.toplamFiyatLabel')}: <strong className="tabular-nums">{formatNumberTR(totals.toplam)} {sym}</strong></span>
            <span className="text-muted-foreground">{t('orders.form.kaporaMiktari')}: <span className="tabular-nums">{formatNumberTR(totals.kapora)} {sym}</span></span>
            {submitted && issues.length > 0 && (
              <button type="button" className="flex items-center gap-1 text-xs text-warning" onClick={() => focusIssue(issues[0])}>
                <CircleAlert className="h-3.5 w-3.5" /> {t('orders.summary.missingCount', { count: issues.length })}
              </button>
            )}
          </div>
          <Button variant="outline" onClick={() => setPreviewOpen(true)} title="Ctrl+S">
            <Eye className="h-4 w-4" /> {t('orders.form.onizleme')}
          </Button>
          {/* F0-5 — revize/düzenlemede başka siparişi yüklemek kaynağı ezerdi: gizli. */}
          {mode === 'new' && (
            <Button variant="outline" onClick={() => setGetirOpen(true)} disabled={!!createdNo}>{t('orders.form.formuGetir')}</Button>
          )}
          {mode === 'revise' && (
            <Button variant="outline" disabled={saving} onClick={() => nav('/orders/mine')}>{t('common.cancel')}</Button>
          )}
          {saveButtons}
        </div>

        <LoadOrderDialog open={getirOpen} onOpenChange={setGetirOpen} onPick={loadFromOrder} loading={getirLoading} />
        <OrderPreviewDialog
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          form={form}
          tabs={setTabs}
          totals={totals}
          sym={sym}
          footer={!createdNo ? (
            <>
              {issues.length > 0 && (
                <p className="mr-auto flex items-center gap-1 text-xs text-warning">
                  <CircleAlert className="h-3.5 w-3.5" /> {issues.map((i) => t(`orders.issues.${i}`)).join(' · ')}
                </p>
              )}
              <Button variant="outline" onClick={() => setPreviewOpen(false)}>{t('common.back')}</Button>
              {saveButtons}
            </>
          ) : undefined}
        />
        <LookupDialog
          open={customerLookupOpen}
          onOpenChange={setCustomerLookupOpen}
          title={t('orders.form.musteriSec')}
          rows={customers}
          getKey={(c) => c.musteriID}
          onSelect={(c) => onCustomerSelect(c.musteriID)}
          columns={[
            { key: 'ad', header: t('orders.form.musteri'), value: (c) => c.musteriAd },
            { key: 'ulke', header: t('orders.form.ulke'), value: (c) => c.ulkeAdi },
            { key: 'vat', header: t('orders.form.vat'), value: (c) => c.vatNumarasi },
            { key: 'tel', header: t('orders.form.telefon'), value: (c) => c.telefon },
            { key: 'mail', header: t('orders.form.email'), value: (c) => c.e_Mail, className: 'hidden md:table-cell' },
          ]}
        />
      </div>
    </div>
  )
}

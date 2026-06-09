import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  createOrder, createQuote, getCategories, expandRecipe, uploadAttachment,
  getDeliveryAddresses,
  // PROMPT.md #20: revise wire-up — pre-load + swap save mutation.
  getOrderDetail, reviseOrder,
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
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ToastProvider'
import { FieldError } from '@/components/FieldError'
import type { CreateOrderDto, OrderSetInput } from '@/types'

const PARA_TIPLERI_RADIO = ['Euro', 'Dolar', 'TL'] as const
const PARA_TIPLERI_DIGER = ['Sterlin'] as const
const SIRKETLER = ['Unixpadel', 'ArsSport', 'AselCocuk'] as const

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

/** Local UI state for the Sipariş 1..5 tabs (legacy "Çarp" → push set). */
interface SetTabState {
  kategoriID: number | null
  kategoriFiyat: number   // tekil fiyat
  adet: number
}
const emptySetTab = (): SetTabState => ({ kategoriID: null, kategoriFiyat: 0, adet: 1 })

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
    setForm({
      musteriAd:    reviseSource.musteriAd,
      siparisNotu:  reviseSource.siparisNotu ?? '',
      sTelefon:     reviseSource.sTelefon ?? '',
      sFax:         reviseSource.sFax ?? '',
      sWeb:         reviseSource.sWeb ?? '',
      sE_Mail:      reviseSource.sE_Mail ?? '',
      sVatNumarasi: reviseSource.sVatNumarasi ?? '',
      sUlke:        reviseSource.sUlke ?? '',
      sAdres:       reviseSource.sAdres ?? '',
      montajVar:    reviseSource.montajVar,
      montajFiyat:  reviseSource.montajFiyat ?? 0,
      mAdet:        reviseSource.mAdet,
      teslimatVar:  reviseSource.teslimatVar,
      teslimatFiyat: reviseSource.teslimatFiyat ?? 0,
      mTeslimat:    reviseSource.mTeslimat ?? 1,
      teslimatCesiti: reviseSource.teslimatCesiti ?? '',
      tTeslimAlanAdi: reviseSource.tTeslimAlanAdi ?? '',
      tIlgiliKisi:  reviseSource.tIlgiliKisi ?? '',
      tTelefon:     reviseSource.tTelefon ?? '',
      tAltTelefon:  reviseSource.tAltTelefon ?? '',
      tE_Mail:      reviseSource.tE_Mail ?? '',
      tVATNumarasi: reviseSource.tVATNumarasi ?? '',
      tZipKod:      reviseSource.tZipKod ?? '',
      tUlke:        reviseSource.tUlke ?? '',
      tAdres:       reviseSource.tAdres ?? '',
      mTelefon:     reviseSource.mTelefon ?? '',
      mMail:        reviseSource.mMail ?? '',
      mUlke:        reviseSource.mUlke ?? '',
      mVATNumarasi: reviseSource.mVATNumarasi ?? '',
      mZipKod:      reviseSource.mZipKod ?? '',
      mAdres:       reviseSource.mAdres ?? '',
      paraTipi:     reviseSource.paraTipi || 'Euro',
      // PROMPT-v2 §3: Kaynak NULL ise boş (null) olarak hidrate edilir.
      indirim:      reviseSource.indirim ?? null,
      kdv:          reviseSource.kdv ?? null,
      pesinYuzde:   reviseSource.pesinYuzde ?? null,
      sirket:       reviseSource.sirket ?? 'Unixpadel',
      sets:         [],
      details:      reviseSource.details ?? [],
    })
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
  const orderMut = useMutation({
    mutationFn: () => isReviseMode ? reviseOrder(reviseFrom!, form) : createOrder(form),
    onSuccess: (no) => {
      toast({ title: isReviseMode ? 'Revize edildi' : 'Sipariş oluşturuldu', description: no })
      setCreatedNo(no)
    },
    onError: () => toast({ title: 'Hata', variant: 'destructive' }),
  })
  const quoteMut = useMutation({
    mutationFn: () => isReviseMode ? reviseOrder(reviseFrom!, form) : createQuote(form),
    onSuccess: (no) => {
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
    const set: OrderSetInput = {
      kategoriID:    tab.kategoriID,
      adet:          tab.adet,
      kategoriFiyat: tab.kategoriFiyat,
      components:    [],
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

        {/* ── 3-COLUMN GRID (legacy SiparisForm layout) ──────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)_380px] gap-4">

          {/* ╔══════════ LEFT: MÜŞTERİ + TEMSİLCİ ══════════════════════ */}
          <div className="space-y-4">
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
          <section className="rounded-md border bg-card min-h-[600px]">
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
                        onValueChange={(v) => updateTab(i, {
                          kategoriID: Number(v),
                          kategoriFiyat: categories.find((c) => c.kategoriID === Number(v))?.fiyat ?? 0,
                        })}
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
                        onChange={(e) => updateTab(i, { adet: Math.max(1, Number(e.target.value)) })}
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

                  {/* Preview area — boş kalır, ileride önizleme görseli/notu burada gösterilir */}
                  <div className="rounded border bg-muted/20 h-40 flex items-center justify-center text-xs text-muted-foreground">
                    {form.sets?.[i]
                      ? <>Set kaydedildi: Kategori #{form.sets[i].kategoriID} × {form.sets[i].adet}</>
                      : <>Ana ürün seçip "Çarp" basın</>}
                  </div>

                  {/* Bileşen tablosu — kaydetten sonra "Reçeteden Aç" ile dolar */}
                  <div className="rounded border overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/30">
                        <tr>
                          <th className="text-left px-2 py-1">ID</th>
                          <th className="text-left px-2 py-1">Öznitelik</th>
                          <th className="text-left px-2 py-1">Bileşen Adı</th>
                          <th className="text-left px-2 py-1">Birim</th>
                          <th className="text-right px-2 py-1">Adet</th>
                          <th className="text-right px-2 py-1">Birim Fiyat</th>
                          <th className="text-right px-2 py-1">Toplam</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(form.sets?.[i]?.components ?? []).length === 0
                          ? <tr><td colSpan={7} className="text-center text-muted-foreground px-2 py-6">— Henüz bileşen yok —</td></tr>
                          : form.sets![i].components.map((cmp, k) => (
                            <tr key={k} className="border-t">
                              <td className="px-2 py-1">{cmp.bilesenID}</td>
                              <td className="px-2 py-1">{cmp.oznitelikAdi ?? '—'}</td>
                              <td className="px-2 py-1">—</td>
                              <td className="px-2 py-1">—</td>
                              <td className="px-2 py-1 text-right">{cmp.adet}</td>
                              <td className="px-2 py-1 text-right">{fmt(cmp.fiyat ?? 0)}</td>
                              <td className="px-2 py-1 text-right">{fmt((cmp.fiyat ?? 0) * cmp.adet)}</td>
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
          <div className="space-y-4">
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
                  <Button size="sm" variant="outline" disabled={!form.montajVar}>Çarp</Button>
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
                  <Button size="sm" variant="outline" disabled={!form.teslimatVar}>Çarp</Button>
                </div>

                <div className="border-t pt-3 space-y-2">
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <Field label="Teslim Alan Adı">
                        <Select
                          value={form.tTeslimAlanAdi ?? ''}
                          onValueChange={(v) => {
                            // Adres seçilince ilgili kişi/telefon/ülke vs. dolsun.
                            const a = deliveryAddrs.find((d: any) => (d.teslimAlanAdi ?? d.TeslimAlanAdi) === v)
                            setForm((f) => ({
                              ...f,
                              tTeslimAlanAdi: v,
                              tIlgiliKisi:  a?.ilgiliKisi   ?? a?.IlgiliKisi   ?? f.tIlgiliKisi,
                              tTelefon:     a?.telefon      ?? a?.Telefon      ?? f.tTelefon,
                              tAltTelefon:  a?.altTelefon   ?? a?.AltTelefon   ?? f.tAltTelefon,
                              tE_Mail:      a?.e_Mail       ?? a?.E_Mail       ?? f.tE_Mail,
                              tUlke:        a?.ulke         ?? a?.Ulke         ?? f.tUlke,
                              tZipKod:      a?.zipKod       ?? a?.ZipKod       ?? f.tZipKod,
                              tVATNumarasi: a?.vatNumarasi  ?? a?.VATNumarasi  ?? f.tVATNumarasi,
                              tAdres:       a?.adres        ?? a?.Adres        ?? f.tAdres,
                            }))
                          }}
                        >
                          <SelectTrigger><SelectValue placeholder="Seç" /></SelectTrigger>
                          <SelectContent>
                            {(deliveryAddrs as any[]).map((d, k) => {
                              const name = d.teslimAlanAdi ?? d.TeslimAlanAdi ?? `Adres ${k + 1}`
                              return <SelectItem key={k} value={String(name)}>{String(name)}</SelectItem>
                            })}
                          </SelectContent>
                        </Select>
                      </Field>
                    </div>
                  </div>

                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <Field label="İlgili Kişi">
                        <Input value={form.tIlgiliKisi ?? ''} onChange={(e) => setForm((f) => ({ ...f, tIlgiliKisi: e.target.value }))} />
                      </Field>
                    </div>
                    <Button variant="outline" size="sm">İlişkilendir</Button>
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
          <Button variant="outline" onClick={() => nav(-1)}>Formu Getir</Button>
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

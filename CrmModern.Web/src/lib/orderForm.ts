/**
 * SR-1 — Sipariş/Teklif formunun saf (React'sız) parçaları. Önceden 2127 satırlık
 * NewOrderPage içindeydi; ayrıldığı için birim testi yazılabilir ve sayfa
 * bileşenleri yalnız durum + görünümle uğraşır.
 */
import type { CreateOrderDto, OrderDetail, OrderSetInput } from '@/types'
import type { IsoCurrency } from '@/lib/currency'
import {
  STANDART_DETAY_SARTLARI, ODEME_PREFIX, odemeCode, upsertClause, normalizeToCode,
} from '@/lib/clauses'
import type { UserPreferences } from '@/lib/preferences'

export const PARA_TIPLERI = ['Euro', 'Dolar', 'TL', 'Sterlin'] as const
export const SIRKETLER = ['Unixpadel', 'ArsSport', 'AselCocuk'] as const
export const SET_COUNT = 5 // Legacy Sipariş 1..5

// §31 — Detaylar sekmesi YALNIZ eski CRM'in 17 İngilizce standart şartını gösterir
// (+ kullanıcı serbest notları). Ticari/otomatik @@kodlar (FIYAT/KDV/KARGO/HAKLAR ve
// kontrol-güdümlü TESLIMAT/ODEME/MONTAJ) ARTIK Detaylar listesinde GÖSTERİLMEZ ve
// proforma #DETAY'da görünmez (backend bunları #DETAY'dan eler).

/**
 * Boş form. E-13 — kullanıcı tercihleri (şirket, para tipi, peşin %, ödeme şekli)
 * verilirse varsayılanlar onlarla dolar.
 */
export function blankOrder(prefs?: Pick<UserPreferences, 'defaultSirket' | 'defaultParaTipi' | 'defaultPesinYuzde' | 'defaultOdemeSekli'>): CreateOrderDto {
  const pesinYuzde = prefs?.defaultPesinYuzde ?? null
  let details = [...STANDART_DETAY_SARTLARI]
  if (prefs?.defaultOdemeSekli) details = upsertClause(details, ODEME_PREFIX, odemeCode(prefs.defaultOdemeSekli, pesinYuzde))
  return {
    musteriAd: '', siparisNotu: '',
    sTelefon: '', sFax: '', sWeb: '', sE_Mail: '', sVatNumarasi: '', sUlke: '', sAdres: '',
    montajVar: false, montajFiyat: 0, mAdet: 1,
    teslimatVar: false, teslimatFiyat: 0, mTeslimat: 1,
    teslimatCesiti: '', tTeslimAlanAdi: '', tIlgiliKisi: '',
    tTelefon: '', tAltTelefon: '', tE_Mail: '', tVATNumarasi: '', tZipKod: '', tUlke: '', tAdres: '',
    mTelefon: '', mMail: '', mUlke: '', mVATNumarasi: '', mZipKod: '', mAdres: '',
    // PROMPT-v2 §3: İndirim/KDV/Peşin başlangıçta boş — "henüz karar vermedi"
    // semantiği. Backend null → 0 coercion'ını total hesaplamada uygular.
    paraTipi: prefs?.defaultParaTipi || 'Euro', indirim: null, kdv: null, pesinYuzde,
    // §31 — yeni boş form, eski CRM'deki gibi YALNIZ 17 İngilizce standart şartla
    // (hepsi işaretli) seed'li gelir. Revize/Formu Getir modunda detailToForm() ezer.
    sets: [], details, sirket: prefs?.defaultSirket || 'Unixpadel',
    extraCosts: [],
    freeItems: [],
  }
}

/**
 * PROMPT-v2 §1b: Bileşen tablosunda her satırın editlenebilir state'i.
 * PROMPT-v3 §2.3: defaultAdet saklanır — ürün adedi değişince her satırın
 * Adet'i defaultAdet × ürünAdedi olarak yeniden hesaplanır.
 */
export interface ComponentRow {
  bilesenID: number
  bilesenAdi: string
  birim: string
  oznitelikSecili: string
  oznitelikSecenekler: string[]
  adet: number
  birimFiyat: number      // sipariş para biriminde (payload'a giden değer)
  defaultAdet: number
  // Döviz çevirisi: fiyatın asıl kaynağı. Katalog fiyatı kendi biriminde (Panoramic
  // listesi TL) gelir; elle düzeltilen fiyat sipariş biriminde kaynak olur.
  kaynakFiyat: number
  kaynakPara: IsoCurrency
}

/** PROMPT-v3 §2.2: kategori seçilince TÜM bileşenler; reçetedekiler ön-işaretli. */
export interface ChecklistItem {
  bilesenID: number
  bilesenAdi: string
  birim: string
  inRecipe: boolean
  defaultAdet: number
  defaultFiyat: number
  currency: IsoCurrency   // defaultFiyat'ın para birimi (BilesenBilgileri.Currency)
  attributes: string[]
  checked: boolean
}

/**
 * Set sekmesi durumu. F0-4 — kategorisi seçili HER sekme kayda girer (iş kuralı
 * onaylandı); eski "Çarp" adımı gerekmez.
 */
export interface SetTabState {
  kategoriID: number | null
  kategoriAdi: string     // §2.4 öznitelik auto-default kuralları kategori adına bakar
  kategoriFiyat: number   // tekil fiyat
  adet: number
  checklist: ChecklistItem[]
  components: ComponentRow[]
}

export const emptySetTab = (): SetTabState =>
  ({ kategoriID: null, kategoriAdi: '', kategoriFiyat: 0, adet: 1, checklist: [], components: [] })

/**
 * PROMPT-v3 §2.4: legacy OznitelikDegistir auto-default kuralları.
 * Dal sırası legacy ile birebir: cam → powder painting → fence-typo.
 */
export function autoOznitelik(
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

/**
 * Excel reçeteli kategoriler (tam ad): seçilince katalogdaki diğer bileşenler
 * GÖSTERİLMEZ — yalnız reçete kalemleri, hepsi işaretli.
 */
const EXCEL_BOM_CATEGORIES = new Set([
  'panoramic padel court', 'full panoramic court', 'standard padel court', 'padbol',
])
export const isPanoramicPadel = (kategoriAdi: string) =>
  EXCEL_BOM_CATEGORIES.has(kategoriAdi.trim().toLowerCase())

/** Kategoriye göre ön-işaretlenecek bileşen adları (legacy kuralları). */
const AUTO_CHECK: { match: (k: string) => boolean; names: string[] }[] = [
  {
    match: (k) => k.toLowerCase().includes('pickleball'),
    names: ['beton primer', 'resurfacer', 'cushion 1 layer', 'top coat color 3 layer', 'line mark white'],
  },
  {
    match: (k) => k.toLowerCase().includes('plate padel court'),
    names: [
      '80x80 mm box profile', '80x60 mm box profile', '60x40 mm box profile',
      'base sheet plate 490-750 mm', 'corner gusset plate 300x180x10 mm', 'corner gusset plate 175x180x10 mm',
      '50x50x4 mm wire mesh panel', 'fip padel net & posts', '200w led floodlight & pole',
      '12 mm fip synthetic turf',
    ],
  },
]

/** Kategori seçiminde checklist'i legacy kurallarına göre işaretler/süzer. */
export function applyCategoryRules(kategoriAdi: string, checklist: ChecklistItem[]): ChecklistItem[] {
  const rule = AUTO_CHECK.find((r) => r.match(kategoriAdi))
  if (rule) {
    return checklist.map((c) => ({ ...c, checked: rule.names.some((n) => c.bilesenAdi.toLowerCase().includes(n)) }))
  }
  if (isPanoramicPadel(kategoriAdi)) {
    // Yalnız reçete (Excel çelik + cıvata listesi); başka bileşen listelenmez.
    return checklist.filter((c) => c.inRecipe).map((c) => ({ ...c, checked: true }))
  }
  return checklist
}

/** Kaynak fiyatı sipariş para birimine çevirir (kur yoksa kaynak değer aynen kalır). */
export type PriceFn = (amount: number, from: IsoCurrency) => number

/** §2.3: yeni işaretlenen checklist satırından grid satırı üretir. */
export function buildRow(item: ChecklistItem, kategoriAdi: string, urunAdedi: number, price: PriceFn): ComponentRow {
  const { secili, secenekler } = autoOznitelik(kategoriAdi, item.bilesenAdi, item.attributes)
  return {
    bilesenID:           item.bilesenID,
    bilesenAdi:          item.bilesenAdi,
    birim:               item.birim,
    oznitelikSecili:     secili,
    oznitelikSecenekler: secenekler,
    adet:                item.defaultAdet * urunAdedi,
    birimFiyat:          price(item.defaultFiyat, item.currency),
    defaultAdet:         item.defaultAdet,
    kaynakFiyat:         item.defaultFiyat,
    kaynakPara:          item.currency,
  }
}

/** Sekmelerden kayıt payload'ı: kategorisi seçili her sekme bir set olur. */
export function buildSets(tabs: SetTabState[]): OrderSetInput[] {
  return tabs.filter((t) => t.kategoriID != null).map((t) => ({
    kategoriID:    t.kategoriID!,
    adet:          t.adet,
    kategoriFiyat: t.kategoriFiyat,
    components:    t.components.map((c) => ({
      bilesenID:    c.bilesenID,
      oznitelikAdi: c.oznitelikSecili || undefined,
      adet:         c.adet,
      fiyat:        c.birimFiyat,
    })),
  }))
}

/**
 * OrderDetail → CreateOrderDto header dolumu. Revize/Amend, Formu Getir ve
 * "Kopyala ile yeni" aynı eşlemeyi paylaşır (sets'i çağıran doldurur).
 */
export function detailToForm(d: OrderDetail): CreateOrderDto {
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
    // Round-8 §4 — legacy TR standart satırlar koda normalleştirilir.
    details:      (d.details ?? []).map(normalizeToCode),
    extraCosts:   (d.extraCosts ?? []).map((e) => ({ aciklama: e.aciklama, tutar: e.tutar })),
    // Serbest kalemler: items'tan KategoriID=null & BilesenID=null olanları ayıkla.
    freeItems:    (d.items ?? []).filter((i) => !i.kategoriID && !i.bilesenID).map((i) => ({
      bilesenAdi:   i.sBilesenAdi ?? '',
      oznitelikAdi: i.oznitelikAdi,
      birim:        i.sBirim,
      adet:         i.adet,
      fiyat:        i.fiyat ?? 0,
    })),
  }
}

export interface OrderTotals {
  setsTotal: number
  montaj: number
  teslimat: number
  brut: number
  indirimTutar: number
  kdvTutar: number
  extra: number
  toplam: number
  kapora: number
}

/**
 * Toplam fiyat — backend OrderService ile birebir aynı semantik:
 *   brüt = Σ(set fiyatı × adet) + montaj × mAdet + teslimat × mTeslimat
 *   toplam = brüt × (1 − indirim%) × (1 + KDV%) + Σ ekstra maliyet
 * F0-7 (iş kuralı onaylı): bileşen satır tutarları ve serbest kalemler BİLGİ
 * amaçlıdır, toplama katılmaz.
 */
export function computeTotals(form: CreateOrderDto, tabs: SetTabState[]): OrderTotals {
  // Yalnız kayda girecek (ana ürünü seçili) setler — buildSets ile aynı küme;
  // aksi halde boş sekmeye yazılan fiyat toplamda görünüp kaydedilmiyordu.
  const setsTotal = tabs.reduce((a, t) => a + (t.kategoriID != null ? t.kategoriFiyat * t.adet : 0), 0)
  const montaj    = form.montajVar   ? form.montajFiyat   * form.mAdet     : 0
  const teslimat  = form.teslimatVar ? form.teslimatFiyat * form.mTeslimat : 0
  const brut = setsTotal + montaj + teslimat
  const indirimTutar = brut * (form.indirim || 0) / 100
  const afterIndirim = brut - indirimTutar
  const kdvTutar = afterIndirim * (form.kdv || 0) / 100
  const extra = (form.extraCosts ?? []).reduce((a, e) => a + (Number(e.tutar) || 0), 0)
  const toplam = afterIndirim + kdvTutar + extra
  const kapora = toplam * (form.pesinYuzde || 0) / 100
  return { setsTotal, montaj, teslimat, brut, indirimTutar, kdvTutar, extra, toplam, kapora }
}

/** Formdaki eksikler (özet rayı + doğrulama aynı listeyi kullanır). */
export type OrderIssue = 'musteriAd' | 'lineItems' | 'pesinYuzde' | 'amendReason'

export function orderIssues(form: CreateOrderDto, tabs: SetTabState[], opts: { amend?: boolean; amendReason?: string } = {}): OrderIssue[] {
  const out: OrderIssue[] = []
  if (!form.musteriAd.trim()) out.push('musteriAd')
  // F0-3 — details (17 standart şart) her zaman dolu geldiği için kalem
  // kontrolüne katılmaz; yalnız set ve serbest kalemler sayılır.
  if (!tabs.some((t) => t.kategoriID != null) && (form.freeItems?.length ?? 0) === 0) out.push('lineItems')
  // Peşinat zorunlu (Teklif + Sipariş) — boş veya 0 geçilemez.
  if (form.pesinYuzde == null || form.pesinYuzde <= 0) out.push('pesinYuzde')
  if (opts.amend && !opts.amendReason?.trim()) out.push('amendReason')
  return out
}

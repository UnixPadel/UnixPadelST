// ── Common ────────────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean
  message: string | null
  data: T
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  kullaniciAdi: string
  sifre: string
  // "Beni Hatırla" — true ise sunucu uzun ömürlü token üretir, istemci localStorage'a yazar.
  rememberMe?: boolean
}

export interface LoginResponse {
  token: string
  kullaniciAdi: string
  kullaniciID: number
  ad: string
  soyad: string
  yetkiTuru: string
  canApprovePurchase?: boolean
  canViewPurchaseRequests?: boolean
}

// ── Musteri ───────────────────────────────────────────────────────────────────

// /api/musteri response (MusteriDto). Sipariş listelerinde kullanılan join'li
// alanlar (mUlke/sirket) ayrı OrderListDto type'ında — bu type sadece
// MusteriBilgileri tablosu kolonlarına karşılık gelir.
export interface Musteri {
  musteriID: number
  musteriAd: string
  telefon: string
  zipKod: string
  e_Mail: string
  adres: string
  vatNumarasi: string
  ulkelerID: number
  ulkeAdi: string
  bolge?: string | null
}

export interface Ulke {
  ulkelerID: number
  ulkeAdi: string
  numaraBirimi: string
  bolge?: string | null
}

// ── Order ─────────────────────────────────────────────────────────────────────

export interface OrderListDto {
  siparisAlID: number
  siparisNo: string
  teklifNo: string
  musteriAd: string
  mUlke?: string
  kullaniciID: number
  paraTipi: string
  toplamFiyat: number | null
  siparisMiTeklifMi: string
  kontrol: string
  tarih: string
  sirket?: string
  // PROMPT-v4 §2/§6.2 — Kontrol grid kolonları + Siparişlerim sahip kolonu
  pesinYuzde: number
  odenenMiktar?: number | null
  teslimatCesiti?: string
  odemeDurum?: string
  kullaniciAdSoyad?: string
  // Round-8 §7 — düzenleme/silme rozetleri.
  silindi?: boolean
  guncellendi?: boolean
  degisiklikGerekce?: string
  tamamlayanAdSoyad?: string | null
  tamamlanmaTarihi?: string | null
}

export interface OrderDetail {
  siparisNo: string
  teklifNo: string
  musteriAd: string
  siparisNotu?: string
  // seller
  sTelefon?: string
  sFax?: string
  sWeb?: string
  sE_Mail?: string
  sVatNumarasi?: string
  sUlke?: string
  sAdres?: string
  // customer
  mTelefon?: string
  mMail?: string
  mUlke?: string
  mVATNumarasi?: string
  mZipKod?: string
  mAdres?: string
  // assembly
  montajVar: boolean
  montajFiyat?: number | null
  mAdet: number
  // delivery
  teslimatVar: boolean
  teslimatFiyat?: number | null
  mTeslimat: number
  teslimatCesiti?: string
  tTeslimAlanAdi?: string
  tIlgiliKisi?: string
  tTelefon?: string
  tAltTelefon?: string
  tE_Mail?: string
  tVATNumarasi?: string
  tZipKod?: string
  tUlke?: string
  tAdres?: string
  // pricing
  paraTipi: string
  indirim?: number | null
  kdv?: number | null
  pesinYuzde: number
  toplamFiyat?: number | null
  brutToplamFiyat?: number | null
  // status
  siparisMiTeklifMi: string
  kontrol: string
  red?: string
  sirket?: string
  fabrikaNot?: string
  lojistikNot?: string
  tarih?: string
  sTarih?: string   // 2.5 stage-history timeline için (son fabrika işlem tarihi)
  kullaniciAdi?: string
  // Sahip (Temsilci) ID — revize ekranı temsilci devri seçicisi (yalnız elshan).
  kullaniciID?: number | null
  // items
  items: OrderDetailItem[]
  details: string[]
  // PROMPT-v4 §4.1 — Kontrol ekranı cari bloğu
  odenenMiktar?: number | null
  odemeDurum?: string
  kontrolNot?: string
  // Teslimat/Montaj altı ekstra maliyetler — revize/amend'de forma yüklenir.
  extraCosts?: OrderExtraCostView[]
  silindi?: boolean
  // Kapanış Bilgileri (Tamamlandı)
  tamamlayanKullaniciID?: number | null
  tamamlayanAdSoyad?: string | null
  tamamlayanKullaniciAdi?: string | null
  tamamlanmaTarihi?: string | null
  tamamlanmaOncekiAsama?: string | null
  tamamlanmaNotu?: string | null
}

export interface OrderExtraCostView {
  ekMaliyetID: number
  aciklama: string
  tutar: number
  eklenmeTarihi?: string
  kullaniciID?: number | null
}

export interface OrderDetailItem {
  kategoriID?: number | null
  bilesenID?: number | null
  oznitelikAdi?: string
  adet: number
  fiyat?: number | null
  // PROMPT-v4 §4.3 — Ürün & Bileşen grid isimleri (backend join çözümlemesi)
  kategoriAdi?: string
  bilesenAdi?: string
  birim?: string
  // Serbest metin (Özel Kalem) alanları — yalnız custom satırlarda dolu.
  sBilesenAdi?: string
  sBirim?: string
}

export interface CreateOrderDto {
  musteriAd: string
  siparisNotu?: string
  sTelefon?: string
  sFax?: string
  sWeb?: string
  sE_Mail?: string
  sVatNumarasi?: string
  sUlke?: string
  sAdres?: string
  montajVar: boolean
  montajFiyat: number
  mAdet: number
  teslimatVar: boolean
  teslimatFiyat: number
  mTeslimat: number
  teslimatCesiti?: string
  tTeslimAlanAdi?: string
  tIlgiliKisi?: string
  tTelefon?: string
  tAltTelefon?: string
  tE_Mail?: string
  tVATNumarasi?: string
  tZipKod?: string
  tUlke?: string
  tAdres?: string
  mTelefon?: string
  mMail?: string
  mUlke?: string
  mVATNumarasi?: string
  mZipKod?: string
  mAdres?: string
  paraTipi: string
  // PROMPT-v2 §3: boş bırakılınca null olarak gönderilir; backend null → 0
  // coercion'ı yalnız total hesaplamada uygular.
  indirim: number | null
  kdv: number | null
  pesinYuzde: number | null
  sets: OrderSetInput[]
  details: string[]
  sirket: string
  ekBase64?: string
  // Teslimat/Montaj altındaki ekstra maliyet kalemleri (yalnız yeni kayıtta).
  // Her kalem proformaya ayrı satır olur ve toplama eklenir.
  extraCosts?: ExtraCostInput[]
  // Serbest metin kalemleri (BilesenBilgileri'ne yazılmaz).
  freeItems?: FreeItemInput[]
}

export interface ExtraCostInput {
  aciklama: string
  tutar: number
}

export interface FreeItemInput {
  bilesenAdi: string
  oznitelikAdi?: string
  birim?: string
  adet: number
  fiyat?: number
}

export interface OrderSetInput {
  kategoriID: number
  adet: number
  kategoriFiyat: number
  components: OrderItemInput[]
}

export interface OrderItemInput {
  bilesenID: number
  oznitelikAdi?: string
  adet: number
  fiyat?: number
}

// ── Quality Control ───────────────────────────────────────────────────────────

export interface QualityControlListDto {
  siparisNo: string
  musteriAd: string
  mUlke?: string
  toplamFiyat: number | null
  kaparoFiyat: number | null
  kalanBakiye: number | null
  pesinYuzde: number
  teslimatCesiti?: string
  paraTipi: string
  odemeDurum?: string
  siparisMiTeklifMi: string
  tarih: string
  sirket?: string
  kontrol: string   // 'Kontrol' (bekleyen) | 'Onay' (onaylı) — grid'de ayırt için
}

// ── Factory ───────────────────────────────────────────────────────────────────

export interface FactoryOrderListDto {
  siparisNo: string
  musteriAd: string
  mUlke?: string
  siparisMiTeklifMi: string
  fabrikaNot?: string
  sTarih?: string
  tarih: string
  kullaniciID: number
  kullanici?: string  // "Ad Soyad" — Temsilci sütunu / filtresi (2.2)
  /** Round-8 §11 — Cari onay tarihi (STarih değişmez; parasal değil). */
  cariOnayTarih?: string
}

export interface MoveToProductionDto {
  sTarih: string
  fabrikaNot: string
}

// ── Logistics ─────────────────────────────────────────────────────────────────

export interface LogisticsOrderListDto {
  siparisNo: string
  musteriAd: string
  mUlke?: string
  siparisMiTeklifMi: string
  lojistikNot?: string
  sTarih?: string
  tarih: string
  // PROMPT-v6 §4 — yalnız ödeme TÜRÜ bilgisi; tutar alanı bilinçli yok (v5 §2).
  pesinYuzde: number
  odemeDurum?: string | null
  // Lojistik teklif akışı — onaylı teklif (yalnız ready listesinde dolu);
  // "Sevk Oluştur" formunu ön-doldurmak için.
  onayliFirma?: string | null
  onayliCesit?: string | null
  onayliFiyat?: number | null
}

// ── Lojistik Teklif akışı ───────────────────────────────────────────────────

export interface LogisticsOffer {
  teklifID: number
  siparisNo: string
  kullaniciID: number
  kullaniciAdSoyad?: string | null
  firmaAdi: string
  lojistikCesit: string
  fiyat: number
  paraBirimi?: string | null
  aciklama?: string | null
  durum: string  // 'Beklemede' | 'Onaylandi' | 'Reddedildi'
  olusturmaTarihi: string
  onayKullaniciID?: number | null
  onayKullaniciAdSoyad?: string | null
  onayTarihi?: string | null
  redNotu?: string | null
}

export interface LogisticsOfferQueueItem {
  siparisNo: string
  musteriAd: string
  mUlke?: string
  siparisMiTeklifMi: string
  tarih: string
  sTarih?: string | null
  teklifSayisi: number
  onayliFirma?: string | null
  onayliFiyat?: number | null
  onayliParaBirimi?: string | null
}

export interface SubmitLogisticsOfferRequest {
  firmaAdi: string
  lojistikCesit: string
  fiyat: number
  paraBirimi?: string
  aciklama?: string
}

export interface MoveToLogisticsDto {
  sTarih: string
  lojistikNot: string
  kullaniciID: number
  firmaAdi: string
  lojistikCesit: string
  fiyat: number
  lNot?: string
}

export interface LogisticsHistoryDto {
  id: number
  siparisNo: string
  firmaAdi: string
  lojistikCesit: string
  fiyat: number | null
  lNot?: string
  kullaniciID: number
  // Paket 3: Order.SiparisMiTeklifMi join'li gelir; durum rozeti için.
  siparisMiTeklifMi?: string | null
  // PROMPT.md OBSERVER #18: operatörün Ad Soyad'ı (KullaniciBilgileri join'li).
  kullaniciAdSoyad?: string | null
}

// Paket 3: Muhasebe onayı bekleyen sevk talepleri.
export interface LogisticsPendingApprovalDto {
  sevkId: number
  siparisNo: string
  musteriAd: string
  mUlke?: string
  firmaAdi: string
  lojistikCesit: string
  fiyat: number
  lNot?: string
  lojistikNot?: string
  sTarih?: string
  kullaniciAdi: number
}

// ── Accounting ────────────────────────────────────────────────────────────────

export interface AccountingOrderListDto {
  siparisNo: string
  musteriAd: string
  mUlke?: string
  paraTipi: string
  toplamFiyat: number | null
  kaparoFiyat: number | null
  kalanBakiye: number | null
  odenenMiktar?: number | null
  odemeDurum?: string
  siparisMiTeklifMi: string
  maliyet?: number
  maliyetDetayi?: string
  kar?: number
  muhasebeDurumu?: string
  muhasebeTalepID?: number
  muhasebeRedNotu?: string
  // PROMPT.md ACCOUNTING #14 — legacy Muhasebe.cs grid columns.
  sirket?: string
  pesinYuzde: number
  teslimatCesiti?: string
  // Row colouring + "Muhasebe Onayla" enable rule needs Kontrol.
  kontrol?: string
  tarih: string
  // PROMPT-v2 §10.2: Maliyet Reçetesi Net Kar math için.
  indirim?: number | null
  kdv?: number | null
  // PROMPT-v6 §1 — Burcu "Lojistik Onay Bekleyen" kuyruğu: null | 'Bekliyor' | 'Onay'
  lojistikOnay?: string | null
  // Lojistik teklif akışı — yöneticinin onayladığı lojistik teklif özeti.
  onayliLojistikFirma?: string | null
  onayliLojistikFiyat?: number | null
  onayliLojistikParaBirimi?: string | null
  tamamlayanAdSoyad?: string | null
  tamamlanmaTarihi?: string | null
}

export interface AccountingTransactionDto {
  id: number
  siparisNo: string
  musteriID: number
  kullaniciID: number
  odenenMiktar: number | null
  tarih: string
  // Tahsilat iptali — yalnız includeCancelled ile istenen listelerde true gelir.
  iptal?: boolean
  iptalGerekce?: string | null
  iptalKullaniciAdSoyad?: string | null
  iptalTarihi?: string | null
}

// ── Purchase ──────────────────────────────────────────────────────────────────

export interface PurchaseRequestListDto {
  talepID: number
  urunAdi: string
  urunTuru?: string
  urunMaliyeti: number | null
  paraBirimi?: string | null
  alinanYer?: string
  talepEdenKullaniciAdi?: string
  departman?: string
  talepTarihi: string
  durum: string
  redNotu?: string
  islemYapanKullanici?: string
  islemTarihi?: string
  talepTipi?: string
  musteriAdi?: string
  toplamSiparis?: number
  kaporaBakiyesi?: number
  kalanBakiyeTalep?: number
  pesinYuzde?: number
  maliyet?: number
  maliyetDetayi?: string
  kar?: number
  siparisNo?: string
}

// Round-9 §9 — yeni talep oluştururken gönderilen kalem satırı
export interface CreatePurchaseRequestLine {
  urunAdi: string
  birim: string
  miktar: number
  birimFiyat?: number | null
  toplam: number
  indirim?: number | null
  indirimTipi?: string | null
  fiyatModu: string
}

export interface CreatePurchaseRequestDto {
  urunAdi: string
  urunTuru?: string
  urunMaliyeti: number
  alinanYer?: string
  notlar?: string
  talepEdenKullaniciAdi: string
  departman: string
  talepTipi?: string
  musteriAdi?: string
  toplamSiparis?: number
  kaporaBakiyesi?: number
  kalanBakiyeTalep?: number
  pesinYuzde?: number
  maliyet?: number
  maliyetDetayi?: string
  kar?: number
  siparisNo?: string
  // Round-11 §9 — belge düzeyinde para birimi (Euro/Dolar/TL/Sterlin)
  paraBirimi?: string
  // Round-9 §9 — çok kalemli talep satırları
  kalemler?: CreatePurchaseRequestLine[]
}

// ── Product Catalog ───────────────────────────────────────────────────────────

export interface ProductCatalogCategoryDto {
  kategoriID: number
  kategoriAdi: string
  fiyat: number | null
  components: CategoryComponentDto[]
}

export interface CategoryComponentDto {
  bilesenID: number
  bilesenAdi: string
  birim?: string
  fiyat: number | null
  adet: number
}

export interface ProductCatalogComponentDto {
  bilesenID: number
  bilesenAdi: string
  birim?: string
  fiyat: number | null
}

// ── User ──────────────────────────────────────────────────────────────────────

export interface UserListDto {
  kullaniciID: number
  kullaniciAdi: string
  ad: string
  soyad: string
  email: string
  telefon: string
  yetkiTuru: string
  durum: string
}

/** Slim user record for dropdowns/filters — Fabrika "Temsilci" gibi. */
export interface UserLookupDto {
  kullaniciID: number
  ad: string
  soyad: string
  /** Round-8 §11/§13/§15 — role so "Temsilci" filters can narrow the list. */
  yetkiTuru: string
}

export interface CreateUserDto {
  kullaniciAdi: string
  sifre: string
  ad: string
  soyad: string
  email: string
  telefon: string
  yetkiTuru: string
  durum: string
}

export interface UpdateUserDto {
  ad: string
  soyad: string
  email: string
  telefon: string
  yetkiTuru: string
  durum: string
}

// ── Search ────────────────────────────────────────────────────────────────────

export interface SearchResultDto {
  siparisNo: string
  teklifNo: string
  musteriAd: string
  mUlke?: string
  kullaniciID: number
  kullaniciAdi?: string   // siparişi oluşturan kullanıcı ("Oluşturan" kolonu)
  paraTipi: string
  toplamFiyat: number | null
  kaparoFiyat: number | null
  kalanBakiye: number | null
  odenenMiktar?: number | null
  odemeDurum?: string
  siparisMiTeklifMi: string
  kontrol: string
  tarih: string
  sirket?: string
}

// ── Dashboard (Faz 7) ─────────────────────────────────────────────────────────

export interface DashboardKpi {
  son30GunSiparisSayisi: number
  son30GunCiroEuro: number
  son30GunCiroDolar: number
  son30GunCiroTL: number
  son30GunCiroSterlin: number
  bekleyenKontrolSayisi: number
  uretimdekiSiparisSayisi: number
  sevkiyatBekleyenSayisi: number
  odemeBekleyenSayisi: number
  bekleyenSatinAlmaTalepSayisi: number
  kendiAcikSiparisSayisi: number
}

export interface OrderTrendPoint {
  ay: string // "2026-05"
  siparisSayisi: number
  ciroEuro: number
  ciroDolar: number
  ciroTL: number
  ciroSterlin: number
}

export interface StageDistribution {
  asama: string
  sayi: number
}

export interface TopCustomer {
  musteriAd: string
  siparisSayisi: number
  toplamCiro: number
  paraTipi: string
}

export interface CurrencyDistribution {
  paraTipi: string
  siparisSayisi: number
  toplamCiro: number
}

// Round-8 §13 — Temsilci performans raporu satırı.
export interface RepPerformance {
  kullaniciID: number
  adSoyad: string
  olusturulan: number
  teklif: number
  siparis: number
  onaylanan: number
  reddedilen: number
  bekleyen: number
  tamamlanan: number
  donusumOrani: number
  ciroEuro: number
  ciroDolar: number
  ciroTL: number
  ciroSterlin: number
}

// §19 — temsilci detay analizi
export interface RepCountryStat {
  ulke: string; siparisSayisi: number; adet: number
  ciroEuro: number; ciroDolar: number; ciroTL: number; ciroSterlin: number
}
export interface RepProductStat { urun: string; adet: number; siparisSayisi: number }
export interface RepMonthlyStat {
  ay: string; siparisSayisi: number
  ciroEuro: number; ciroDolar: number; ciroTL: number; ciroSterlin: number
}
export interface RepDetail {
  kullaniciID: number; adSoyad: string; kullaniciAdi?: string | null
  siparisSayisi: number; teklifSayisi: number; toplamAdet: number; ulkeSayisi: number; donusumOrani: number
  ciroEuro: number; ciroDolar: number; ciroTL: number; ciroSterlin: number
  aovEuro: number; aovDolar: number; aovTL: number; aovSterlin: number
  ulkeler: RepCountryStat[]; urunler: RepProductStat[]; aylikCiro: RepMonthlyStat[]
}

// ── Global Search (Faz 7) ─────────────────────────────────────────────────────

export interface UnifiedSearchHit {
  kategori: string
  id: string
  baslik: string
  altMetin?: string | null
  navigateUrl: string
}

export interface UnifiedSearchResult {
  query: string
  toplamSonuc: number
  sonuclar: UnifiedSearchHit[]
}

// ── Changelog (Faz 7) ─────────────────────────────────────────────────────────

/** Eski "Faz" kayıtları (2.0–2.7) — yalnız geçmiş sayfasında, sürüm karşılaştırmasına girmez. */
export interface ChangelogEntry {
  versiyon: string
  tarih: string // YYYY-MM-DD
  baslik: string
  maddeler: string[]
}

/** TR + EN metin (sürüm notları, kılavuz). */
export interface Localized<T = string> {
  tr: T
  en: T
}

/** Sürüm notu — `versiyon` package.json sürümüyle birebir aynı olmalı (ör. '0.3.0'). */
export interface ReleaseNote {
  versiyon: string
  tarih: string // YYYY-MM-DD
  baslik: Localized
  maddeler: Localized<string[]>
}

// ── Auth context ──────────────────────────────────────────────────────────────

export interface AuthUser {
  kullaniciAdi: string
  kullaniciID: number
  ad: string
  soyad: string
  yetkiTuru: string
  token: string
}

// ── İç denetim (workflow) ─────────────────────────────────────────────────────
// Parasal alan yok — tüm roller (Fabrika dahil) okur.

export type WorkflowStepCode =
  | 'temsilciDuzeltme' | 'kontrolOnayi' | 'siparisCevirme' | 'cariOnay' | 'uretimeAlma'
  | 'uretim' | 'lojistikOnay' | 'sevkiyat' | 'teslimat' | 'kapanis'

export type WorkflowDepartment = 'Satis' | 'Kontrol' | 'Muhasebe' | 'Fabrika' | 'Lojistik'

export type WorkflowScreen =
  | 'qc' | 'accounting-cari' | 'factory' | 'logistics-offers' | 'accounting-lojistik'
  | 'logistics-ready' | 'accounting-tamamlanma' | 'final-approval'

export interface WaitingOrderDto {
  siparisNo: string
  musteriAd: string
  mUlke: string | null
  asama: string
  stepCode: WorkflowStepCode
  department: WorkflowDepartment
  waitingSince: string | null
  temsilci: string | null
}

export interface OrderWorkflowStatusDto {
  siparisNo: string
  asama: string
  stepCode: WorkflowStepCode | null
  department: WorkflowDepartment | null
  waitingSince: string | null
}

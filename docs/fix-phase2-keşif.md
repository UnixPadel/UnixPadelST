# Fix Phase 2 — Keşif Notları

Bu dosya STEP 0 keşfinin çıktısıdır. Her item için: ilgili dosya yolu, mevcut durum, ve değişiklik yapılması gereken **kök neden** satırı belirtildi. Hiçbir kod değişikliği henüz yapılmadı.

---

## Genel kabuk / iskelet

| Konu | Dosya | Notlar |
|---|---|---|
| Router | [main.tsx](../CrmModern.Web/src/main.tsx) | `HashRouter` — Electron `file://` için. Logout'ta `window.location.href = '/login'` HashRouter ile düzgün çözmez. |
| Layout / Topbar | [Layout.tsx](../CrmModern.Web/src/components/Layout.tsx) | `flex h-screen overflow-hidden bg-background` root + `main` yalnız `overflow-y-auto`. Yatay scroll YOK. |
| Sidebar / Menü | [Sidebar.tsx](../CrmModern.Web/src/components/Sidebar.tsx) | navItems içinden i18nKey ile etiketler çekiliyor. Logout: `await apiLogout(); logout(); window.location.href = '/login'`. |
| Auth state | [useAuth.ts](../CrmModern.Web/src/hooks/useAuth.ts) | localStorage `token` + `user` JSON. `logout()` ikisini de siler. |
| Auth guard | [Layout.tsx:40](../CrmModern.Web/src/components/Layout.tsx:40) | `if (!isLoggedIn()) return <Navigate to="/login" replace />` — token silindikten sonra Layout re-render gerekiyor; window.location.href tam reload yapıyor, bu yüzden çalışıyor ama URL "/login" yanlış (HashRouter'da `#/login` olmalı). |
| Loading / Suspense | — | `App.tsx`'de tüm Route'lar **eager import**. Lazy yok → boş beyaz ekran sebebi: data fetch süresi (her sayfa için ilk render'da `useQuery` boş döner). Tek ortak loader yok. |
| Toast | [ToastProvider.tsx](../CrmModern.Web/src/components/ToastProvider.tsx) | Custom toast (`bottom-4 right-4`). 4500 ms sonra otomatik kapanıyor. Aynı ID'yi update etme mekanizması YOK — replace/dismiss için ID lazım. |
| Form lib | `react-hook-form` dependency var ama mevcut sayfalar useState ile manuel form yönetiyor. Zod yok. |
| i18n | [i18n.ts](../CrmModern.Web/src/i18n/i18n.ts) + [locales/tr.json](../CrmModern.Web/src/i18n/locales/tr.json) + [locales/en.json](../CrmModern.Web/src/i18n/locales/en.json) | LanguageDetector ile localStorage'tan. en.json mevcut anahtarlarda büyük oranda İngilizce; bazı form anahtarları (örn. `orders.form.musteri`) İngilizce değer içeriyor (key=tr, value=en). |
| DevTools | [electron/main.cjs:75](../CrmModern.Web/electron/main.cjs:75) | **`mainWindow.webContents.openDevTools({ mode: 'detach' })`** çağrısı açık, "GEÇİCİ DEBUG" yorumlu. **Kök neden buradadır.** |

---

## Phase 1 — Genel Düzeltmeler

### 1.1 DevTools otomatik açılıyor
- **Dosya:** `CrmModern.Web/electron/main.cjs`
- **Satır 73-75:** `// GEÇİCİ DEBUG ... mainWindow.webContents.openDevTools({ mode: 'detach' });`
- **Plan:** Bu çağrıyı kaldırmak. Electron'da F12 (DevTools toggle) zaten default — ekstra menü item gerekmez; ama emin olmak için `Menu.setApplicationMenu(null)` (satır 60) sebebiyle accelerator çalışmayabilir. F12 için bir global shortcut veya `globalShortcut.register('F12', …)` ekleyebiliriz.

### 1.2 Yatay scrollbar yok
- **Dosya:** `CrmModern.Web/src/components/Layout.tsx`
- **Satır 44:** `<div className="flex h-screen overflow-hidden bg-background">` — root `overflow-hidden` içeriği kırpıyor.
- **Satır 46:** `<div className="flex-1 flex flex-col overflow-hidden min-w-0">` — inner wrapper da öyle.
- **Satır 62:** `<main className="flex-1 overflow-y-auto">` — yalnız y-scroll.
- **Plan:** `main`'in className'ini `overflow-y-auto overflow-x-auto` (veya `overflow-auto`) yapmak. Root'taki `overflow-hidden` kalmalı (sidebar dış scroll'u engelliyor).

### 1.3 Logout login ekranına dönmüyor
- **Dosya:** `CrmModern.Web/src/components/Sidebar.tsx`
- **Satır 64-68:** `handleLogout` → `window.location.href = '/login'`
- **Sorun:** HashRouter kullanıyoruz (`main.tsx:6,26`). `'/login'` URL'i pathname'i değiştirir; HashRouter `#/login` bekler. Electron `file://` ortamda bu URL hiç açılmaz.
- **Plan:** `useNavigate()` + `navigate('/login', { replace: true })` kullanmak. `apiLogout()` çağrısı ve `logout()` (token sil) korunur. `replace: true` ile back tuşu auth'lı sayfaya dönemez.

### 1.4 Yükleniyor göstergesi yok
- **Dosyalar:** `App.tsx` (route tanımları), her bir sayfa.
- **Sorun:** Hiçbir Route lazy değil; tüm sayfalar eager. Beyaz ekran sebebi: ilk render'da `useQuery` data'sı boş. `DataTable` zaten `loading` prop alıyor (örn. [OrdersPage.tsx:166](../CrmModern.Web/src/pages/orders/OrdersPage.tsx:166)) ama page-level loading skeleton/spinner yok.
- **Plan:** 
  1. `components/PageLoader.tsx` (yeni) — basit spinner + "Yükleniyor..." (i18n: `common.loading` zaten var).
  2. `App.tsx`'de Layout `<Suspense fallback={<PageLoader />}>` ile sarılsın (lazy'e geçersek). Şimdilik sadece bileşeni hazırlayıp Layout'ta `bootstrapped` false iken kullanabiliriz (mevcut `return null` — beyaz ekran). [Layout.tsx:41](../CrmModern.Web/src/components/Layout.tsx:41) `if (!bootstrapped) return null` → `<PageLoader />` ile değişecek.

### 1.5 "Siparişler" → "Sipariş/Teklif Oluştur"
- **Anchor noktalar:** 
  - [Sidebar.tsx:26](../CrmModern.Web/src/components/Sidebar.tsx:26) `{ path: '/orders', i18nKey: 'nav.orders', … }` — bu standalone "Siparişler" listesi (kaldıracağız 2.3'te).
  - **Asıl "yaratma" sayfası:** `/orders/new` → [NewOrderPage.tsx](../CrmModern.Web/src/pages/orders/NewOrderPage.tsx) — sidebar'da kendi entry'si **yok**. OrdersPage'in "Yeni Sipariş" butonundan açılıyor ([OrdersPage.tsx:126](../CrmModern.Web/src/pages/orders/OrdersPage.tsx:126)).
- **Soru:** "Sipariş/Teklif Oluştur" sidebar entry'si mi olacak? Eğer evet → yeni `/orders/new` için sidebar entry eklemeli + label "Sipariş/Teklif Oluştur" / "Create Order / Quote".
- **i18n:** `nav.orders` "Siparişler" → "Sipariş/Teklif Oluştur" yapmak yerine **yeni anahtar** ekleyeceğiz: `nav.createOrderQuote` (yan menü), `orders.newOrderTitle` zaten "Yeni Sipariş / Teklif" var, page başlığını da yeni anahtarla güncelleriz.

### 1.6 Yeni Talep — Department auto-fill + readonly
- **Dosya:** `CrmModern.Web/src/pages/purchase/NewPurchaseRequestPage.tsx`
- **Satır 23:** `departman: user?.yetkiTuru ?? ''` — zaten auto-populate olmuş.
- **Satır 55:** `<Input value={form.departman} onChange={…} />` — **editable**.
- **Plan:** Bu Input'a `disabled` (veya `readOnly`) eklemek. Payload aynen gönderilir (state'te var).

### 1.7 Required alanlar submit'i bloklamıyor (kullanıcıya bildirim YOK)
- **Mevcut pattern (NewPurchaseRequestPage):** [satır 45](../CrmModern.Web/src/pages/purchase/NewPurchaseRequestPage.tsx:45) `valid` flag + [satır 60](../CrmModern.Web/src/pages/purchase/NewPurchaseRequestPage.tsx:60) `disabled={!valid}`. Submit gerçekten bloklanıyor ama **alanın yanında error mesajı yok**, kullanıcı neden disabled olduğunu anlamıyor.
- **Diğer formlar:** [NewOrderPage.tsx](../CrmModern.Web/src/pages/orders/NewOrderPage.tsx) ve diğerleri için tek tek audit gerekecek.
- **Plan:** Minimal: her `Input/Textarea` altına error span (`{!form.alan.trim() && touched.alan && <p className="text-xs text-destructive">Zorunlu alan</p>}`) + submit'te tüm touched=true. RHF/Zod'u proje genelinde mevcut formları büyük refactor olmadan ekleyemeyiz (görev "narrow changes" diyor); var olan useState pattern'i içinde error gösterimi + touched logic yeterli.

---

## Phase 2 — Fabrika

### 2.1 Fabrika'da "Yeni Sipariş" girişi
- **Dosya:** [FactoryPage.tsx](../CrmModern.Web/src/pages/factory/FactoryPage.tsx)
- **Bulgu:** Sayfa'da "Yeni Sipariş" butonu **görünmüyor**. Sidebar'da `nav.factory` → `/factory` tek entry, alt entry yok.
- **Plan:** Bu öğe zaten var değil. Sadece bir kez daha kullanıcıya teyit etmek lazım: "Fabrika içinde 'Yeni Sipariş' düğmesi göremedim, başka yerde mi var?"

### 2.2 Fabrika filtre bölümü (legacy'den port)
- **Legacy referans:** [WindowsFormsApp1/Fabrika.cs:241-385](../../WindowsFormsApp1/Fabrika.cs) — `araButtonInTab_Click`.
- **Legacy filtreleri:**
  - `textBoxSiparisNo` — Sipariş No
  - `comboBoxMusteriAdi` — Müşteri Adı
  - `comboBoxUlke` — Ülke
  - `comboBoxKullaniciAdi` — Temsilci (Ad+Soyad)
  - `comboBoxIslemDurum` — Aşama
  - `teslimatTarihiBaslangicPicker` / `teslimatTarihiBitisPicker` — Tarih aralığı
  - + "Reset" butonu, + alt satırda **döviz toplam textboxları** (Euro / Dolar / TL / Sterlin)
- **Mevcut React Fabrika:** [FactoryPage.tsx:103-114](../CrmModern.Web/src/pages/factory/FactoryPage.tsx:103) — sadece **Aşama** dropdown'u var.
- **Backend:** [FactoryController.cs:22](../CrmModern.API/Controllers/FactoryController.cs:22) `GetOrders` sadece `asama` query param alıyor. `OrderFilterDto` zaten var (totals endpoint'i [satır 63](../CrmModern.API/Controllers/FactoryController.cs:63) kullanıyor). Filter parametrelerini de ana endpoint'e eklemek gerekecek.
- **Plan:** 
  1. Backend: `GetProductionOrdersAsync` imzasına `OrderFilterDto` ya da spesifik filter param ekle (siparisNo, musteriAd, mUlke, kullaniciId, baslangicTarih, bitisTarih).
  2. Frontend: FactoryPage'e filter grid + Excel toplam kartları ([CurrencyTotals.tsx](../CrmModern.Web/src/components/CurrencyTotals.tsx) zaten var — totals endpoint'i kullanılabilir).

### 2.3 Section silme — Müşteriler / Ürün Kataloğu / Siparişler / Siparişlerim
- **Sidebar entry'leri:** Sidebar.tsx satır 26 (orders), 27 (myOrders), 43 (customers), 44 (productCatalog).
- **Route tanımları (App.tsx):** satır 38, 39, 58, 59.
- **Dashboard module cards (DashboardPage.tsx):** satır 33 (orders), 39 (customers), 40 (productCatalog) — bunlar da temizlenmeli (2.7 ile örtüşür).
- **Sayfa dosyaları:** OrdersPage.tsx, MyOrdersPage.tsx, CustomersPage.tsx, ProductCatalogPage.tsx — tamamen silinecek.
- **Bağımlılıklar:** OrdersPage `<OrderDetailModal>` ve `<CurrencyTotals>` kullanıyor — bunlar Fabrika'da da gerekli; **silinmemeli**, sadece sayfa silinecek.
- **i18n:** `nav.orders`, `nav.myOrders`, `nav.customers`, `nav.productCatalog`, `customers.*`, `productCatalog.*`, `orders.title`/`orders.subtitle`/`orders.myTitle`/`orders.mySubtitle` — silinmeli; **`orders.form.*` kalmalı** (NewOrderPage hâlâ kullanıyor → Sipariş/Teklif Oluştur).

### 2.4 İşlem Tarihi auto-update — **TIKANMA NOKTASI**
- **Bulgu:** `Order` entity'sinde [Order.cs:78](../CrmModern.Core/Entities/Order.cs:78) sadece `Tarih` (oluşturulma) ve `STarih` (üretim başlama) var. **`IslemTarihi` field YOK.**
- **`IslemTarihi` field'ı sadece `PurchaseRequest` entity'sinde var** ([PurchaseRequest.cs:22](../CrmModern.Core/Entities/PurchaseRequest.cs:22)).
- **Plan:** Bu maddeyi açıklığa kavuşturmak gerek — kullanıcıya sorulacak (aşağıdaki "Açık Sorular" bölümüne yazıldı).

### 2.5 Stage history detay
- **Mevcut:** [OrderDetailModal.tsx](../CrmModern.Web/src/components/OrderDetailModal.tsx) — sipariş genel detayı + `OrderApprovalTimeline` ([OrderApprovalTimeline.tsx]) gösteriyor.
- **Şema:** Aşama geçiş history tablosu var mı bilinmiyor — `AuditEntry` entity'si var, oraya bakmak gerek; ya da `OrderApproval` zaten timeline gibi davranıyor.
- **Plan:** OrderDetailModal'ı zenginleştirmek; veya FactoryPage'e ayrı bir "Geçmiş" tab eklemek. Karar 2.5 sırasında verilecek (önce schema kontrol).

### 2.6 Excel toast feedback
- **Mevcut Excel akışı:** [FactoryPage.tsx:60-67](../CrmModern.Web/src/pages/factory/FactoryPage.tsx:60) — `downloadExcel` çağrısı, sonra tek toast `excelDownloaded`. "İndiriliyor..." ara state YOK.
- **Plan:** ToastProvider'a opsiyonel `id` + `update(id, …)` desteği eklemek; veya iki ayrı toast çıkarmak (önce "İndiriliyor..." sticky, promise resolve olunca onu dismiss et + yeni "İndirildi" çıkar). En temizi: ToastProvider'a `id` ile dismiss + update API'si.

### 2.7 Panel sadece fabrika
- **Dashboard'un mevcut widget'ları:** KPI kartları (`last30Orders`, `myOpenOrders`, `pendingQC`, `inProduction`, `pendingShipment`, `pendingPayment`, `pendingPurchase`), 4 döviz ciro kartı, `OrderTrendChart`, `StageDistributionChart`, `TopCustomersChart`, ve module card grid.
- **Fabrika dahili olabilecekler:** `inProduction`, `StageDistributionChart` (üretim aşama dağılımı), `OrderTrendChart` (?).
- **Plan:** Kullanıcıya hangi widget'lar fabrika sayılır diye sormak — "Açık Sorular" bölümünde.

### 2.8 Aşama + "Hazır" butonu
- **Mevcut:** [FactoryPage.tsx:89-93](../CrmModern.Web/src/pages/factory/FactoryPage.tsx:89) — `Hazır` butonu **zaten var**, sadece `siparisMiTeklifMi === 'Uretim'` durumunda görünüyor. Backend [OrderRepository.cs:82](../CrmModern.Infrastructure/Repositories/OrderRepository.cs:82) `MarkAsReadyAsync` `'Hazir'` set ediyor.
- **"Üretime Al" düğmesi:** [FactoryPage.tsx:84-88](../CrmModern.Web/src/pages/factory/FactoryPage.tsx:84) — sadece `Planlama` aşamasında, dialog açıp `fabrikaNot` + `sTarih` alıyor.
- **Aşama port:** Legacy'de "Üretime Geçir" → `FabrikaYontim` dialog açıyordu; biz de zaten dialog açıyoruz ([FactoryPage.tsx:123-153](../CrmModern.Web/src/pages/factory/FactoryPage.tsx:123)). Görev metni "port et" diyor ama büyük oranda zaten port edilmiş.
- **Plan:** Önce kullanıcıyla mevcut durumu gözden geçir; eksik kısımları (varsa) tamamla. Belki "Hazır"a ek başka bir aşama transition'ı eksik (örn. Hazır → Lojistik fabrika tarafında istenir mi).

---

## Phase 3 — i18n

- `en.json` mevcut anahtarlarda zaten geniş çapta İngilizce. Spot kontrolde Türkçe kalan değer bulunmadı (anahtar adları Türkçe — sorun değil, value'lar İngilizce).
- Phase 1-2'de eklenecek yeni anahtarlar (loader text, "Sipariş/Teklif Oluştur", "Hazır", filter etiketleri, "İndiriliyor..." / "İndirildi", validation mesajları) tr + en'e eklenecek.
- Excluded: bazı sayfaların tablo `header: 'İşlem'` gibi sabit Türkçe stringleri var (örn. [PreApprovalPage.tsx:52](../CrmModern.Web/src/pages/approval/PreApprovalPage.tsx:52)) — Phase 3'te bunlar `t('common.actions')` ile değiştirilecek.

---

## Açık Sorular (kullanıcıya sorulacak — koda dokunmadan)

1. **(2.4) `IslemTarihi`:** `Order` entity'sinde böyle bir field yok. Üç seçenek var:
   - (a) `Order` tablosuna yeni `IslemTarihi DATETIME NULL` kolonu ekle (migration gerekir).
   - (b) Var olan `Tarih` (created_at) yerine yeni `STarih` benzeri başka bir field düşün — yine migration.
   - (c) İlgili UI'da "İşlem Tarihi" diye gösterilecek değer aslında `STarih` mi (zaten `MoveToProduction`'da set ediliyor)?
   Hangi yolu istiyorsun?

2. **(2.5) Stage history kaynağı:** Backend'de aşama geçiş history'si tutuluyor mu emin değilim. `AuditEntry` tablosu var ama içeriği bilinmiyor. Eğer ayrı bir tablo yoksa, mevcut timestamp'lerden (Tarih, STarih, vb.) bir timeline kurabiliriz — sadece o veriyle yetinilir mi, yoksa yeni `OrderStageHistory` tablosu mu istenir?

3. **(2.7) Panel:** Aşağıdakilerden hangileri "fabrika verisi" sayılır (silinmeyecek)?
   - KPI: Üretimdeki Sipariş (✓ kesin fabrika)
   - KPI: Sevkiyat Bekleyen, Bekleyen Kontrol, Son 30 Gün Sipariş, Açık Sipariş, Ödeme Bekleyen, Bekleyen Satın Alma
   - 4 döviz ciro kartı
   - Sipariş trend chart, Aşama dağılımı chart, Top müşteriler chart
   - Modül navigasyon kartları (Müşteriler/Ürün Kataloğu zaten 2.3'te silinecek)

4. **(2.1) Fabrika'da "Yeni Sipariş" düğmesi:** Şu an FactoryPage'de göremedim. Başka bir alt sayfada mı (örn. eski bir route)? Tekrar doğrulayalım.

5. **(2.2) Filter kapsamı:** Legacy'de "Temsilci" filtresi var (Kullanıcı dropdown). Bu Fabrika için gerekli mi yoksa sadece Sipariş No / Müşteri / Ülke / Aşama / Tarih yeterli mi?

---

## Çalışma Sırası

Sırayla, her item kullanıcı doğrulaması ile:
**1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.6 → 1.7 → Commit → 2.1 → 2.2 → 2.3 → 2.4 (soru çözüldükten sonra) → 2.5 → 2.6 → 2.7 (soru çözüldükten sonra) → 2.8 → Commit → 3 → Commit → build + push**

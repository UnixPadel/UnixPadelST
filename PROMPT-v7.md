# CRM Updates — Round 7: elshan her şeyi görür + Satın Alma override onayı + Cari onay→Fabrika akış düzeltmesi + Kontrol ekranı sadeleştirme + sevk dialogu + sipariş formu Ödeme Şekli taşıma

## Context

The CRM lives in two adjacent codebases under `C:\Users\Lenovo_It_1\Desktop\CRM`:

- **`WindowsFormsApp1/`** — legacy WinForms reference, **read-only**.
- **`CrmModern/`** — modern .NET 8 (`CrmModern.API` / `Core` / `Infrastructure`) + React/TypeScript (`CrmModern.Web`). All changes land here.

Shipped state (v0.2.10, commit `8ac3d8c`, tag `v0.2.10` published 2026-06-12 ~15:35):
- **Üç-aşamalı onay zinciri canlı (v6 §1):** elshan Onayla → `Kontrol='Onay'` (aşama `Siparis` kalır) → Burcu Cari Onay (`/accounting/approval`, yalnız `burcu.karaman`) → `Planlama` → simge.cakir Üretime Al/Hazır → Burcu Lojistik Onay → `/logistics/ready`.
- Cari onay endpoint'i `PUT /api/accounting/orders/{no}/approve-and-move-to-planning` **yalnız burcu.karaman** (AccountingController.cs `AccountingApprover` sabiti); `AccountingPage`'teki eski "Muhasebe Onayla" butonu kaldırıldı.
- Kontrol ekranı (`QualityControlPage.tsx`): üstte üç panel (`Filtreme` sol dikey kart | sekmeli `Detay` | `Kontrol`), pointer-splitter, altta `density="compact"` master grid. Detay sekmelerinde `Muhasebe Geçmişi` hâlâ var.
- Sevk dialogu (v6 §4): firma `Select` + `Diğer` sentinel (`OTHER_CARRIER`, LogisticsReadyPage.tsx:24) → seçilince serbest text; Taşıma Türü hâlâ serbest `Input + datalist` (`getCesitler`); üstte read-only ödeme türü şeridi; `Ek Not` (lNot) input'u duruyor.
- Sipariş formu (v6 §5): otomatik Detay satırları canlı — `STANDART_SARTLAR` seed (NewOrderPage.tsx:45), `Teslimat Şekli:` upsert, montaj toggle, `Ödeme Şekli` Select'i **Cari Bilgi kartının grid'inde** (NewOrderPage.tsx:1074). `INCOTERMS` sabiti NewOrderPage.tsx:33 — `['EXW','FCA','CPT','CIP','DAT','DAP','DDP','FAS','FOB','MCFR','CIF','CFR','CNF']`.
- Satın Alma üç aşaması (PurchaseController): Aşama 1 ön onay (`omur.caliskan` ∨ Yonetici) `Bekliyor/Onay Bekliyor → 'Ön Onaylandı'`; Aşama 2 ödeme detayı (Yonetici/Muhasebe) `→ 'Muhasebe Tamamlandı'`; Aşama 3 nihai (`elshan.rasulov` ∨ Yonetici) `→ 'Onaylandı'`. `AllPurchaseRequestsPage.tsx` bugün salt-okunur (hiç aksiyon butonu yok).
- **Deploy topolojisi:** Frontend = Electron (`UnixPadelST-Releases`, electron-updater). API = Render.com (`https://unixpadelst-jcxy.onrender.com`, `.env.production`'daki `VITE_API_URL`), main'e merge ile otomatik deploy. **Doğrulandı:** prod API v6 kodunu taşıyor (`/approve-logistics` 401 dönüyor; var olmayan route 404).
- elshan.rasulov **Yonetici** rolünde (KullaniciID 12) — rol gereği çoğu sayfayı zaten görüyor; göremedikleri yalnız username-gated/dar-rollü sayfalar (aşağıda §1).

Items keep the user's numbering. Implement and verify in order — §1 ve §3 aynı gate'lere dokunur, §1 önce. Build cadence after each item: `npm run build` in `CrmModern.Web` + `dotnet build CrmModern.slnx` — both green before moving on.

---

## 1. ELSHAN.RASULOV HER SAYFAYI GÖRSÜN — merkezi bypass

Bütün rollerde açtığımız bütün sayfalar elshan.rasulov'da gözüksün. Tek tek listeye eklemek yerine **merkezi bypass** yaz (yeni sayfa eklendiğinde unutulmasın):

- `RoleGuard.tsx`: kullanıcı `elshan.rasulov` ise `roles`/`usernames` kontrolünden bağımsız çocuğu render et (tek satırlık erken dönüş; mevcut elshan `usernames` girdileri kalabilir — artık no-op).
- `Sidebar.tsx` `visibleItems` filtresi: aynı bypass — elshan TÜM nav item'ları görür.
- `DashboardPage.tsx` tiles: elshan için özel kartlar zaten ekleniyor (`/quality-control`); `/accounting/approval` kartı da eklensin (Burcu kalıbı `isAccountingApprover` zaten var — elshan'a da göster).
- Bugün elshan'ın GÖREMEDİĞİ sayfalar (bypass'in kapatacağı delikler): `/accounting/approval` (yalnız burcu), `/approval/pre` (sidebar yalnız omur; route guard'sız), `/approval/payment` (roles yalnız Muhasebe).
- **Backend simetrisi:** elshan'ın bu sayfaları KULLANABİLMESİ için ilgili mutasyon gate'lerine de eklenmesi gerekir:
  - `AccountingController`: `approve-and-move-to-planning` + `approve-logistics` gate'i `burcu.karaman ∨ elshan.rasulov` olsun (sabit string karşılaştırması → iki elemanlı set/array; §3 ile aynı değişiklik).
  - `PurchaseController.PreApprove/PreReject`: elshan Yonetici olduğu için `IsRole("Yonetici")` zaten geçiyor — değişiklik gerekmez (doğrula).
  - `pending-payment`/`payment-details` zaten `Yonetici,Muhasebe` — elshan geçer (doğrula).
- Fabrika simge gate'i (`FactoryController.MoveToProduction/MarkReady`) bu maddede DEĞİŞMEZ — elshan listeyi görür ama üretim butonları simge'de kalır (kullanıcı yalnız "sayfalar gözüksün" dedi).
- v5 §2 Fabrika para karartması elshan'ı etkilemez (Yonetici) — regresyon yok, ama `OrderDtoSanitizer` çevresine dokunma.

**Acceptance:** elshan girişinde sidebar'da TÜM nav kayıtları listelenir; `/accounting/approval`, `/approval/pre`, `/approval/payment` rotaları açılır ve veri yükler; Burcu ekranındaki Cari Onayla/Lojistik Onayla butonları elshan'la da çalışır (backend 200 + audit). Başka kullanıcıların görünürlüğü değişmez.

---

## 2. SATIN ALMA TÜM TALEPLER — elshan her aşamada tek-tık override onayı

`AllPurchaseRequestsPage.tsx` bugün salt-okunur. elshan.rasulov'a (yalnız ona) her satırda **"Onayla"** aksiyonu ekle; onaylanınca üç-aşamalı zincirin kalan adımlarına gerek kalmasın.

- **Backend — yeni endpoint:** `POST /api/purchase/{talepId}/override-approve` (PurchaseController; `FinalApproverUser` sabiti zaten `elshan.rasulov` — gate YALNIZ bu kullanıcı adı, Yonetici rolü DEĞİL; mevcut nihai-onay kalıbından farkı bu).
- **Servis:** `PurchaseService.OverrideApproveAsync(talepId, currentUserName, aciklama?)`:
  - Talep `Durum ∈ {'Bekliyor','Onay Bekliyor','Ön Onaylandı','Muhasebe Tamamlandı'}` ise → `Durum='Onaylandı'`, `IslemYapanKullanici=currentUserName`, `IslemTarihi=Now`. Ara alanlar (OdemeTuru vb.) doldurulMAZ — NULL kalması sorun değil (nihai durum okuyan hiçbir kod ara alana bağlı değil; doğrula).
  - `Durum='Onaylandı'` ise idempotent no-op; `Durum='Reddedildi'` ise `BusinessException` ("Reddedilmiş talep override edilemez — talep sahibi yeniden göndermeli").
  - `TalepOnaylari` audit: `LogApprovalAsync(talepId, "Override", "Onaylandı", currentUserName, aciklama ?? "Tüm aşamalar atlanarak onaylandı (override).")` — mevcut `LogApprovalAsync` kalıbı (PurchaseService.cs:142/224).
  - `TalepTipi` ayrımı YOK — SatinAlma da Muhasebe tipi de override edilebilir.
- **Frontend:** `AllPurchaseRequestsPage` aksiyon kolonu: `useAuth().getUser()?.kullaniciAdi === 'elshan.rasulov'` ise ve satır `Durum` nihai değilse (`Onaylandı`/`Reddedildi` dışında) "Onayla" butonu. Tık → confirm gerekmez, doğrudan mutate; başarıda `['purchase-all']` (sayfanın mevcut query key'i neyse o) + `['purchase-pending-*']` aile invalidation + toast. Buton diğer kullanıcılara render edilmez.
- Ön onay / ödeme / nihai onay sayfaları ve mevcut endpoint'ler DOKUNULMAZ — normal akış aynen yaşar; override paralel bir kısa devredir.
- i18n: buton + toast tr & en.

**Acceptance:** elshan Tüm Talepler'de `Bekliyor` durumundaki bir talebi Onayla'yınca talep `Onaylandı` olur; Ön Onay/Ödeme/Nihai kuyruklarının hiçbirinde artık görünmez; `TalepOnaylari`'nda `Override` satırı vardır. Başka bir kullanıcının JWT'siyle endpoint 403. Reddedilmiş talep override edilemez.

---

## 3. CARİ ONAY → FABRİKA AKIŞ DÜZELTMESİ

Şikâyet: "Burcu hanım cari onaylayınca fabrikanın sistemine geri düşmüyor."

**Ön teşhis (kod + canlı DB incelendi, 2026-06-12):**
- Kod zinciri doğru: `ApproveMuhasebeAndMoveToPlanningAsync` → `SiparisMiTeklifMi='Planlama'`; `FactoryService.GetProductionOrdersAsync` Planlama'yı listeliyor; prod API v6 kodunda (doğrulandı).
- Canlı DB'de **hiç `MuhasebeOnaylandi` audit satırı yok** → v6 sonrası başarılı bir Cari onay HİÇ olmamış. Bugünün siparişleri (örn. `SELRA12062026450`) `Siparis + Kontrol='Onay'` durumunda Burcu kuyruğunda bekliyor.
- En olası kök neden **sürüm kayması + daralan gate**: v0.2.10 Electron'u bugün 15:35'te yayınlandı; ondan önce kullanıcılar v0.2.8 frontend'iyle (eski `AccountingPage` "Muhasebe Onayla" butonu) YENİ API'ye istek attı. Yeni API bu endpoint'i yalnız `burcu.karaman`'a açıyor → Yonetici/diğer Muhasebe kullanıcıları **403** aldı, sipariş `Siparis`'te kaldı → "fabrikaya düşmüyor".

**Yapılacaklar:**
- §1'deki gate genişletmesi (burcu ∨ elshan) bu senaryonun yönetici tarafını çözer — uygula.
- **Canlı doğrulama:** lokal API + prod DB ile (user-secrets bağlantısı) Burcu kuyruğundaki gerçek bir siparişte zinciri uçtan uca çalıştır: Cari Onayla → DB'de `SiparisMiTeklifMi='Planlama'` + `MuhasebeOnaylandi` audit → `/api/factory` yanıtında satır VAR. Çalışmıyorsa gerçek hatayı bul ve düzelt — bu maddenin asıl amacı budur; yukarıdaki teşhis hipotezdir, kapanış DB kanıtıyla olur.
- **Canlılık:** `FactoryPage.tsx` listesine v5 §3 kalıbı ekle (`refetchInterval: 30_000, refetchIntervalInBackground: false, refetchOnWindowFocus: 'always', staleTime: 0`) — Burcu onayladığında simge'nin AÇIK Fabrika ekranı ≤30 sn'de güncellensin (bugün yalnız Burcu'nun kendi client'ı invalidate ediyor; başka makinedeki Fabrika ekranı yenilenene kadar görmüyor → şikâyetin ikinci muhtemel kaynağı).
- Aynı kalıbı Burcu ekranı zaten kullanıyor (`AccountingApprovalPage` accounting-orders query'si) — dokunma.
- Hata görünürlüğü: `AccountingApprovalPage` cari onay `onError` zaten `describeApiError` ile toast atıyor — 403'te kullanıcı "yetkiniz yok" mesajını görmeli; `ApiResponse.Fail` zarfı 403'te boş dönüyorsa anlamlı mesaj ekle.

**Acceptance:** Burcu (veya elshan) Cari Onayla → sipariş ≤30 sn içinde açık Fabrika ekranında belirir (sayfa yenilemeden); DB'de `Planlama` + `MuhasebeOnaylandi` audit; yetkisiz kullanıcı butonu görmez/403'te anlaşılır toast alır. Prod DB'de en az bir gerçek sipariş bu zincirden geçirilmiş ve raporlanmış olmalı.

---

## 4. KONTROL EKRANI SADELEŞTİRME — Muhasebe Geçmişi kalksın, filtreler derli toplu

`QualityControlPage.tsx` yerleşimi düzensiz bulundu ("ekranın yarısında aşağıda tablo, üstünde filtreler çok düzensiz"). Düzeltme:

- **Muhasebe Geçmişi sekmesini tamamen kaldır** — `TabsTrigger`/`TabsContent value="muhasebe"`, `getTransactionsForOrder` çağrısı + `qc-transactions` query'si + `sortedTx` memo'su + ilgili invalidation'lar. (`AccountingController.GetTransactionsForOrder`'daki elshan okuma istisnası backend'de KALIR — Burcu ekranı aynı endpoint'i kullanıyor.) `qc.tabs.muhasebeGecmisi` ve `qc.tx.*` i18n anahtarları başka yerde kullanılmıyorsa silinir (Burcu ekranı `qc.tx.*` kullanıyor — kontrol et; kullanılıyorsa anahtarlar kalır, yalnız QC sekmesi gider).
- **Filtre yerleşimi:** soldaki dikey `Filtreme` kartı kaldırılır; filtre alanları gridin HEMEN ÜSTÜNE tek satırlık (dar ekranda saran) kompakt yatay bar olarak taşınır — `FactoryPage`'teki filter-grid kalıbı (`grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2` ruhu; h-8 input/select, küçük label). Alan seti ve davranış AYNEN korunur: Sipariş No (doluysa diğerlerini ezer — legacy semantik), Müşteri, Temsilci, Ülke, Kontrol Durumu (default `Kontrol`), Ödeme Durumu, Aşama, Baş/Son tarih + `Ara`/`Reset`.
- Üst bölgede İKİ kart kalır: `Detay sekmeleri` (genişler) | `Kontrol` aksiyon kartı (sabit ~300px). v6 §2 kuralları korunur: üst bölge `h-auto`, iç scroll yok (yalnız Detay sekmesindeki iki liste `max-h`), splitter + sürüklenebilir grid aynen kalır.
- Davranış değişikliği YOK: Onayla/Reddet/Cari Güncelle/ekler/Excel/Form'u getir aynen.

**Acceptance:** 1920×1080 elshan girişi: filtre barı gridin üstünde tek blok, sol kart yok, Muhasebe Geçmişi sekmesi yok; tüm filtre kombinasyonları ve aksiyonlar v6'daki gibi çalışır; sayfa scroll'suz sığar.

---

## 5. SEVK DİALOGU — Diğer default + Incoterms taşıma türü + ödeme türü alanı + Ek Not kalksın

`LogisticsReadyPage.tsx` "Sevkiyat Oluştur" dialogu:

- **Firma:** dialog açılışında `carrierChoice` default `OTHER_CARRIER` (**Diğer seçili gelir**) ve serbest metin kutusu açık gelir — kullanıcı isterse Select'ten kayıtlı taşıyıcı seçer, kutu gizlenir. Validasyon aynen (Diğer + boş → required).
- **Taşıma Türü:** serbest `Input + datalist` (`getCesitler`) yerine `Select` — seçenekler Sipariş/Teklif formundaki Incoterms listesinin TAMAMI: `EXW, FCA, CPT, CIP, DAT, DAP, DDP, FAS, FOB, MCFR, CIF, CFR, CNF`. Sabit tek kaynaktan paylaşılsın: `INCOTERMS`'i `NewOrderPage.tsx:33`'ten ortak bir modüle çıkar (örn. `src/lib/constants.ts`) ve iki sayfa da oradan import etsin. `getCesitler` çağrısı bu sayfadan kalkar (api fonksiyonu ve backend endpoint dokunulmaz — başka tüketici var mı kontrol et; yoksa da bırak).
- **Ödeme türü:** üstteki bilgi şeridi yerine Taşıma Türü'nün ALTINDA read-only bir alan olarak göster: `Ödeme Türü` label + muted kutu içinde `Peşin` / `Vadeli (%x peşin)` + `OdemeDurum` badge'i (mevcut `odemeTuru()` helper'ı aynen kullan; tutar yine YOK — v5 §2 ruhu).
- **Ek Not kaldır:** `lNot` input'u dialogdan silinir; `createShipment` gövdesinde `lNot: ''` gönderilir (DTO/backend dokunulmaz). `Lojistik Notu` textarea'sı KALIR.
- i18n: değişen/yeni etiketler tr & en.

**Acceptance:** Sevkiyat Oluştur açılınca Firma=Diğer + boş textbox hazır; Taşıma Türü dropdown'unda 13 incoterm; altında ödeme türü read-only görünür (tutarsız/bakiyesiz); Ek Not alanı yok; sevk kaydı firma serbest metni ve seçilen incoterm ile `LojistikTablo`'ya yazılır.

---

## 6. SİPARİŞ/TEKLİF FORMU — Ödeme Şekli, Temsilci kartında Not'un altına taşınsın

v6 §5'in otomatik Detay satırları canlı (standart şartlar seed'i, `Teslimat Şekli:` upsert, montaj toggle'ı, haklar-saklıdır `SART_HAKLAR` sabiti). Kullanıcının istediği tek yapısal değişiklik **konum**:

- `Ödeme Şekli` Select'i (NewOrderPage.tsx:1073-1089) **Cari Bilgi kartından çıkar**, **Temsilci kartına** (NewOrderPage.tsx:761) `Not` textarea'sının HEMEN ALTINA taşı (Ek butonunun üstü). Davranış birebir aynı kalır: seçim Detaylar'a `Ödeme Şekli: Peşin` / `Ödeme Şekli: Vadeli — %x peşin` satırı upsert eder; `Peşin %` inputu değişince Vadeli satırı senkron güncellenir (Peşin % alanı Cari Bilgi'de kalır — yalnız Select taşınır).
- Cari Bilgi grid'inde boşalan hücre: grid 2 kolonlu akışta kendiliğinden kapanır — yer tutucu bırakma.
- Aşağıdakiler ZATEN canlı; dokunma, yalnız acceptance'ta yeniden doğrula (kullanıcı v0.2.10'u yeni aldı, görmemiş olabilir):
  - Yeni boş formda 5 standart şart satırı (`Fiyatlar 2 hafta geçerlidir.` / KDV / nakliye / montaj / haklar-saklıdır) hazır gelir.
  - Montaj işaretlenince montaj satırı silinir, kaldırılınca geri gelir.
  - Incoterm seçimi `Teslimat Şekli: X` satırını ekler/günceller/temizler.
  - Revize modunda seed atlanır.
- i18n: `orders.form.odemeSekli` anahtarları zaten var — taşıma yeni string gerektirmez.

**Acceptance:** Ödeme Şekli, Temsilci kartında Not'un altında; seçim Detaylar listesine tek satır düşer ve Peşin % ile senkron kalır; Cari Bilgi kartında Ödeme Şekli yok; v6 §5 davranışlarının tamamı regresyonsuz.

---

## Rules

- **Match existing code conventions.** Tailwind + shadcn, React Query, paylaşılan `DataTable` (`density="compact"` geniş gridlerde), `OrderDetailModal`, `formatCurrency`/`formatDate`, her yeni UI stringi tr + en i18n.
- **Username gate kalıbı:** sabit string + `User.FindFirstValue(ClaimTypes.Name)` (backend), `useAuth().getUser()?.kullaniciAdi` (frontend). §1 merkezi elshan bypass'i frontend görünürlük içindir; backend gate'ler endpoint bazında açıkça genişletilir (örtük "Yonetici geçer" EKLEME — yalnız spec'te yazan kullanıcılar).
- **v5 §2 karartması korunur:** Fabrika rolüne giden hiçbir DTO/endpoint parasal alan taşımaz; §5'teki ödeme türü alanı tutar içermez.
- **Schema değişikliği YOK** bu round'da — `DatabaseSchemaMigrator`'a adım eklenmez; EF Migrations YOK.
- **Süperseden kurallar:** v6 §1.2'deki "Burcu ekranı yalnız burcu.karaman" kuralı §1 ile gevşer (elshan da girer/onaylar); v6 §4'ün üst bilgi şeridi §5 ile alan olarak taşınır; v6 §5'in Ödeme Şekli konumu §6 ile değişir. Diğer tüm v1-v6 davranışları aynen korunur — ilgisiz refactor yok.
- **Build cadence:** her madde sonrası `npm run build` (Web) + `dotnet build CrmModern.slnx` — ikisi de yeşil kalmadan sonraki maddeye geçme.
- **Release:** tüm maddeler bitince `CrmModern.Web/package.json` 0.2.11 (BOM'suz yaz! `Set-Content` kullanma — bkz. v0.2.9/v0.2.10 run hataları), commit + `v0.2.11` tag push → GitHub Actions publish. API tarafı main merge ile Render'a otomatik gider.

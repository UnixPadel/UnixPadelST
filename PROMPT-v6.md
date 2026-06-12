# CRM Updates — Round 6: burcu.karaman Muhasebe onay ekranı + üç-aşamalı onay zinciri + Kontrol yerleşim düzeltmesi + tahsilat/lojistik/sipariş formu iyileştirmeleri + scaling

## Context

The CRM lives in two adjacent codebases under `C:\Users\Lenovo_It_1\Desktop\CRM`:

- **`WindowsFormsApp1/`** — legacy WinForms reference, **read-only**. For §1 the binding design reference is the legacy **Muhasebe** screen (`Muhasebe.cs`, 2231 lines + `Muhasebe.Designer.cs`, 1439 lines).
- **`CrmModern/`** — modern .NET 8 (`CrmModern.API` / `Core` / `Infrastructure`) + React/TypeScript (`CrmModern.Web`). All changes land here.

Shipped state (v0.2.8, commits `bd9c14f` + `035bf3f`, merged to main via PR #8):
- `/quality-control` is the elshan.rasulov-only Kontrol screen with the v5 legacy panel layout (four top cards incl. a **Fabrika** card, full-width master grid at bottom, `h-[44vh]` top region).
- **v4 §5.1 deviation is live:** elshan's Onayla sets `Kontrol='Onay'` **and** `SiparisMiTeklifMi='Planlama'` in one step (`OrderService.ApproveOrderAsync`, OrderService.cs:646-649) — orders skip Muhasebe and land straight in the factory queue. **§1 retires this deviation.**
- `AccountingService.ApproveMuhasebeAndMoveToPlanningAsync` (AccountingService.cs:382) already implements Siparis→Planlama with the legacy Muhasebe.cs 2229-2245 gates, exposed as `POST /api/accounting/{no}/approve-and-move-to-planning` and wired to the "Muhasebe Onayla" button on `AccountingPage.tsx` (`Yonetici,Muhasebe`).
- Factory transitions: `FactoryController.MoveToProduction` (Planlama→Uretim) and `MarkReady` (Uretim→Hazir) are `[Authorize]` only — **no role/user gate** today.
- Logistics: `LogisticsService.GetReadyForShipmentAsync` lists `Hazir + Kontrol='Onay'` (LogisticsService.cs:20-28); a sevk talebi then waits for Muhasebe approval (`LogisticsApprovalsPage`, Paket 3) before Hazir→Lojistik promotion.
- Fabrika money blackout (v5 §2) is enforced server-side via `CrmModern.API/Security/OrderDtoSanitizer.cs` — nothing in this round may regress it.

Items keep the user's numbering. Implement and verify in order — **§1 and §2 touch the same approval chain and the same QC page; do §1 first.** Build cadence after each item: `npm run build` in `CrmModern.Web` + `dotnet build CrmModern.slnx` — both green before moving on.

---

## 1. BURCU.KARAMAN MUHASEBE ONAY EKRANI — üç-aşamalı onay zinciri

**Yeni zincir (hedef):**

```
elshan Onayla (Kontrol)            → Kontrol='Onay', aşama 'Siparis'te KALIR  → Burcu kuyruğu (Cari onay)
burcu.karaman Cari Onay            → Siparis → Planlama                        → Fabrika kuyruğu
simge.cakir Üretime Al / Hazır     → Planlama → Uretim → Hazir                 → Burcu kuyruğu (Lojistik onay)
burcu.karaman Lojistik Onay        → sipariş lojistik-ready listesine düşer    → Lojistik sevk eder
```

### 1.1 Akış değişikliği — backend

- **v4 §5.1 deviation'ını geri al:** `OrderService.ApproveOrderAsync` (OrderService.cs:646-649) artık yalnız `Kontrol='Onay'` yazar; `SiparisMiTeklifMi` dokunulmaz (Teklif/Siparis neyse o kalır). Yorumları güncelle — v4/v5'teki "Onayla→Planlama" acceptance'ı bu round'la geçersizdir. (Onaylanmış bir Teklif, temsilci Siparişe Çevir'ince 'Siparis' olur ve o anda Burcu kuyruğuna düşer — ek iş gerekmez.)
- **Cari onay gate'i:** `POST /api/accounting/{no}/approve-and-move-to-planning` yalnız **burcu.karaman** kullanıcı adına açılır (rol değil — `OrderController.ControlUser` / `PurchaseController` username-gate kalıbı). `AccountingPage`'teki mevcut "Muhasebe Onayla" butonu kaldırılır (gate artık Burcu ekranında yaşar); servis metodundaki guard'lar (`Kontrol='Onay'`, yalnız `Siparis`, idempotent Planlama no-op) aynen kalır.
- **Fabrika gate'i:** `FactoryController.MoveToProduction` ve `MarkReady` yalnız **simge.cakir** kullanıcı adına açılır (backend Forbid + `FactoryPage.tsx`'te butonlar yalnız simge'ye render edilir; diğer Fabrika kullanıcıları listeyi görmeye devam eder).
- **Lojistik onay gate'i (yeni):** `MarkAsReadyAsync` Hazir'a geçirirken siparişi "Burcu lojistik onayı bekliyor" durumuna sokar. Mekanizma: `DatabaseSchemaMigrator`'a idempotent adım — `SiparisAlTablo`'ya nullable `LojistikOnay NVARCHAR` kolonu (`NULL` = eski kayıt/uygulanmaz, `'Bekliyor'`, `'Onay'`). MarkReady → `'Bekliyor'`; yeni endpoint `POST /api/accounting/{no}/approve-logistics` (yalnız burcu.karaman) → `'Onay'`. `LogisticsService.GetReadyForShipmentAsync` (LogisticsService.cs:20-28) filtresine `LojistikOnay='Onay'` eklenir. **Geriye uyum:** migration anında zaten Hazir bekleyen kayıtlar lojistik kuyruğundan kaybolmasın — migrator adımı mevcut `Hazir + Kontrol='Onay'` satırlara `'Onay'` yazar.
- Mevcut sevk-talebi-sonrası Muhasebe onayı (Paket 3, `LogisticsApprovalsPage`) **dokunulmaz** — bu round'un gate'i ondan öncedir (Hazir → ready-list arası).
- Her iki Burcu onayı `SiparisOnaylari`'na audit yazar (`UpsertAsync` kalıbı; örn. `"MuhasebeOnaylandi"` / `"LojistikOnaylandi"`).
- **Kullanıcı adlarını doğrula:** `burcu.karaman` ve `simge.cakir` KullaniciBilgileri'nde bu yazımla var mı kontrol et; farklıysa mevcut yazımı kullan ve raporla.

### 1.2 Burcu ekranı — UI (legacy Muhasebe.cs birebir)

Yeni sayfa, örn. `/accounting/approval` → `RoleGuard usernames={['burcu.karaman']}` (elshan kalıbı; hiçbir rol — Yonetici dahil — giremez). Sidebar + Dashboard kartı yalnız burcu.karaman'a görünür (elshan'ın `/quality-control` kartı kalıbı, DashboardPage.tsx:212-217).

Legacy yerleşim (Muhasebe.Designer.cs — Kontrol ekranındaki v5 düzeniyle aynı ruh): **üstte detay sekmeleri + aksiyon kartları, altta tam genişlik master grid.**

- **Detay sekmeleri** (legacy `tabControl2`): `Muhasebe Geçmişi | Detay | Müşteri | Teslimat | Satış Temsilcisi` — alan setleri legacy ile birebir (modern karşılıkları QC ekranındaki bloklarla aynı; `MuhasebeBilgisiniGetir`, Muhasebe.cs:820 doldurma mantığının portu). Muhasebe Geçmişi sekmesi siparişin tahsilat satırlarını gösterir (mevcut `getTransactionsForOrder`).
- **Özet kartı** (legacy `ozetTabPage`): Sipariş No, Sipariş Notu, Kalan Bakiye, Kapora, Brüt Kapora, İndirim Yüzde, Montaj/Teslimat checkbox + fiyatları, Teslimat Çeşiti + butonlar: `Form'u getir` (buttonFormGetir → OrderDetailModal), `Excel'e yaz` (excelYazOzet_Click, Muhasebe.cs:1558), `Satıcı Ek` (ekButton_Click :1961), `Muhasebe Ek` (MuhasebeEkEkle_Click :2408 — upload).
- **Cari kartı** (legacy `tabPage5` "Cari"): Cari Bilgiler — Sipariş Toplam, Para Birimi, Kapora Bakiye, Sipariş Bakiye, Maliyet + **onay aksiyonları**: kuyruğa göre **Cari Onayla** (approve-and-move-to-planning) veya **Lojistik Onayla** (approve-logistics). Legacy `odmeButton` "Talep Gönder" (maliyet talebi) mevcut `submitMaliyetTalep` ile aynı kalıpta buraya bağlanır.
- **Master grid** (legacy `siparisAlDataGrid`): kuyruk filtreli liste. Legacy hızlı filtre üçlüsü port edilir — `Hepsi | Beklenen | Onaylanan` (siparisAlDataGridHepsi/Beklenen/Onaylanan_Click, Muhasebe.cs:1206/:1267/:1328) + `araButtonInTab_Click` (:567) çoklu filtre alanları. Buna ek **kuyruk seçici**: `Cari Onay Bekleyen` (Kontrol='Onay' ∧ aşama='Siparis') | `Lojistik Onay Bekleyen` (aşama='Hazir' ∧ LojistikOnay='Bekliyor').
- Satır renklendirme **eklenmez** (v5 §5 kararı korunur; legacy `SiparisAlDataGridRenklendir` :434 bilinçli olarak port edilmez). Durum kolon/badge ile okunur.
- **Tablolar rahat kullanılsın:** master grid tam genişlik + iç scroll; §6'daki yoğunluk kuralları bu ekranda da geçerli. UI yorucu olmasın — seçim yokken paneller `—` gösterir (v5 Kontrol kalıbı).

### 1.3 Acceptance

elshan bir siparişi onaylar → aşama 'Siparis' kalır, sipariş Burcu'nun **Cari Onay Bekleyen** kuyruğunda belirir; Fabrika listesinde GÖRÜNMEZ. Burcu Cari Onayla → Planlama; FactoryPage'te yalnız simge.cakir Üretime Al / Hazır butonlarını görür ve kullanabilir (başka Fabrika kullanıcısının JWT'siyle endpoint 403). simge Hazır'a çekince sipariş lojistik-ready listesinde DEĞİL, Burcu'nun **Lojistik Onay Bekleyen** kuyruğundadır; Burcu onaylayınca `/logistics/ready`'de belirir ve sevk akışı (sevk talebi → Paket 3 muhasebe onayı) aynen çalışır. Tüm geçişler Siparişlerim'e ≤30 sn'de yansır (v5 §3 mekanizması — yeni mutasyonlara `['my-orders']` invalidation eklemeyi unutma).

---

## 2. KONTROL EKRANI YERLEŞİM DÜZELTMESİ — Fabrika kartı kalksın, üst bölge scroll'suz, grid sürüklenebilir

`QualityControlPage.tsx` (v5 yerleşimi) üzerine düzeltme — davranış yine değişmez (§1'in onay semantiği değişikliği hariç):

- **Fabrika kartını tamamen kaldır** (Aşama/Bitiş/Not/Kaydet — `stageMut`, `asama`/`asamaTarih`/`asamaNot` state'leri ve ilgili i18n kullanımıyla birlikte). Backend `PUT /api/orders/{no}/stage` endpoint'i dokunulmaz (yalnız UI kalkar). Üstte üç kart kalır: `Filtreme | Detay sekmeleri | Kontrol`.
- **Üst bölgede hiçbir iç scroll olmasın.** Sabit `h-[44vh]` kaldırılır; üst bölge **aktif sekmenin doğal yüksekliğine** oturur (`h-auto`). Cari, Muhasebe Geçmişi, Müşteri, Teslimat, Satış Temsilcisi sekmeleri Detay sekmesinin (Ürün & Bileşen) yüksekliği yüzünden YARIM görünmeyecek — her sekme içeriği tam görünür, `overflow-y-auto` üst kartlardan kalkar.
- **Master grid sürüklenebilir:** üst bölge ile grid arasına dikey bir splitter/drag-handle konur; kullanıcı grid'i yukarı çekip büyütebilir, aşağı itip üst panele yer açabilir (CSS `resize` yeterli değilse basit pointer-event splitter — yeni bağımlılık ekleme). Grid kendi içinde scroll etmeye devam eder.
- Detay sekmesi (en uzun içerik) açıkken bile sayfa 1920×1080 @100%'te toplam yüksekliğe sığmalı: Detay/Ürün&Bileşen listeleri makul bir `max-h` ile kendi içinde kayabilir (yalnız BU sekmede; diğer beş sekme scroll'suz tam görünür).
- Tasarım yormasın: kart paddingleri/yazı boyutları mevcut kompakt ölçekte kalır.

**Acceptance:** elshan girişiyle 1920×1080 → Cari/Müşteri/Teslimat/Temsilci/Muhasebe Geçmişi sekmelerinin tamamı kaydırmasız görünür; Fabrika kartı yok; splitter ile grid yüksekliği değiştirilebiliyor; tüm v5 aksiyonları (Onayla — artık §1 semantiğiyle, Reddet, Cari Güncelle, ekler, Excel, Form'u getir) çalışır.

---

## 3. MUHASEBE TAHSİLAT — telefon numaralarında ülke kodu görünsün

Telefonlar DB'de ülke kodsuz tutulur; alan kodu `Ulkeler.NumaraBirimi`'dedir (örn `+90` — `CustomerFormPage.tsx:83-86` aynı deseni telefon yanında read-only gösteriyor).

- `AccountingPage.tsx` (Tahsilat) üst formundaki tüm Telefon alanları (Müşteri sekmesi `mTelefon`, Teslimat `tTelefon`/`tAltTelefon`, Satış Temsilcisi `sTelefon`) ilgili ülkenin koduyla prefix'li gösterilir: `+90 532...`. Kod, mevcut `getUlkeler()` lookup'ından ülke adıyla eşleştirilerek bulunur (Müşteri → `mUlke`, Teslimat → `tUlke`, Temsilci → `sUlke`); eşleşme yoksa numara olduğu gibi kalır. Numara zaten `+` ile başlıyorsa çift prefix'leme yapılmaz.
- Küçük bir paylaşılan helper yaz (örn `formatPhone(ulkeAdi, telefon, ulkeler)`) — `MuhasebeRowDetailDialog` da telefon gösteriyorsa aynı helper'ı kullansın.
- Kapsam yalnız Tahsilat ekranı (+ detail dialog'u); başka ekranlara yayma.

**Acceptance:** Tahsilatta bir satır seçildiğinde Müşteri/Teslimat/Temsilci sekmelerindeki telefonlar ülke koduyla görünür; ülkesi bilinmeyen kayıtlarda numara değişmeden kalır.

---

## 4. LOJİSTİK SEVK — ödeme türü görünsün + firma "Diğer" serbest metin

`LogisticsReadyPage.tsx` "Sevkiyat Oluştur" dialog'u (LogisticsReadyPage.tsx:89-115):

- **Ödeme türü:** dialog'un üstünde (read-only bilgi şeridi) siparişin ödeme türü gösterilir: `PesinYuzde >= 100 → 'Peşin'`, aksi halde `'Vadeli (%{pesinYuzde} peşin)'` + mevcut `OdemeDurum` (Ödendi/Beklemede) badge'i. Veri için `LogisticsOrderListDto`'ya `PesinYuzde` + `OdemeDurum` alanları eklenir (parasal TUTAR eklenmez — Lojistik'e bakiye/fiyat açılmaz; v5 §2 karartma ruhu korunur). İstersen aynı "Ödeme" kolonu ready-grid'ine de eklenebilir.
- **Firma seçimi:** mevcut serbest `Input + datalist` yerine `Select`: kayıtlı taşıyıcılar (`getCarriers`) + en altta **`Diğer`** seçeneği. `Diğer` seçilince altında zorunlu bir text input belirir ("Firma adı yazın"); gönderimde `firmaAdi` bu serbest metin olur. Validasyon: Diğer + boş metin → required hatası. (Taşıma Türü alanındaki datalist deseni dokunulmaz.)
- i18n: yeni stringler tr + en.

**Acceptance:** Sevk dialogunda siparişin Peşin/Vadeli bilgisi ve ödeme durumu görünür (tutar görünmez); firma listesinden seçim VEYA Diğer→serbest yazım çalışır ve sevk kaydına yazılır.

---

## 5. SİPARİŞ/TEKLİF OLUŞTUR — teslimat şekli & ödeme şekli & standart şartlar Detay listesine otomatik düşsün

`NewOrderPage.tsx` — Detaylar alanı satır-bazlı not listesidir (her satır ayrı `details[]` kaydı, NewOrderPage.tsx:920-933). Otomatik satır yönetimi ekle:

- **Teslimat şekli:** sağdaki Incoterms seçimi (NewOrderPage.tsx:1098, `onTeslimatCesitiChange` :461) yapıldığında Detaylar'a `Teslimat Şekli: {INCOTERM}` satırı eklenir; seçim değişirse mevcut satır GÜNCELLENİR (çoğaltılmaz), temizlenirse silinir.
- **Ödeme şekli:** sağ kolonda yeni bir `Ödeme Şekli` seçimi (radio/select: `Peşin | Vadeli`). Seçimde Detaylar'a `Ödeme Şekli: Peşin` ya da `Ödeme Şekli: Vadeli — %{pesinYuzde} peşin` satırı düşer (pesinYuzde boşsa yalnız `Vadeli`); pesinYuzde sonradan değişirse satır senkron güncellenir. Form state'e alan ekle; backend'e ayrı kolon GEREKMEZ (bilgi details satırı olarak persist olur).
- **Standart şartlar** — yeni boş formda otomatik seed edilen ayrı ayrı satırlar:
  - `Fiyatlar 2 hafta geçerlidir.`
  - `Fiyatlara KDV dahil değildir.`
  - `Fiyatlara nakliye dahil değildir.`
  - `Fiyatlara montaj dahil değildir.` → **Montaj checkbox'ı seçilirse bu satır otomatik silinir**, seçim kaldırılırsa geri gelir.
  - `Bu belgedeki fiyat ve bilgiler üzerindeki tüm haklar saklıdır.` (haklar-saklıdır metni — kesin ifadeyi koddaki sabitte tut, kolay değiştirilebilir olsun)
- **Satır yönetimi kuralları:** otomatik satırlar kullanıcının elle yazdığı satırları ASLA silmez/ezmez — otomatik satırlar bilinen prefix'leriyle (`Teslimat Şekli:`, `Ödeme Şekli:`, sabit şart metinleri) tanınıp idempotent güncellenir. Kullanıcı otomatik bir satırı elle silebilir; aynı tetikleyici tekrar ateşlenmedikçe geri eklenmez. Revize/teklif-yükleme modunda (`details` dolu gelirse) seed ATLANIR — mevcut içerik korunur.
- Bu metinler veri olarak Türkçe kaydedilir (i18n'e girmez); UI etiketleri (yeni `Ödeme Şekli` kontrolü) tr + en i18n alır.

**Acceptance:** Yeni formda beş şart satırı hazır gelir; CIF seçince `Teslimat Şekli: CIF` düşer, FOB'a değişince satır güncellenir; Montaj işaretlenince montaj satırı kaybolur, kaldırılınca döner; Ödeme Şekli seçimi tek satır olarak düşer ve pesinYuzde ile senkron kalır; kullanıcı satırları el ile düzenleyebilir; revize modunda hiçbir otomatik ekleme olmaz; kaydedilen sipariş formunda (OrderDetailModal "Notlar") satırlar tek tek görünür.

---

## 6. SCALING / TABLO TAŞMASI — tüm sütunlar kaydırmasız görünsün

Kullanıcı şikâyeti: pencere yeterince büyük değilken (veya Windows %125 ölçeklemede) tablolar kayıyor; sütunların tamamı yatay kaydırma olmadan görünmüyor.

- Paylaşılan `DataTable.tsx` yoğunluk geçişi: hücre padding'i `px-4 py-3` → daha kompakt (örn `px-2 py-2`), başlıklarda `whitespace-nowrap` kaldırılıp iki satıra sarmaya izin ver, `text-sm` → yoğun gridlerde `text-xs` opsiyonu (prop ile; mevcut sayfalar tek tek elden geçirilmez — yoğun ekranlar opt-in eder).
- **Denetlenecek ekranlar** (en geniş gridler): Kontrol master grid (13 kolon), Tahsilat (17 kolon), Arama, Burcu ekranı (§1), Sipariş formu bileşen tablosu. Hedef: **1366×768 @100% ve 1920×1080 @125% Windows ölçeklemesinde yatay scrollbar görünmemeli**; kolonlar sığmıyorsa öncelik kompaktlaştırma (padding/font/format kısaltma — örn. tarih `dd.MM.yy`), en son çare olarak ikincil kolon birleştirme/kısaltma (kolon SİLME yok).
- Electron penceresi: makul bir `minWidth/minHeight` tanımlı mı kontrol et (örn 1280×720); değilse ekle ki layout'un altına inilemesin.
- Sayfa düzeyinde yatay taşma da denetlenir: hiçbir route'ta `body` yatay scrollbar üretmemeli.

**Acceptance:** 1366×768 ve %125 ölçekli 1920×1080'de Kontrol, Tahsilat, Arama, Lojistik ve Burcu gridlerinin tüm kolonları kaydırmasız ekranda; pencere min boyutun altına küçültülemiyor; hiçbir sayfada gövde yatay scroll yok.

---

## Rules

- **Match existing code conventions.** Tailwind + shadcn, React Query, paylaşılan `DataTable`/`OrderDetailModal`, `formatCurrency`/`formatDate`, her yeni UI stringi için tr + en i18n.
- **Username gate kalıbı:** `burcu.karaman` ve `simge.cakir` gate'leri elshan kalıbıyla (controller'da sabit + `User.FindFirstValue(ClaimTypes.Name)`, frontend'de `useAuth().getUser()?.kullaniciAdi`) yazılır; rol gate'i DEĞİL.
- **v5 §2 karartması korunur:** bu round'da Fabrika rolüne giden hiçbir yeni DTO/endpoint parasal alan taşımamalı (§4'teki `LogisticsOrderListDto` eklemeleri tutar içermez). Burcu ekranı parasal alanları gösterir — burcu.karaman Fabrika rolünde DEĞİLDİR; yine de ekran username-gated olduğundan sorun yok.
- **Schema:** tek beklenen değişiklik §1.1'deki `LojistikOnay` kolonu — idempotent `DatabaseSchemaMigrator` adımı; **EF Migrations YOK.**
- **Süperseden kurallar:** v4 §5.1 / v5 acceptance'taki "Onayla→Planlama" bu round'la kalkar; v5 §1'deki Fabrika kartı ve `h-[44vh]` üst bölge §2 ile kalkar. Diğer tüm v1-v5 davranışları aynen korunur — ilgisiz refactor yok.
- **Build cadence:** her madde sonrası `npm run build` (Web) + `dotnet build CrmModern.slnx` — ikisi de yeşil kalmadan sonraki maddeye geçme.

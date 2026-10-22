# Unix Padel ST CRM — UI/UX Denetimi ve İyileştirme Yol Haritası

## Context
`CrmModern.Web` (React 18 + Vite + Tailwind + TanStack Query, Electron/HashRouter) WinForms CRM'in web portu. Amaç: veri girişini hızlandırmak ve operatör hatalarını azaltmak. Denetim `src/components/ui/*`, `DataTable.tsx`, `tailwind.config.js`, `NewOrderPage.tsx` (2127 satır), QC, Fabrika, Lojistik, Muhasebe, Siparişlerim, Onay sayfaları ve `App.tsx`/`Layout.tsx`/`Sidebar.tsx` satır satır okunarak yapıldı. Satır numaraları `CrmModern.Web/src/` köküne göredir.

Ek hedef (kullanıcı talebi): Türkiye'de operatörlerin zaten alışık olduğu **ETA, LOGO ve SAP** arayüz desenlerinden esinlenerek iş süreçlerini hızlandırmak. Bunun için Bölüm 5 ve Faz 3 eklendi.

**Genel teşhis:** Primitif kullanımı iyi (`<Button>` 150 / ham `<button>` 20). Asıl sorunlar şunlar:
- (a) **Yoğunluk/boyut varyantı eksikliği.** Sayfalar `h-7 text-xs` ezmeleriyle kendi kompakt sistemlerini uyduruyor.
- (b) **Durum renk semantiği 4 ayrı bileşene dağılmış ve kendi içinde çelişkili.**
- (c) **Klavye desteği neredeyse sıfır.**
- (d) **Doğrudan yanlış veri üreten birkaç hata var.** Bunlar UX "cilasından" önce gelir (Faz 0).

---

## 1. Tasarım Sistemi ve Görsel Hiyerarşi

### 1.1 Butonlar
- **Variant tutarlılığı makul, hiyerarşi zayıf.** `ui/button.tsx` 6 variant içeriyor. Sayfalarda rastgele renk ezmesi yok (grep: `<Button className="bg-…">` = 0).
- **Eş ağırlıklı buton ızgaraları birincil aksiyonu boğuyor:**
  - QC `QualityControlPage.tsx:636-657`: 5 outline buton + Onayla + Reddet aynı ızgarada, hepsi `h-7 text-xs` ezmesiyle.
  - `AccountingApprovalPage.tsx:567-580`: 5 outline.
  - `MyOrdersPage.tsx:203-251`: satır başına 6 metin buton.
- **Eksik boyutlar:** `xs`/kompakt boyut yok. Bu yüzden QC'de 9 adet `className="h-7 text-xs"` ve AA'da h-7/h-8 ezmesi var. `Input` için de kompakt boyut yok (QC'de `h-8 text-xs` ezmesi var).
- **`loading` prop yok.** Bekleme durumu (pending) sayfadan sayfaya değişiyor:
  - Yalnız etiket değişimi: `AccountingPage.tsx:405`, `CustomerFormPage.tsx:219`.
  - Yalnız disabled: QC, Factory, NewOrder.
  - Hiçbir şey yok: indirme ve yükleme butonları.
  - Hiçbir yerde spinner yok.
- **İkon butonlarda yer yer emoji ve erişilebilir etiket eksikliği:**
  - Emoji ✏️/✕: `NewOrderPage.tsx:1408-1409, 1783`.
  - `OrderDetailModal.tsx:119-120`: Excel/PDF butonları başlık satırında, Dialog'un mutlak konumlu X'iyle çakışabiliyor.

### 1.2 Tipografi
Ölçek tanımsız. Aynı rol için farklı boyutlar kullanılıyor:

| Rol | Görülen varyasyonlar |
|---|---|
| Sayfa başlığı | `PageHeader.tsx:11` text-xl · QC `:424` ve AA `:374` kendi `h1 text-base` başlıkları |
| Bölüm başlığı | NewOrder `text-base` ortalı (1068…1799) · `text-sm` (1376) · `Label text-xs` (1743, 1802) · AA text-xs/text-sm · CustomerBalance `text-lg` (42) · OrderDetailModal boyutsuz h3 |
| Etiket | `text-[10px] uppercase` (QC 139, AA 71, CTD 71) · `text-xs` sağa hizalı (`NewOrderPage.tsx:2117`, WinForms mirası) · `text-sm` (ui/label) |
| Tablo hücresi | DataTable text-xs/text-sm · elle yazılmış tablolarda `px-3 py-1.5` / `px-2 py-1` / `px-1 py-0.5` ve 5 farklı başlık arka planı (`bg-muted/30…/80`) |
| Toplam | KPICard text-2xl · CurrencyTotals text-lg · AP:528 text-sm · MRD:148 text-xs |

Ayrıca:
- Para kolonlarında `tabular-nums` ve sağa hizalama standardı yok.
- İndirim üç farklı biçimde gösteriliyor: ODM:223 tutar, AP:627 ve AA:551 yüzde.

### 1.3 Rozetler ve renk semantiği

**Dört ayrı rozet sistemi var:**

| Bileşen | Yapı | Sorun |
|---|---|---|
| `StatusBadge.tsx` | `Badge` (cva) | Planlama ile Üretim aynı renk (warning). Sipariş ile Lojistik aynı renk (default). TamamlanmaBekliyor, İptal, Ödendi ve Beklemede eşlenmemiş, outline'a düşüyor. |
| `LogisticsStatusBadge.tsx` | `Badge` | Etiketler hardcoded Türkçe (i18n dışı). `Hazir` burada sarı, StatusBadge'de yeşil. |
| `OrderKontrolBadge.tsx` | Ham span | "Onay" burada **sarı**, StatusBadge'de **yeşil**. Ham enum değerini basıyor (çevrilmiyor). |
| `PurchaseStatusBadge.tsx` | Ham span + `purchase-*` hex renkleri | — |

**Kontrast:** `ui/badge.tsx:14-15`'teki `success` (bg-green-500 + beyaz metin) ve `warning` (bg-yellow-500 + beyaz metin) yaklaşık 2:1 kontrastta kalıyor, WCAG AA'yı geçmiyor.

**Hardcoded renkler (dark varyantı yok):**
- `OrderStageTimeline.tsx:42-57`, `OrderApprovalTimeline.tsx:27-29`
- `LogisticsOffersList.tsx:82`
- AA:349-351, 612-656
- `MyOrdersPage.tsx:168,174`
- Dashboard modül ikonları (`DashboardPage.tsx:54-85`). Bunlarda **semantik çakışma** var: Lojistik yeşil (başarı rengi), Muhasebe sarı (uyarı rengi), Kullanıcılar kırmızı (hata rengi).

**Ham veya teknik metin sızıntıları:**
- `OrderStageTimeline.tsx:60` ham enum (`Uretim`) gösteriyor.
- `CarriersPage.tsx:25,35` "(DISTINCT FirmaAdi)" yazıyor.
- `AccountingPage.tsx:589` "…BLOB" notu kullanıcıya görünüyor.

**Öneri: 6 tonlu semantik palet.** Tailwind'in yanında `index.css` içine `--success/-soft`, `--warning/-soft`, `--info/-soft`, `--danger/-soft`, `--progress/-soft` token'ları eklenir. Soft tonlar için **legacy WinForms/Excel hex'leri** kullanılır (`tailwind.config.js:58-62`: #C6EFCE, #FFC7CE, #FFEB9C, #DDEBF7). Operatör bu renkleri zaten tanıyor.

Tüm durum değerleri `lib/status.ts`'te tek bir kayıtta toplanır: `{ labelKey, tone, icon? }`.

| Ton | Değerler |
|---|---|
| neutral | Teklif, Pasif |
| info | Sipariş, Planlama, Lojistik (kamyon ikonu), Ön Onaylandı, Muhasebe Tamamlandı |
| progress | Üretim |
| warning | Kontrol, Beklemede, Onay Bekliyor, Bekliyor, TamamlanmaBekliyor, Hazır→"Muhasebe Onayı Bekliyor" (lojistik bağlamı) |
| success | Hazır (aşama bağlamı), Onay, Onaylandı, Tamamlandı, Ödendi, Aktif |
| danger | Reddet, Reddedildi, İptal |

Kurallar: renk hiçbir zaman tek başına bilgi taşımaz (etiket + ikon); modül ikonları nötr renkte olur.

---

## 2. B2B Ergonomisi ve Veri Yoğunluğu

### 2.1 NewOrderPage — bilişsel yük
**Mevcut durum:**
- Tek bileşen, yaklaşık 1100 satırlık JSX: 15 `useState`, 8 `useQuery`, 5 `useMutation`, 4 `exhaustive-deps` susturması.
- 60'tan fazla kontrol, 17 şart checkbox'ı ve 5 sabit sekme var. 1280px altında tek uzun kaydırmaya dönüşüyor (1063).

**Hata riskleri:**
- **Toplam görünürlüğü:** Toplam yalnız Cari Bilgi içindeki disabled input'larda (1546, 1564). Yapışkan (sticky) değil, ve tam döküm yalnız Önizleme dialog'unda.
- **Tekrarlanan alanlar:** Müşteri (1098-1120) ve Teslimat (1700-1732) bölümlerinde aynı 6 alan var. "İlişkilendir" butonu onaysız kopyalıyor.
- **Sessiz üzerine yazmalar:**
  - Müşteri seçimi iletişim alanlarını ezer (402-415).
  - Para birimi değişince elle girilmiş fiyatlar yeniden çevrilir (330-343).
  - Kategori seçimi sekmeyi onaysız sıfırlar (620).
  - Ürün adedi değişince satırlardaki manuel adetler ezilir (676-681).
- **Teslimat bölümünde gizli yan etkiler:** Montaj ve Incoterm seçimleri şart listesini değiştirir (779, 1595); EXW adresi otomatik doldurur (781-788).
- **"Çarp" butonu üç farklı anlamda kullanılıyor** (694-721, 796-811).
- **Aranamayan listeler:** Müşteri, ülke ve kategori Select'leri aranamıyor. Müşteri Select'inin `value`'su yok (1073), bu yüzden revize sonrası boş görünüyor.
- **Kayıt sonrası çıkmaz:** Kayıttan sonra navigasyon veya "yeni form" yok; tüm butonlar sessizce disabled olur (522-527).

**Önerilen yerleşim (wizard değil).** Revize, amend ve "Formu Getir" rastgele erişim gerektiriyor; deneyimli operatör için adım adım ilerleyen wizard yavaşlatır. Mevcut 3 kolonlu zihinsel model korunur:

```
┌ Bölüm navigasyonu (sticky): 1 Müşteri ✓ · 2 Setler (2) · 3 Teslimat · 4 Cari ⚠ · 5 Şartlar (17) ┐
│ [Müşteri + Temsilci]   [Set sekmeleri: "Set 1 · Padel Panoramic ×2 · €18.400" ● dolu/○ boş] │ ÖZET RAYI (sticky) │
│                        [+ Set ekle — 5 sabit sekme yerine dinamik]                           │ Brüt / İndirim     │
│                        [Bileşen tablosu + aranabilir checklist]                              │ KDV / Ekstra       │
│                        [Serbest kalemler]                                                    │ TOPLAM (büyük)     │
│ [Teslimat ▸ accordion — "Müşteri adresiyle aynı" anahtarı]                                    │ Peşin % / Kapora   │
│ [Şartlar ▸ accordion — "17 şart seçili" özeti, varsayılan kapalı]                             │ Eksikler: ✗ Peşin %│
└ Sticky aksiyon barı: Önizleme · Formu Getir · Teklif (secondary) · Sipariş (primary) · Ctrl+S ┘
```

### 2.2 DataTable (`components/DataTable.tsx`)
**Mevcut durum:**
- **Sıralama:** `String(...).localeCompare(…, {numeric:true})` ile yapılıyor (81). Ondalıklı para değerleri yanlış sıralanıyor ("1.5" < "1.25"). Hesaplanan kolon key'leri sıralanmıyor (AV:44).
- **Yok:** sticky header, filtre, sayfalama, satır seçimi ve toplu işlem, kolon gizleme, alt toplam satırı.
- **Klavye:** satırlar odaklanamıyor (147-173); sıralanabilir `<th>` başlıkları buton değil (106).

**Toplu işlemin değer katacağı yerler:**
- Fabrika "Üretime Al" ve "Hazır" (`FactoryPage.tsx:110-115`)
- Lojistik Geçmiş "Tamamla" (`LogisticsHistoryPage.tsx:70`)

**Paralel tablo implementasyonları:** 9 elle yazılmış `<table>` var: QC:583, AP:425/543, AA:397/460, AH:352, PD:113, MRD, ODM.

### 2.3 Klavye
**Mevcut durum:**
- `src/` genelinde yalnız 3 `onKeyDown` var (DecimalInput, AutocompleteInput, NewOrder:1820) ve 3 `autoFocus`.
- Hiçbir dialog'da `<form>` yok, bu yüzden **Enter hiçbir yerde gönderim yapmıyor**: tahsilat, red, sevk ve üretim dialog'ları.
- `Label`–`Input` bağı (`htmlFor`/`id`) yok.
- GlobalSearch: Ctrl+K var, ancak sonuçlarda ok tuşuyla gezinme yok (146-178). Metinleri hardcoded Türkçe (104, 137, 143, 159).
- AutocompleteInput: liste kapalıyken Enter, yazılan metni ezer (ACI:59-73). ARIA combobox rolü yok.

---

## 3. Kullanıcı Akışları ve Sürtünmeler

### 3.1 Sipariş yaşam döngüsü (tık sayıları)
| Geçiş | Ekran | Tık | Onay adımı | Sürtünme |
|---|---|---|---|---|
| Teklif/Sipariş kaydı | NewOrder | form + 1 | yok | Kayıt sonrası çıkmaz. Hata toast'u detaysız "Hata" (528, 538, 549). |
| Kontrol → Onay | QC | 2 | **yok** | Onay sonrası seçim temizleniyor (`QualityControlPage.tsx:272`), sonraki satır elle seçilmeli. Zaten "Onay" durumundaki satırda da buton aktif; backend reddediyor. `accounting-orders` önbelleği tazelenmiyor (invalidate edilmiyor). |
| Kontrol → Red | QC | 3 + metin | özel dialog | Gerekçe boşken buton sessizce disabled. Enter çalışmıyor. |
| Onay → Planlama | AccountingApproval | 2 | yok | Ayrı ekran, ayrı rol. |
| Planlama → Üretim | Factory | 2 + not | dialog | Tarih **UTC** (`FactoryPage.tsx:37`, TR'de 3 saat geride). Dialog kapanınca not sıfırlanmıyor. |
| Üretim → Hazır | Factory | 1 | yok | Genel "Başarılı" toast. Tek mutasyon tüm satır butonlarını kilitliyor. |
| Hazır → Sevk talebi | LogisticsReady | 2–5 | dialog | Fiyat 0 geçebiliyor. Taşıyıcı seçici OfferForm'da kopyalanmış. |
| Lojistik → Tamamla | LogisticsHistory | 1 | yok | API `not` kabul ediyor, UI'da alan yok. |
| İptal | LogisticsHistory | — | **`window.prompt`** (73) | Esc veya boş gerekçede sessizce iptal oluyor. |
| Tahsilat | Accounting | 3 (+1) | aşırı ödemede **`window.confirm`** (151) | Dialog'daki Toplam/Ödenen/Kalan değerleri kayıt sonrası güncellenmiyor (526-528). |
| Final onay | AccountingApproval | 2 | yok | Final maliyet zorunluluğu açıklanmıyor (677). |

### 3.2 Geri bildirim
- **Toast (`ToastProvider.tsx`):**
  - `aria-live`/`role` yok; success varyantı ve ikon yok.
  - Hata toast'ları da 4.5 sn'de kapanıyor.
  - Kapat butonunda `aria-label` yok.
  - `hooks/useToast.ts` ölü kod (hiç import edilmiyor).
- **Hata açıklaması tutarsız:** `describeApiError` / `(e as Error).message` / hiç açıklama yok. Yaklaşık 12 kopya boilerplate var.
- **Boş sonuç hata gibi gösteriliyor:** QC'de boş arama sonucu **destructive** toast çıkarıyor (202-206); DataTable'ın kendi boş durumu varken.
- **Yükleme durumu:**
  - DataTable skeleton'ı iyi.
  - Detay panelleri yükleme durumu göstermiyor: QC `isLoading` kullanılmıyor (221), AA sekmeleri, FA/PD dialog'ları boş render oluyor.
  - Metin tabanlı göstergeler tutarsız: "Yükleniyor..." (Carriers hardcoded), "(Yükleniyor)".
  - `isError` hiçbir yerde ele alınmıyor. NewOrder:1272'deki "Bileşenler yükleniyor…" yazısı fetch hata verirse sonsuza dek kalıyor.
- **Filtre sorguları:**
  - Debounce yok: Factory:52, History:29, AH:162 her tuş vuruşunda sunucuya sorgu atıyor.
  - `placeholderData` yok, bu yüzden her filtre değişiminde tablo skeleton'a düşüyor.
- **Satıra özel bekleme durumu yok:** Factory:115, History:70, MO:209'da tek bir mutasyon tüm satırların butonlarını kilitliyor.

---

## 4. Önceliklendirilmiş Uygulama Planı

### Faz 0 — Veri bütünlüğü hataları (UX'ten önce; doğrudan yanlış kayıt üretir)
| # | Dosya | Mevcut durum / sorun | Önerilen çözüm | Etki |
|---|---|---|---|---|
| F0-1 | `components/DecimalInput.tsx:31-36` | `parseFloat(text.replace(',', '.'))` yalnız ilk virgülü çeviriyor. "1.234,56" girişi **1.234** olarak kaydediliyor, ekran yazılanı göstermeye devam ettiği için hata görünmüyor. NewOrder (9 kullanım), Accounting, AccountingApproval ve AccountingHistory etkileniyor. | `lib/number.ts` içinde `parseDecimalTR`: virgül varsa tüm noktalar binlik ayırıcıdır ve virgül ondalık olur; birden fazla nokta varsa noktalar binliktir; tek nokta ondalıktır. Blur'da `tr-TR` biçimine (`1.234,56`) normalize edilir, böylece operatör ayrıştırılan değeri görür. | Yüksek |
| F0-2 | `pages/accounting/AccountingHistoryPage.tsx` | Dosya çift kodlanmış (mojibake). Kullanıcı ekranda "â€”", "â€¢", "âˆ’" görüyor (302, 385-390, 404, 420, 425, 429). | Dosyayı UTF-8'e geri çevir (cp1252→utf8 tersine çevirme). Yorumlar da düzelir. | Yüksek |
| F0-3 | `pages/orders/NewOrderPage.tsx:490` | `blank()` 17 şartı önceden doldurduğu için (85) `hasLineItems` her zaman true. Boş sipariş kontrolü hiç tetiklenmiyor. | Kontrol `sets.length + freeItems.length > 0` olarak değiştirilir. | Yüksek |
| F0-4 | `NewOrderPage.tsx:471-483` ve `694-721` | `buildCurrentSets` kategorisi seçili **her** sekmeyi kaydediyor. "Çarp" ön-kayıtta etkisiz, oysa yorumu (1290) tersini söylüyor. Operatör Çarp'ın gerekli olduğunu sanıyor; bakmak için kategori seçtiği sekme fark etmeden siparişe giriyor. | **Karar: seçili her sekme dahil (mevcut kural korunur).** Set sekmesindeki Çarp butonu ve yanıltıcı yorum kaldırılır. Sekme etiketinde "Siparişe dahil · €X" göstergesi ve sekme başına "Seti kaldır" (`useConfirm` ile) eklenir. `expandRecipe` kayıt sonrası otomatik çalışır. | Yüksek |
| F0-5 | `NewOrderPage.tsx:1854`, `944-964` | Revize modunda "Formu Getir" açık; başka bir siparişi yükleyip `reviseFrom` altına kaydedebiliyor. Hidrasyon sürerken Kaydet aktif (`reviseLoading` yalnız fetch'i kapsıyor). | Getir revize modunda gizlenir. `hydrating` bayrağı eklenir ve tüm kaydetme butonlarına bağlanır. | Yüksek |
| F0-6 | `FactoryPage.tsx:37`, `AccountingPage.tsx:73,274`, `AccountingApprovalPage.tsx:126-174`, `LogisticsReadyPage.tsx:30` | `new Date().toISOString().slice(...)` UTC tarih üretiyor. TR'de datetime 3 saat geride; 00:00-03:00 arasında tarih bir gün geride. | `PaymentDetailsPage.tsx:24-28`'deki yerel saat yardımcısı `lib/date.ts`'e taşınır (`localDateInput()`, `localDateTimeInput()`) ve her yerde kullanılır. Dialog açılışında yeniden hesaplanır. | Yüksek |
| F0-7 | `NewOrderPage.tsx:966-993` vs `1359`, `1406` | Bileşen satır toplamları ve serbest kalemler tabloda tutar olarak görünüyor ama `toplamFiyat`'a girmiyor. | **Karar: kasıtlı, bilgi amaçlı.** Bu kolonlar görsel olarak ayrıştırılır: soluk metin, başlıkta "Bilgi · toplama dahil değil" etiketi. Özet rayında toplamın neyden oluştuğu (set + montaj + teslimat + ekstra) açıkça listelenir. | Orta |

### Faz 1 — Quick Wins (düşük efor, yüksek etki)
| # | Dosya | Mevcut durum / sorun | Önerilen çözüm | Etki |
|---|---|---|---|---|
| QW-1 | `index.css`, `tailwind.config.js`, `components/ui/badge.tsx` | Semantik durum token'ı yok. success/warning kontrastı yaklaşık 2:1. | Bölüm 1.3'teki 6 ton CSS değişkeni (light/dark) olarak eklenir. Badge varyantları `neutral/info/progress/success/warning/danger` soft stile geçer (koyu metin + açık zemin + ince border); eski `success`/`warning` adları alias olarak kalır. | Yüksek |
| QW-2 | `lib/status.ts`, `StatusBadge.tsx`, `LogisticsStatusBadge.tsx`, `OrderKontrolBadge.tsx`, `PurchaseStatusBadge.tsx` | 4 ayrı eşleme var, çelişkili ("Onay" sarı/yeşil, Hazır sarı/yeşil), eşlenmemiş değerler var, i18n dışı etiketler var. | Tek bir `STATUS_REGISTRY` (`{labelKey, tone, icon}`) ve `context` parametresi (`stage`/`logistics`/`kontrol`/`purchase`/`odeme`). Dört bileşen bu kaydı okuyan ince sarmalayıcılara dönüşür. Lojistik etiketleri `tr.json`/`en.json`'a taşınır. QC (394-400) ve AA (343) düz metin yerine rozet kullanır. | Yüksek |
| QW-3 | `components/ui/button.tsx`, `ui/input.tsx` | Kompakt boyut yok (QC'de 9× `h-7 text-xs`, `h-8` input ezmeleri). `loading` yok. | Button'a `size: 'xs'` (h-7 px-2 text-xs) ve `loading` prop'u eklenir (Loader2 + `aria-busy` + disabled). Input'a `inputSize: 'sm'` (h-8 text-xs) ve `aria-invalid` durumunda kırmızı border. QC ve AA'daki ezmeler kaldırılır. Mevcut `isPending ? t('common.saving')` desenleri `loading`'e taşınır. | Yüksek |
| QW-4 | `components/PageHeader.tsx`, QC:423-441, AA:374 | QC ve AA kendi `h1 text-base` başlıklarını kullanıyor. Bölüm başlıklarında 6 farklı stil var. | PageHeader'a `density="compact"` eklenir. Yeni `ui/section-title.tsx` (text-sm font-semibold, sola hizalı). Ölçek: sayfa text-lg, bölüm text-sm/semibold, etiket text-xs/medium/muted, hücre text-xs (compact) veya text-sm, toplam text-base semibold `tabular-nums`. NewOrder'ın ortalı h3'leri (1068…1799) dönüştürülür. | Orta |
| QW-5 | `components/ToastProvider.tsx`, `hooks/useToast.ts` | a11y yok, success yok, hata 4.5 sn'de kayboluyor. Ölü hook dosyası var. | `success`/`warning` varyantları ve ikon eklenir. `role="status"` (destructive için `role="alert"`), hata TTL'i 8 sn, üzerine gelince duraklama, kapat butonuna `aria-label`. `hooks/useToast.ts` silinir. `lib/apiError.ts` içine `toastApiError(toast, e, titleKey)` yardımcısı (yaklaşık 12 kopya birleşir). | Orta |
| QW-6 | `LogisticsHistoryPage.tsx:73`, `AccountingPage.tsx:151`, `AccountingApprovalPage.tsx:275`, `UsersPage.tsx:88` | `window.prompt`/`window.confirm`: Electron'da stilsiz, i18n dışı, klavye davranışı tutarsız. | Yeni `ui/confirm-dialog.tsx` (+ Promise tabanlı `useConfirm()`) ve `components/ReasonDialog.tsx`. ReasonDialog'da `<form>` ile Enter gönderir, `autoFocus` var, gerekçe `FieldError` ile zorunlu. Aşırı ödeme onayında tutar karşılaştırması gösterilir. | Yüksek |
| QW-7 | QC:202-206, QC:275-281, QC:652-655, AA:206-212 | Boş arama destructive toast çıkarıyor. Seçim yokken butonlar aktif, tıklayınca hata veriyor. "Onay" satırında Onayla aktif. | Boş sonuç DataTable'ın boş durumunda (`emptyMessage`) gösterilir. Seçim yoksa veya satır zaten "Onay" durumundaysa buton disabled olur ve tooltip'te sebep yazar. | Orta |
| QW-8 | `NewOrderPage.tsx:2118` + `tr.json:258`, `:1896`, `:1001-1005`, `:1150` | "Müşteri Adı * *" çift yıldız. Amend gerekçesi boşken buton açıklamasız disabled. Alt başlıkta geliştirici metni var ("3 kolon"). Ek kabul tipi uyuşmuyor (ZIP/RAR vs PDF/JPG). | i18n'deki `*` kaldırılır. Gerekçe için `FieldError` + gönderimde `submitted` bayrağı. Alt başlık kullanıcı diline çevrilir. Ek metinleri hizalanır. | Orta |
| QW-9 | `components/ui/dialog.tsx:18, 54` | Overlay `bg-black/80` bağlamı tamamen kapatıyor. sr-only "Kapat" hardcoded. Boyut varyantı yok. | Overlay `bg-black/50`. `t('common.close')`. `DialogContent`'e `size: sm/md/lg/xl/full` prop'u (sayfalardaki `max-w-*` ezmelerinin yerine). | Düşük |
| QW-10 | `components/Sidebar.tsx:25-56, 128` | 23 düz öğe, gruplama yok. 4× Truck, 3× Calculator, 6× FileText ikon tekrarı. Aktiflik `pathname ===` (alt rotalar vurgulanmıyor). | Grup başlıkları: Satış / Operasyon / Lojistik / Muhasebe / Satın Alma / Yönetim. Benzersiz ikonlar. Aktiflik `startsWith` (en uzun eşleşme). | Orta |
| QW-11 | `pages/DashboardPage.tsx:243`, `:54-85` | KPI kartları ("Bekleyen Kontrol: 7") tıklanamıyor. Modül ikon renkleri durum renkleriyle çakışıyor. | KPI kartı ilgili kuyruğa `Link` olur. Modül ikonları nötr veya primary renkte olur. | Orta |
| QW-12 | `GlobalSearch.tsx`, `LogisticsStatusBadge.tsx`, `CarriersPage.tsx:25,35`, `OrderStageTimeline.tsx:60`, `OrderApprovalTimeline.tsx:20`, `DynamicPaymentForm.tsx`, `AccountingPage.tsx:589`, `CurrencyTotals.tsx:19,24` | Hardcoded Türkçe metinler, ham enum değerleri, teknik metinler (SQL, BLOB). | i18n anahtarlarına taşınır. Ham enum yerine `statusLabel` kullanılır. Teknik notlar kaldırılır. | Düşük |
| QW-13 | `lib/utils.ts:47-57`, `CurrencyTotals.tsx:10`, `CustomerBalancePage.tsx:45`, `lib/currency.ts` | Üç ayrı sembol haritası. `formatCurrency` varsayılan 'EUR'ı düz metin basıyor ("EUR1.234,56": AP:555, PD:72-130). Sembol başta. | Tek `formatMoney(amount, paraTipi)`: `lib/currency.ts` içindeki `paraTipiToIso` ve `isoSymbol` yeniden kullanılır, `tr-TR` biçiminde "1.234,56 €" üretir. Diğer haritalar silinir. | Orta |
| QW-14 | Dialog'lar: QC:783, Factory:191, Ready:172, AP tahsilat (~520-575), MO:361, FA:189, OffersList:124 | Enter gönderim yapmıyor. Kapanınca state sıfırlama tutarsız. | Gövde `<form onSubmit>` ile sarılır, primary buton `type="submit"`, ilk alan `autoFocus`, açılışta state reset. | Yüksek |
| QW-15 | `FactoryPage.tsx:52`, `LogisticsHistoryPage.tsx:29`, `AccountingHistoryPage.tsx:162` | Her tuş vuruşunda sunucu sorgusu atılıyor, tablo skeleton'a düşüyor. | `hooks/useDebouncedValue.ts` (300 ms) + `placeholderData: keepPreviousData` + tablo üstünde ince "yenileniyor" göstergesi. | Orta |
| QW-16 | `App.tsx:3-29` | 25 sayfa eager import ediliyor (NewOrder 110 KB dahil). Layout'taki `Suspense` (68) boşa çalışıyor. | `React.lazy` ile rota bazlı bölme (named export → `.then(m => ({default: m.X}))`). | Düşük |

### Faz 2 — Structural Refactors
| # | Dosya | Mevcut durum / sorun | Önerilen çözüm | Etki |
|---|---|---|---|---|
| SR-1 | `pages/orders/NewOrderPage.tsx` → `pages/orders/new-order/` | 2127 satırlık monolit. Sekiz saf fonksiyon (`blank`, `detailToForm`, `buildRow`, `autoOznitelik`, `EXCEL_BOM_CATEGORIES`…) ve hesaplamalar bileşen içinde. | Klasör yapısı:<br>• `useOrderForm.ts`: reducer; form + setTabs + mode (new/revise/amend) + dirty + hydrating.<br>• `lib/orderForm.ts`: saf fonksiyonlar ve `computeTotals()`.<br>• Bölümler: `CustomerSection`, `RepSection`, `SetTabs/{SetTab, ComponentChecklist, ComponentTable}`, `FreeItemsSection`, `DeliverySection`, `CariSection`, `TermsSection`, `OrderSummaryRail` (sticky, eksik alan listesi ve tıklayınca alana kaydırma), `ActionBar`.<br>• Dialog'lar: `FreeItemDialog`, `LoadOrderDialog`, `PreviewDialog`.<br>• Raw `<section>` yerine `ui/card`.<br>• Bölüm 2.1'deki yerleşim, dinamik "+ Set ekle", Şartlar ve Teslimat accordion'ları.<br>• Kayıt sonrası başarı paneli: "Yeni form · Siparişlerim · Ek yükle".<br>• Ctrl+S.<br>• Yıkıcı işlemlerde (kategori değişimi, set iptali, kalem silme, İlişkilendir) `useConfirm`. | Yüksek |
| SR-2 | `components/ui/form-field.tsx` (yeni), `NewOrderPage.tsx:2106` (`Field`) | `Field` sayfaya gömülü. Label–input bağı, `aria-invalid`, hata mesajı bağlantısı yok. | `FormField` (`useId` → `htmlFor`/`aria-describedby`, `required` göstergesi, `FieldError` entegre, prefix/suffix). İlk hataya odak/kaydırma yardımcısı: `focusFirstError()`. | Yüksek |
| SR-3 | `components/ui/combobox.tsx` (yeni), `AutocompleteInput.tsx` | Müşteri, ülke ve kategori listeleri aranamıyor (NewOrder 1073/1105/1208, CustomerBalance:28, QC filtreleri). ACI'de ARIA yok ve Enter metni eziyor. | Radix Popover + listbox tabanlı aranabilir `Combobox` (Türkçe `toLocaleLowerCase('tr')` eşleşme, ↑↓/Enter/Esc, `aria-activedescendant`). ACI bunun üstüne taşınır. | Yüksek |
| SR-4 | `components/DataTable.tsx` | Bölüm 2.2'deki eksikler. | Geriye uyumlu v2:<br>• `sortValue`/`type: 'number' \| 'date' \| 'money'` accessor, `align`, `tabular-nums`.<br>• Sticky header.<br>• `tableId` ile kolon görünürlüğü (localStorage).<br>• Opt-in `selectable` + `BulkActionBar`.<br>• Roving tabindex ile ↑/↓, Enter = `onRowClick`, Space = seçim.<br>• `footer` toplam satırı slotu.<br>• AV (`pageSize:1000`) için istemci sayfalama.<br>Değerlendirme: headless `@tanstack/react-table` aynı ailede; v2 bunun üstüne kurulabilir. | Yüksek |
| SR-5 | `components/FilterBar.tsx` (yeni): Factory:129-178, Ready:140-168, Offers:52-68, QC:675-761, AP:484-496, AA:707, AV:77, AH:178-253, MO:266-330 | 9 farklı filtre barı (etiketli/etiketsiz, `'all'` vs `'__all__'`, canlı vs "Ara" butonu). | `FilterBar` + `FilterField` + Reset + Enter-ile-uygula + debounce. Durum URL'de (`useSearchParams`) tutulur, geri tuşunda ve sayfalar arası korunur. Elle yazılmış `includes` filtreleri (Ready:71, Offers:41, AP:225, AA:178, MO:99) `lib/filter.ts`'e taşınır. | Orta |
| SR-6 | Muhasebe ortak bileşenleri: AP, AA, MRD, CTD, ODM, FA, PD | Kopyalar: işlem geçmişi tablosu (AP:543, AA:397, MRD:111), MuhasebeEk upload (AP:579, AA:746), read-only alan (AA:63-100, CTD:71, MRD:30, ODM:343, FA:210, AP:604), müşteri/teslimat/temsilci sekmeleri (AP:327, AA:494), taşıyıcı seçici (Ready:176, OfferForm:73), timeline (StageTL:39, ApprovalTL:21). | `components/accounting/TransactionHistoryTable`, `MuhasebeEkUpload`, `ui/key-value.tsx` (`KeyValue`/`ReadOnlyField`), `CustomerInfoTabs`, `CarrierPicker`, `ui/timeline.tsx`, `MoneyTotals` (CurrencyTotals + AH KPI + CB birleşir). | Orta |
| SR-7 | `lib/queryKeys.ts` + `hooks/useAppMutation.ts` (yeni) | Önbellek tazeleme kümeleri her dosyada farklı. AP:136 kullanılmayan `'accounting-transactions'`'ı tazeliyor, `tx-history`'yi tazelemiyor. QC `accounting-orders`'ı tazelemiyor. Tek mutasyon tüm satırları kilitliyor. | Merkezi query key fabrikası ve "order değişti" grubu (`invalidateOrderGraph()`). `useAppMutation`: standart hata ve başarı toast'u. Satır bazlı bekleme durumu `mutation.variables` ile; yalnız tıklanan satır spinner gösterir. | Orta |
| SR-8 | QC, Factory, History, Accounting akışları | Bölüm 3.1'deki sürtünmeler. | • QC: "Onayla ve sonrakine geç" (seçim bir sonraki "Kontrol" satırına geçer), opsiyonel `kontrolNot`, kısayollar (O = onayla, R = reddet). Onayla tek tık kalır ama 5 sn'lik "Geri al" toast'u eklenir veya hafif onay. **Tercih kullanıcıya.**<br>• History: Tamamla için not alanı + onay.<br>• Tahsilat dialog'u: kayıt sonrası bakiye kutusu tazelenir; "Kaydet" ve "Kaydet ve kapat".<br>• AA: final maliyet zorunluluğu inline mesaj olarak gösterilir. | Yüksek |
| SR-9 | `main.tsx` (HashRouter), NewOrder ve diğer formlar | Kaydedilmemiş değişiklik koruması yok. RR 6.26'da `useBlocker` yalnız data router ile çalışıyor. | `createHashRouter` + `RouterProvider`'a geçiş (rotalar `App.tsx`'ten taşınır). `useUnsavedChangesGuard(dirty)` (useBlocker + `beforeunload`). | Orta |
| SR-10 | `hooks/useHotkeys.ts` (yeni), `GlobalSearch.tsx`, `Sidebar.tsx:101` | Global kısayol yalnız Ctrl+K. Arama sonuçlarında ok gezintisi yok, istek iptali yok. Sidebar kapanınca w-0 (tamamen gizli). | Kısayol kaydı: `/` filtreye odak, Ctrl+S kaydet, Ctrl+Enter dialog primary, `?` yardım paneli. GlobalSearch'e ↑↓/Enter + `AbortController`. Sidebar kapalı modda ikon rayı (w-14, tooltip'li) ve kuyruk sayaç rozetleri (Dashboard KPI sorgusu yeniden kullanılır). | Orta |

### Faz 3 — ERP referanslı süreç hızlandırma (SAP / LOGO / ETA)
Gerekçe ve desen eşlemesi Bölüm 5'te. Faz 1 ve Faz 2 primitiflerine dayanır.

| # | Dosya | Mevcut durum / sorun | Önerilen çözüm | Etki |
|---|---|---|---|---|
| E-1 | `GlobalSearch.tsx` → `components/CommandPalette.tsx`; `Sidebar.tsx:25-56` + `DashboardPage.tsx:75-85` → `lib/navigation.ts` | Ctrl+K yalnız kayıt arıyor. Menü tanımı iki yerde (Sidebar `navItems`, Dashboard modül haritası). | **SAP işlem kodu** mantığı. Tek `navigation.ts` kaydı (rol filtresi dahil) Sidebar, Dashboard ve palet tarafından okunur. Palette `>` ile komutlar çalışır: `YS` Yeni Sipariş, `SL` Siparişlerim, `KK` Kontrol, `FB` Fabrika, `LH` Lojistik Hazır, `TH` Tahsilat. Belge açma: `SP 2025-0123` → sipariş detayı; `RV 2025-0123` → `/orders/new?revise=…`. Son kullanılanlar zaten var (GlobalSearch:8-17). | Yüksek |
| E-2 | `hooks/useHotkeys.ts`, `Layout.tsx`, `electron/main.cjs:83,103-105` | Uygulama genelinde F-tuşu standardı yok. Electron menüsü kaldırıldığı için F1–F11 serbest; yalnız F12 DevTools'a bağlı. | **SAP GUI + ETA/LOGO fiş tuşları:** F1 kısayol yardımı · F3 geri/kapat · F4 değer yardımı · F5 yenile (query invalidate) · F8 filtreyi uygula · Ctrl+S kaydet · Ins yeni satır · Ctrl+Del satır sil (onaylı) · Ctrl+Enter dialog onayı. Ekranın altında bağlama göre değişen **kısayol şeridi** (örn. "F4 Ara · Ctrl+S Kaydet · Esc Kapat"), kapatılabilir. | Yüksek |
| E-3 | `hooks/useEnterNavigation.ts` (yeni), NewOrder Cari/Teslimat, Accounting tahsilat, `NewPurchaseRequestPage` | Enter hiçbir şey yapmıyor; fare zorunlu. | **ETA tarzı Enter ile sonraki alan.** Form konteynerine opt-in `data-enter-nav`. Enter sonraki odaklanabilir alana geçer, Shift+Enter geri döner. Son alanda Enter = primary submit. Textarea ve Combobox açıkken devre dışı. | Yüksek |
| E-4 | `components/ui/combobox.tsx` (SR-3) + `components/LookupDialog.tsx` (yeni) | Müşteri, kategori ve bileşen seçimi aranamayan dropdown'larla yapılıyor. | **SAP F4 / LOGO "…" liste butonu:** alanda F4 veya "…" çok kolonlu arama dialog'unu açar (müşteri: ad, ülke, VAT, telefon, açık bakiye). Kod veya ad parçası yazıp Enter → tek eşleşme varsa doğrudan seçilir, yoksa liste filtreli açılır. | Yüksek |
| E-5 | `Layout.tsx`, `ToastProvider.tsx` | Toast 4.5 sn sonra kayboluyor; okunmayan hata geri getirilemiyor. Form hataları dağınık. | **SAP durum çubuğu + Fiori Message Popover:** alt durum çubuğunda son mesaj ve oturum mesaj günlüğü (tıklayınca liste). Formlarda "3 hata" rozeti; açılan listede her hataya tıklayınca ilgili alana odaklanılır (SR-2 `focusFirstError` ile). | Orta |
| E-6 | `components/FilterBar.tsx` (SR-5) + `DataTable` v2 (SR-4) | Filtreler sayfa değişiminde kayboluyor. Kolon düzeni sabit. | **SAP varyant yönetimi / LOGO kayıtlı filtreler:** "Görünüm" menüsü: filtre + kolon sırası/görünürlüğü + sıralama birlikte, kullanıcıya özel kaydedilir. Varsayılan görünüm seçilebilir (örn. Muhasebe: "Bu ay · ödenmemiş"; Fabrika: "Planlamada"). Önce localStorage, sonra backend'de kullanıcı tercihi. | Yüksek |
| E-7 | `DataTable` v2 (SR-4); `@radix-ui/react-dropdown-menu` zaten bağımlılıkta | Satır aksiyonları sayfa başına farklı: QC'de üst ızgara, MO'da 6 buton, AP'de ikon üçlüsü. Excel butonları ekrandaki listeyi değil başka veri setini indiriyor (`AccountingPage.tsx:286`). | **SAP ALV + LOGO liste penceresi:** satırda sağ tık **bağlam menüsü** (İncele, Revize, Kopyala, Onayla, Reddet, Ek, PDF, Excel). Toolbar ile aynı aksiyon kaydını kullanır. Para kolonlarında **para birimine göre ara toplam** (karışık döviz asla tek toplamda birleşmez). "Görünümü Excel'e aktar" ekrandaki filtreli satırları ve görünür kolonları indirir. `getOrderTotals` (`api/orders.ts:52`) şu an hiç kullanılmıyor; liste alt toplamında kullanılabilir. | Yüksek |
| E-8 | `components/OrderDetailModal.tsx` → `components/order/DocumentFlow.tsx` | Sipariş geçmişi `OrderStageTimeline` ve `OrderApprovalTimeline` arasında parçalı; tahsilatlar ve lojistik ayrı ekranlarda. | **SAP Belge Akışı / LOGO bağlantılı belgeler:** tek dikey akış. Teklif → revizyonlar → Sipariş → Kontrol onayı → peşinat tahsilatları → Planlama/Üretim → sevk talebi/lojistik teklif → Tamamlandı. Her düğümde tarih, kullanıcı, durum rozeti ve ilgili ekrana link. Veri mevcut uçlardan birleştirilir: `getApprovals`, `getTransactionsForOrder`, `getOrderDetail`, lojistik teklifleri. | Yüksek |
| E-9 | `components/MasterDetailLayout.tsx` (yeni); Factory:223, Ready:228, Offers:119, QC:811'deki `OrderDetailModal` kullanımları; QC ve AA'daki elle yapılmış split'ler | Detay her yerde modal: liste kapanıyor, satırlar arası geçiş için kapat-aç gerekiyor. QC/AA kendi üst-alt split'lerini yazmış (QC:237-260 splitter). | **Fiori Flexible Column Layout / Object Page:** liste solda, detay sağda (yeniden boyutlanabilir). Detayda bölüm çapa çubuğu: Genel · Kalemler · Cari · Lojistik · Belge Akışı · Ekler. ↑/↓ ile satır değişince detay güncellenir. Seçim URL'de (`?no=…`): geri tuşu ve paylaşılabilir link çalışır. | Yüksek |
| E-10 | `pages/WorkInboxPage.tsx` (yeni) + `DashboardPage.tsx:54-60` KPI sorgusu | Her rol bekleyen işini farklı ekranlarda arıyor; Dashboard sayıları gösteriyor ama tıklanmıyor. | **Fiori My Inbox / Worklist:** role göre birleşik "İş Kutum": QC bekleyen, Burcu'nun cari/lojistik/tamamlanma kuyrukları, Fabrika planlama, Lojistik hazır, satın alma onayları. Her kalemde yaş ("3 gündür bekliyor", eşik aşılınca warning tonu) ve satır içi birincil aksiyon. Giriş sonrası varsayılan açılış sayfası olabilir. Sidebar sayaçları aynı sorgudan beslenir. | Yüksek |
| E-11 | `pages/orders/new-order/*` (SR-1) | Toplam ve döküm dağınık. Set, serbest kalem, ekstra, montaj ve teslimat ayrı bloklarda. | **LOGO/ETA fiş düzeni:** üstte başlık (cari, tarih, döviz, şirket, temsilci), ortada kalemler, altta **sabit toplam paneli** (Brüt · İndirim · Masraf/Ekstra · KDV · Net · Peşinat/Kapora). Dar ekranda özet rayı yerine bu alt panel kullanılır. Uzun vadede tek kalem gridi ve "satır tipi" kolonu (Set / Serbest / Ekstra / Montaj / Teslimat) değerlendirilir (veri modeli değişikliği gerekir). | Orta |
| E-12 | `pages/orders/new-order/useOrderForm.ts` | Uzun formda Electron çökmesi veya yanlış navigasyon tüm girişi kaybettiriyor. | **Fiori taslak yönetimi:** form 10 sn'de bir ve blur'da localStorage'a taslak olarak yazılır (kullanıcı + mod + kaynak no anahtarıyla). Dönüşte "Kaydedilmemiş taslak · 14:32 — Devam et / Sil". Başlıkta "Taslak kaydedildi" göstergesi. SR-9 koruması ile birlikte çalışır. | Yüksek |
| E-13 | `pages/PreferencesPage.tsx` (yeni) + `NewOrderPage.tsx:71-88` `blank()` | Her yeni formda Şirket, Para Tipi, Ödeme Şekli ve Peşin % elle seçiliyor. | **SAP kullanıcı parametreleri / LOGO kullanıcı tercihleri:** "Tercihlerim": varsayılan şirket (`SIRKETLER`), para tipi, ödeme şekli, peşin %, tablo yoğunluğu (compact/normal), açılış sayfası. `blank()` bu varsayılanlarla dolar. | Orta |
| E-14 | `MyOrdersPage.tsx` satır aksiyonları; `api/orders.ts:106` `cloneOrder` | `cloneOrder` API'si var ama hiçbir sayfa kullanmıyor. "Formu Getir" yalnız NewOrder içinden erişilebiliyor. | **SAP "referansla oluştur" / LOGO "Kopyala":** liste satırında ve bağlam menüsünde "Kopyala ile yeni" → `/orders/new?copyFrom=NO` (veya `cloneOrder`). "Formu Getir" adı "Referanstan oluştur" olarak netleşir. | Orta |
| E-15 | `pages/accounting/CustomerBalancePage.tsx` | Yalnız döviz başına bakiye kartları var (44-53). Hareket dökümü yok. Müşteri listesi aranamıyor. | **LOGO/ETA cari hesap ekstresi:** tarih aralıklı Borç (sipariş) / Alacak (tahsilat) / **yürüyen bakiye** tablosu, döviz başına ayrı. Satırdan belgeye link (E-8). Excel/PDF. Müşteri seçimi Combobox (E-4). | Yüksek |
| E-16 | NewOrder müşteri seçimi (1073); `api/accounting.ts:115` `getCustomerBalance` | Sipariş girerken müşterinin açık bakiyesi görünmüyor. | **LOGO risk kontrolü (bilgilendirici):** müşteri seçilince başlıkta "Açık bakiye: 12.400 € · Son tahsilat: 03.10" çipi. Eşik aşılırsa warning tonu. Engellemez; Faz 0 kararlarıyla uyumlu. | Orta |
| E-17 | `DataTable` v2 seçim (SR-4); `FactoryPage.tsx:110-115`, `LogisticsHistoryPage.tsx:70`, `AllPurchaseRequestsPage.tsx` | Her kayıt tek tek işleniyor. | **SAP toplu işlem / Fiori toplu onay:** seçili satırlar için tek dialog (Fabrika: tek tarih + not ile toplu "Üretime Al"; Lojistik: toplu Tamamla; Satın alma: toplu onay). Sonuçta "8 başarılı / 1 hata" özeti ve hatalı satırlar işaretli. QC onayı bilinçli olarak tekil kalır (kontrol sipariş bazında inceleme gerektirir). | Yüksek |

### Yeni veya değişecek ortak modüller (özet)
- **`components/ui/`:**
  - Mevcut dosyalar güncellenir: `badge`, `button`, `input`, `dialog`, `select`, `PageHeader`.
  - Yeni dosyalar: `confirm-dialog`, `form-field`, `combobox`, `section-title`, `key-value`, `timeline`, `checkbox` (Radix; NewOrder ve QC'deki 9 ham checkbox'ın yerine), `accordion` (tailwind keyframes zaten tanımlı, `tailwind.config.js:69-82`).
- **`lib/`:** `number.ts`, `date.ts`, `status.ts` (registry), `currency.ts` (`formatMoney`), `apiError.ts`, `queryKeys.ts`, `orderForm.ts`.
- **`hooks/`:** `useDebouncedValue`, `useConfirm`, `useAppMutation`, `useHotkeys`, `useUnsavedChangesGuard`, `useEnterNavigation`, `useSavedViews`.
- **Faz 3 bileşenleri:**
  - `components/CommandPalette.tsx` (GlobalSearch'ün yerine)
  - `components/LookupDialog.tsx`
  - `components/StatusBar.tsx` + mesaj günlüğü
  - `components/MasterDetailLayout.tsx`
  - `components/order/DocumentFlow.tsx`
  - `components/ShortcutHints.tsx`
  - `lib/navigation.ts`
  - `pages/WorkInboxPage.tsx`
  - `pages/PreferencesPage.tsx`

---

## 5. ERP Referanslı İyileştirmeler (SAP · LOGO · ETA)

### 5.1 Neden bu referanslar
- **Kullanıcılar bu düzenleri zaten biliyor.** Kullanıcı kitlesi WinForms'tan geliyor ve klavye alışkanlığı güçlü. Muhasebe tarafı LOGO/ETA'nın fiş, cari ekstre ve F-tuşu kalıplarını tanıyor.
- **SAP Fiori'nin floorplan'leri** (List Report, Object Page, Worklist, Flexible Column Layout) yoğun veri ekranlarında kendini kanıtlamış düzenler.
- **İlke: desen ödünç al, görünümü kopyalama.** Mevcut shadcn/Tailwind görsel dili korunur. ERP'lerden yalnız davranış, bilgi mimarisi ve klavye ergonomisi alınır.

### 5.2 Alınacak / alınmayacak
- **Alınır:**
  - klavye öncelikli giriş (Enter ile ilerleme, F-tuşları, F4 değer yardımı)
  - kayıtlı görünümler (varyantlar)
  - belge akışı
  - iş kutusu
  - fiş tipi sabit toplam paneli
  - durum çubuğu ve mesaj günlüğü
  - sağ tık bağlam menüsü
  - kullanıcı varsayılanları
  - taslak
- **Alınmaz:**
  - SAP GUI'nin ikon yoğun toolbar'ları ve modal zincirleri
  - LOGO'nun pencere içinde pencere (MDI) yapısı ve sabit pikselli formları
  - ETA'nın düşük kontrastlı, renksiz ekranları
  - İşlem kodlarını ezberleme zorunluluğu: palet hem kodla hem adla arar.

### 5.3 Desen eşleme özeti
| Kaynak | Desen | Projedeki karşılığı | Madde |
|---|---|---|---|
| SAP GUI | İşlem kodları (VA01 oluştur / VA02 değiştir / VA03 görüntüle) | Komut paleti kısa kodları (YS, SP, RV…) | E-1 |
| SAP GUI | F4 değer yardımı | Combobox + LookupDialog | E-4 |
| SAP GUI | Durum çubuğu | Alt durum çubuğu + oturum mesaj günlüğü | E-5 |
| SAP ALV | Layout varyantı, ara toplam, Excel'e aktarım | Görünüm kaydet, döviz başına ara toplam, görünüm export | E-6, E-7 |
| SAP | Belge akışı | `DocumentFlow` | E-8 |
| SAP | Kullanıcı parametreleri | Tercihlerim | E-13 |
| SAP | Referansla oluştur | Kopyala ile yeni (`cloneOrder`) | E-14 |
| SAP / Fiori | Toplu işlem / toplu onay | `BulkActionBar` | E-17 |
| Fiori | Flexible Column Layout + Object Page çapa çubuğu | `MasterDetailLayout`; NewOrder bölüm navigasyonu | E-9, SR-1 |
| Fiori | My Inbox / Worklist | İş Kutum | E-10 |
| Fiori | Message Popover | Form hata listesi → alana odak | E-5, SR-2 |
| Fiori | Draft handling | Otomatik taslak | E-12 |
| Fiori | Semantik renkler (Positive / Critical / Negative / Information / Neutral) | 6 tonlu palet | QW-1 |
| LOGO | Liste penceresinde sağ tık menüsü | Satır bağlam menüsü | E-7 |
| LOGO / ETA | Fiş ekranı alt toplam paneli | Sabit toplam paneli | E-11 |
| LOGO | Kayıtlı filtreler | Görünüm yönetimi | E-6 |
| LOGO / ETA | Cari hesap ekstresi (yürüyen bakiye) | CustomerBalance → Ekstre | E-15 |
| LOGO | Cari risk kontrolü | Açık bakiye çipi (bilgilendirici) | E-16 |
| LOGO | Modül menüsünde Kayıtlar / Hareketler / Raporlar ayrımı | Sidebar gruplarında "İşlemler / Raporlar" alt ayrımı (örn. Muhasebe: Tahsilat, Onay │ Geçmiş, Ekstre) | QW-10 |
| ETA | Enter ile alan geçişi, fare gerektirmeyen giriş | `useEnterNavigation` | E-3 |
| ETA / LOGO | F-tuşu odaklı giriş + ekranda tuş ipuçları | F-tuşu standardı + kısayol şeridi | E-2 |

### 5.4 Süreç hızlandırma senaryoları (önce → sonra; sayılar tahminidir)
| Senaryo | Bugün | Hedef |
|---|---|---|
| 10 siparişin kontrol onayı | Her sipariş için satır tıkla + Onayla. Seçim temizleniyor (QC:272), sonraki satır yeniden aranıyor. Yaklaşık 20+ tık ve fare. | Liste solda, detay sağda (E-9). ↓ ile gezilir, `O` ile onaylanır, otomatik sonrakine geçilir (SR-8). Sipariş başına 1 tuş. |
| Tahsilat girişi | + → tutar (fare) → Kaydet → Kapat. Enter çalışmıyor; TR ondalık hatası riski var (F0-1). | Bağlam menüsü veya kısayol → tutar alanı odaklı → Enter ile kaydet → bakiye anında güncellenir. Fare yok. |
| Yeni sipariş | Müşteri dropdown'ında kaydırma, 5 sabit sekme, Çarp ritüeli, toplam görünmüyor. | Yazarak veya F4 ile müşteri (açık bakiye çipiyle) → varsayılanlar dolu (E-13) → Enter ile alan geçişi (E-3) → sabit toplam (E-11) → Ctrl+S. Tekrar eden müşteri için "Kopyala ile yeni" (E-14). Taslak koruması (E-12). |
| 5 siparişi üretime alma | 5 × (Üretime Al + tarih + not + Kaydet), yaklaşık 20 tık. | 5 satır seçilir → toplu "Üretime Al" → tek tarih ve not → tek dialog (E-17). |
| "Bu sipariş nerede?" | QC, Fabrika, Lojistik ve Muhasebe ekranlarında ayrı ayrı arama. | Ctrl+K → `SP 2025-0123` → Belge Akışı tek ekranda (E-1, E-8). |
| Sabah iş planı | Her rol menüde kendi kuyruklarını tek tek açıyor. | Girişte "İş Kutum": yaşlandırılmış bekleyen işler ve satır içi aksiyonlar (E-10). |

## Kapsam kararı
Kullanıcı tercihi: **yalnız rapor**. Bu oturumda kod değişikliği yapılmaz; bu doküman nihai çıktıdır. Aşağıdaki sıra, ileride uygulanacak çalışma için önerilen yol haritasıdır.

## Önerilen uygulama sırası (gelecek çalışmalar için)
1. **Faz 0** (F0-1 … F0-7) — her biri ayrı commit. F0-4 ve F0-7 iş kuralları netleşti (yukarıdaki tabloda "Karar" notları).
2. **Faz 1**:
   - QW-1→QW-3 (token ve primitifler) önce gelir; diğerleri bunlara dayanır.
   - Ardından QW-6, QW-14 (dialog ve klavye) ve QW-2 (rozet kaydı).
   - Kalanlar bağımsızdır.
3. **Faz 2** ayrı PR'lar halinde. Sıra: SR-2 + SR-3 (form primitifleri) → SR-1 (NewOrder) → SR-4 + SR-5 (tablo ve filtre) → SR-7 → SR-6 → SR-8/9/10.
4. **Faz 3** (ERP desenleri):
   - **Erken alınabilecekler:** E-2 (F-tuşları) ve E-3 (Enter navigasyonu) küçük işlerdir; QW-3 ve QW-14'ten hemen sonra yapılabilir.
   - **Bağımlılık sırası:**
     - E-1, `lib/navigation.ts` çıkarıldıktan sonra.
     - E-4, SR-3 ile birlikte.
     - E-6, E-7 ve E-17, SR-4 ve SR-5'in üstüne.
     - E-9 ve E-10, DataTable v2 sonrası.
     - E-11, E-12 ve E-13, SR-1 kapsamında.
     - E-8 ve E-15, SR-6 bileşenleriyle.
   - **En yüksek getiri/efor oranı:** E-2, E-3, E-10, E-14 (API hazır) ve E-16 (API hazır).

## Doğrulama
- **Her adımda:** `CrmModern.Web` içinde `npm run build` (`tsc -b` + vite build) temiz geçmeli. Projede test runner yok. `lib/number.ts` (`parseDecimalTR`) ve `lib/orderForm.ts` (`computeTotals`) için `vitest` eklenip birim test yazılması önerilir. Örnek vakalar: "1.234,56" → 1234.56, "1,5" → 1.5, "1.5" → 1.5, "1.000.000" → 1000000.
- **Manuel kontrol:** `npm run dev` (5173) tarayıcı panelinde açılır (backend API gerekir):
  - NewOrder: TR biçimli tutar girişi, blur'da biçimlenme, boş sipariş uyarısı, revize modunda Getir'in gizli olması, Ctrl+S.
  - QC: onay/red, Enter ile red gerekçesi gönderme.
  - Factory: üretim tarihinin yerel saat olması.
  - Muhasebe Geçmişi: "—" karakterlerinin doğru görünmesi.
  - Rozet kontrastı light ve dark modda.
  - Klavyeyle (Tab/Enter/Esc) tüm dialog akışları.
- **Erişilebilirlik:** Tarayıcı DevTools Lighthouse a11y taraması (label–input bağı, kontrast, `aria-live`).
- **Faz 3 — "fare yok" senaryoları:**
  - Ctrl+K → `YS` → müşteri (F4) → alanlarda Enter → Ctrl+S.
  - QC'de ↓/`O` ile ardışık onay.
  - Muhasebe tahsilatında tamamen klavye.
  - Fabrika'da toplu üretime alma.
  - Electron paketinde F-tuşlarının çakışmadığının doğrulanması (`electron/main.cjs` F12 hariç).
- **Faz 3 — kabul ölçütü:** Bölüm 5.4'teki tık sayıları, operatörle yapılan kısa bir oturumda önce/sonra karşılaştırılarak ölçülür.

# İngilizce dil uyumu: analiz ve uygulama planı

**Tarih:** 2026-11-18 · **Kaynak dil:** Türkçe (`tr.json`) · **Hedef dil:** İngilizce (`en.json`)
**Kapsam:** web arayüzü, Electron kabuğu, API hata kodları, Excel/proforma çıktıları
**Durum (2026-11-18):** K1-K4 önerilen biçimde kabul edildi. Faz 0-7 çalışma kopyasında uygulandı, commit veya yayın yapılmadı. Bölüm 2 ve eklerdeki "mevcut" değerler analiz anındaki durumu anlatır.

**Yayından önce kalanlar:** proforma terimleri ve EN proforma biçimi (K2) hukuk/finans onayı bekliyor; gerçek sunucu ve veriyle uçtan uca deneme yapılmadı; dolu tablolarda ve Yeni Sipariş ekranında İngilizce taşma kontrolü yapılmadı.

**Bilinçli bırakılanlar:** CSV sayı biçimi Excel'in Türkçe ayarına göre kalır; proforma şablonunun sabit etiketleri iki dilde de İngilizcedir; katalog, ülke ve beyanname verileri çevrilmez; indirilen dosya adları Türkçedir; kullanılmayan `OrderService.GenerateExcelAsync` değiştirilmedi.

## 1. Özet

Çeviri dosyalarının teknik yapısı sağlam. Asıl sorunlar dosyanın dışında: İngilizce arayüzde Türkçe kalan ekranlar, Türk biçimine bağlı sayı girişi ve anlamı kayan bazı para ve onay metinleri.

| Kontrol | Sonuç |
|---|---|
| TR / EN anahtar sayısı | 1.786 / 1.772 |
| EN'de eksik anahtar | **14** (hepsi `apiErrors.*`) |
| EN'de fazla anahtar, boş değer | 0 |
| `{{yer tutucu}}`, HTML etiketi, satır sonu farkı | 0 |
| Kodun verdiği parametre ile metnin beklediği parametre farkı | 0 |
| Kodda sabit yazılmış olup dosyada bulunmayan anahtar | 0 |
| Sunucunun gönderdiği, iki dilde de olmayan hata kodu | **15** |
| Tekil/çoğul ayrımı olmayan sayaçlı metin | **8** |
| Aynı TR metnin birden çok EN karşılığı | 26 grup |
| Anlam incelemesi bulgusu | 81 (10'u yüksek öncelikli) |
| Koda gömülü görünür Türkçe | yaklaşık 190 metin, 11 ana dosya |

## 2. Bulgular

### A. Yanlış veri veya yanlış karar riski

**A1. İngilizce sayı girişi yanlış tutar kaydedebilir.** `parseDecimalTR` her dilde Türk biçimini varsayıyor (`lib/number.ts:14`, `components/DecimalInput.tsx`). Fonksiyon çalıştırılarak doğrulandı:

| Yazılan | Kullanıcının kastı | Kaydedilen |
|---|---|---|
| `1,234.56` | 1234,56 | **1,23456** |
| `1,500.00` | 1500 | **1,5** |
| `12,500` | 12500 | **12,5** |
| `1.500` | 1,5 | **1500** |

**A2. Yetki hatası kullanıcının oturumunu kapatıyor.** Başkasının stok çıkışını geri almaya çalışan kullanıcıya `UnauthorizedException` atılıyor (`WarehouseStockService.cs:627`). Bu HTTP 401 üretiyor, `lib/axios.ts:60` de 401'de oturumu silip girişe yönlendiriyor. Özel mesaj da görünmüyor. Çeviri sorunu değil ama aynı hata akışında duruyor.

**A3. Müşteriye giden proformada "Vadeli" yanlış aktarılıyor.** "Vadeli" iki yerde "Installments" olmuş: `clauses.odemeVadeli*` ve `ClauseText.cs:86-88`. Taksit ise uygulamada ayrı bir alan (`payment.fields.taksit`). "Montaj" da aynı iki yerde "Assembly" (`ClauseText.cs:96`), sözlükte ise "Installation". Sözlük `clauses.*` metinlerini kapsam dışı tuttuğu için bu değişiklik karar gerektirir (K2).

**A4. Para ve onay metinlerinde anlam kayması.** Tam liste Ek B'de. En önemlileri:

| Anahtar | Sorun |
|---|---|
| `qc.cariNewAmount` | Girilen değer toplam ödenenin **üzerine yazılıyor** (`OrderService.cs:965`), metin yeni ödeme ekleniyormuş gibi okunuyor. |
| `logistics.payment.pesin`, `payment.types.pesin` | "Peşin" bir ödeme koşulu, "Paid in advance" paranın alındığını söylüyor. |
| `factory.uretimTarihiHint` | "leave empty for now" alanı sonra doldurma gibi okunuyor, oysa boş bırakılınca o anki saat yazılıyor. |
| `docFlow.approval.logisticsApproved` | Onayı Muhasebe veriyor, metin Lojistik onaylamış gibi okunuyor. |
| `customers.deleteConfirm` | **İki dil de yanlış:** "geri alınamaz" diyor, oysa silme geri alınabiliyor (`CustomersPage.tsx:66`). |
| `apiErrors.fileTooLarge` | **İki dil de yanlış olabiliyor:** metin 25 MB diyor, beyanname yüklemede sınır 10 MB (`WarehouseStockService.cs:38`). |

### B. İngilizce arayüzde Türkçe görünen metinler

**B1. Eksik hata çevirileri.** `lib/axios.ts:46` kodu bulamazsa sunucunun Türkçe mesajını gösteriyor. 14 kod yalnız TR'de var, 15 kod iki dilde de yok. Metinler Ek A'da. Ayrıca `PurchaseAttachment.tsx:51` kod sistemini atlayıp sunucu mesajını doğrudan gösteriyor.

**B2. Koda gömülü metinler.**

| Alan | Dosya | Yaklaşık metin |
|---|---|---|
| Antrepo ve depo | `WarehouseStockPage`, `StockItemDrawer`, `StockExitDialog`, `StockStatusBadge` | 90 |
| Sistem ayarları (yalnız yönetici) | `SystemSettingsPage` | 80 |
| Sipariş kapanışı | `OrderDetailModal:359-368`, `DocumentFlow:155,172,187`, `OrderStageTimeline:53`, `AccountingPage:235`, `MyOrdersPage:198` | 12 |
| Masaüstü güncelleme penceresi | `electron/main.cjs:53-58` | 5 |
| Eski sürüm notları | `LEGACY_CHANGELOG` (`UpdatesPage:31`) | yalnız TR |

**B3. Çevrilmeden gösterilen ham değerler.**

| Değer | Yer | Görünen |
|---|---|---|
| Para tipi | `OrderDetailModal:458`, `NewOrderPage:195` | "from Dolar to TL". TR'de de "Dolar'ya" gibi bozuk ek üretiyor. |
| Önceki aşama | `OrderDetailModal:362`, `DocumentFlow:187` | "Uretim" gibi ham kod |
| Arama kategorisi | `SearchService.cs:92-149`, `CommandPalette:173,276` | "Sipariş", "Bileşen" |
| Birim seçenekleri | `FreeItemsSection:16,134`, `NewPurchaseRequestPage:25,234` | "Adet", "Kutu" |

### C. Tarih, sayı ve dil ayarı

- Tarih, saat ve para gösterimi İngilizcede de Türk biçiminde (`18.11.2026`, `1.234,50 €`). Yerler: `lib/utils.ts:11,41`, `lib/currency.ts:75`, `lib/number.ts:36,42`, `DataTable:297,344`, `SaveStatus:22`, `StatusBar:82,106`, `DashboardCharts:103`, `NewOrderPage:872`, `RepPerformancePage:296`.
- `index.html` hep `lang="tr"` ve dil değişince güncellenmiyor. Ekran okuyucu ve tarayıcı dili yanlış algılıyor.
- **Değişmemesi gerekenler:** müşteri adı arama ve sıralamasındaki `tr-TR` kullanımları (`toLocaleLowerCase`, `localeCompare`). Veri Türkçe olduğu için doğrular.

### D. Çoğul ve terim tutarlılığı

- **"1 files" türü hatalar:** `lookup.hint`, `folder.buttonWithCount`, `folder.uploaded` ("file(s)"), `orders.form.termsSummary`, `addStock.aiFilledBanner`, `addStock.aiFilledBannerNoPreview`, `logisticsOffer.count`, `purchase.summarySuffix`.
- **Bir kavram, birden çok karşılık:** Peşin (Upfront / Paid in advance), Vadeli (Installments / Pay later), Seç (Choose / Select), Sil (Delete / Discard / Remove), Vergi No (VAT No / Tax No), Kalan bakiye (Balance due / Remaining balance), Bekliyor (Pending / Waiting), Red sebebi (3 biçim).
- **Sözlükte kural yok:** çok kelimeli etiketlerin 112'si Title Case, 399'u sentence case. Hangi metnin hangisini kullanacağı tanımlı değil.
- **TR kaynakta da tutarsızlık var:** "Siparişi Aç / Siparişi aç", "Son maliyet / Final maliyet", "kuyruk / iş sırası". TR'deki iki hata mesajı sözlükte yasak "Lütfen" içeriyor.

### E. Sunucu çıktıları

- Temsilci raporunda sayfa adları İngilizce, başlıklar Türkçe. Bu karışım **iki dilde de** görünüyor ve rapor dil parametresi almıyor (`ReportingService.cs:926-1021`, `api/reporting.ts:58`).
- Muhasebe Excel'leri ve sipariş Excel'i yalnız Türkçe (`ReportingService.cs:47-54`, `AccountingService.cs:418-424`, `OrderService.cs:1164`). "Kapora Bakiyesi" başlığı TR sözlüğüne de aykırı.
- Proformada `lang` yalnız standart şartları etkiliyor. `ReportingService.cs:438` Türkçe, `:514-515` ise TR çıktıda bile sabit İngilizce metin yazıyor.
- Sunucunun 78 başarı mesajı Türkçe ama arayüz bunları kullanmıyor. **İş gerekmiyor.**

## 3. Kararlar

| # | Karar | Öneri | Etkisi |
|---|---|---|---|
| K1 | İngilizcede sayı ve tarih biçimi | `en-GB`: `1,234.56`, `18/11/2026`. Giriş alanı da aynı kurala uyar. | Faz 1, Faz 4 |
| K2 | Proformadaki "Installments" ve "Assembly" | "Deferred payment" ve "Installation". **Metin müşteriye gittiği için önce hukuk/finans onayı alınmalı.** | Faz 1 |
| K3 | Katalog, ülke ve birim verileri | Veri Türkçe kalır. Yalnız sabit birim listesi ekranda çevrilir, veritabanına eklenmez. | Faz 3 |
| K4 | Excel çıktılarının dili | Arayüz dilini izlesin (proformadaki `lang` modeli). Muhasebe dosyaları Türkçe kalacaksa yalnız temsilci raporu düzeltilir. | Faz 6 |

## 4. Uygulama planı

Boyut: **S** yarım güne kadar, **M** 1-2 gün, **L** 3 gün ve üzeri.

### Faz 0: Sözlüğü tamamla (S)
`docs/ux-copy/00-sozluk.md` dosyasına eklenecekler:
- Peşin = Advance payment, Vadeli = Deferred payment, Kalem = Item, Seç = Select, Kaldır = Remove, Red sebebi = Reason for rejection, Maliyet tablosu = Cost sheet.
- Gümrük: Gönderici = Consignor, Alıcı = Consignee, Rejim kodu = Customs procedure code, Antrepo = Bonded warehouse.
- Büyük harf kuralı: menü, sayfa ve sözlükteki özel adlar Title Case, diğer tüm metinler sentence case.
- K1-K4 kararları.

**Bitti sayılması için:** sözlükte açık kavram kalmaması.

### Faz 1: Veri ve karar riskleri (M, ilk yayın)
1. `lib/number.ts`: ayrıştırıcıyı dile duyarlı yap. Her iki ayırıcı varsa sondaki ondalıktır. Tek ayırıcıda TR ve EN kuralı ayrı işler. `formatDecimalInput` aynı kuralı izler.
2. `WarehouseStockService.cs:627`: 401 yerine kodlu bir yetki hatası döndür. Oturum kapanmasın, özel mesaj görünsün.
3. `apiErrors.fileTooLarge`: beyanname için 10 MB'lık ayrı kod ekle.
4. Ek B'deki **yüksek** bulguları iki dosyada birlikte düzelt.
5. K2 onaylanırsa `en.json` ve `ClauseText.cs` aynı anda değiştirilir.

**Doğrulama:** Ek C'deki sayı senaryoları, iki dilde tutar girip kaydetme, başka kullanıcının çıkışını geri alma denemesi, EN proforma karşılaştırması.

### Faz 2: Hata mesajı bütünlüğü (S)
1. Ek A'daki 29 anahtarı ekle. 15 yeni anahtar TR'ye de eklenir.
2. `claudeFailed` ve benzeri kodlarda durum bilgisini `args` ile taşı, yoksa ayrıntı kaybolur.
3. `PurchaseAttachment.tsx:51` hata gösterimini `describeApiError` üzerinden yap.
4. TR'deki "Lütfen" ifadelerini kaldır.

**Doğrulama:** sunucudaki tüm kodların iki dosyada bulunması (Faz 7 betiği).

### Faz 3: Koda gömülü metinler (L)
Sıra görünürlüğe göre:
1. Sipariş kapanışı metinleri ve ham aşama adları (`stageLabel`).
2. Para tipi gösterimi için tek yardımcı: `paraTipi` değerini `currency.name.*` anahtarına eşle. `currencyDesc` metnini Türkçe ek gerektirmeyecek biçimde yaz.
3. Birim etiketleri: kayıtlı değer aynı kalır, yalnız görünen ad çevrilir.
4. Arama kategorisi: sunucuya kararlı bir kod ekle, `CommandPalette` Türkçe metinle karşılaştırmayı bıraksın.
5. Antrepo ekranları: mevcut `addStock.*`, `stockUndo.*` düzenine yeni `warehouse.*` anahtarları.
6. Sistem ayarları: `systemSettings.*` anahtarları.
7. Electron: dil bilgisini `preload` köprüsüyle ana sürece aktar, güncelleme penceresi buna göre açılsın.
8. `LEGACY_CHANGELOG`: İngilizcede bölümü gizle. Eski notları çevirmeye değmez.

**Doğrulama:** EN modunda her ekranı gezmek, Türkçe harf taramasının yalnız izinli listeyle sonuçlanması.

### Faz 4: Biçim ve dil ayarı (M)
1. `lib/format.ts`: etkin dile göre tarih, saat, sayı ve para biçimi. Mevcut `formatDate`, `formatMoney`, `formatNumberTR` çağrıları imza değişmeden buna bağlanır (39 dosya etkilenmez).
2. Kalan sabit `tr-TR` gösterimlerini bu modüle taşı. Arama ve sıralamadakilere dokunma.
3. Dil değişince `document.documentElement.lang` güncellensin.
4. Dil değişince biçimli hücrelerin yenilendiğini kontrol et.

**Doğrulama:** iki dilde aynı siparişin tarih, tutar ve grafik görünümü. TR çıktısının **hiç değişmemesi** kabul şartıdır.

### Faz 5: Dil cilası (M)
1. 8 sayaçlı metne `_one` / `_other` ekle. `n` parametresini `count` yap, `folder.uploaded` içindeki "file(s)" kalksın.
2. Ek B'deki orta ve düşük bulgular.
3. Bölüm 2-D'deki terim birleştirmeleri ve büyük harf kuralı.
4. Uzayan etiketlerin ekrana sığması: TR'ye göre belirgin uzayan 81 kısa metin (`Waiting for account approval` gibi) dar sütun, rozet ve butonlarda kontrol edilir.

**Doğrulama:** Faz 7 betiği, EN modunda görsel taşma kontrolü.

### Faz 6: Excel ve proforma (M, K4'e bağlı)
1. Temsilci raporuna `lang` ekle, sayfa adı ve başlıkları tek dile getir.
2. K4 kararına göre muhasebe ve sipariş Excel'leri.
3. Proformadaki `Özel Kalem` ve sabit İngilizce satırlar dile bağlanır.
4. "Kapora Bakiyesi" → "Kalan peşinat" (sözlük).

**Doğrulama:** her dosya iki dilde indirilip açılır. Proforma düzeni ve tutarları değişmemeli.

### Faz 7: Tekrarı önleme (S)
`scripts/check-i18n.mjs`, `check-release-notes.mjs` gibi `npm run release` başında çalışır. Yayını durduran kontroller:
- TR/EN anahtar eşitliği, yer tutucu ve etiket eşitliği.
- C# içindeki tüm hata kodlarının iki dosyada bulunması.
- EN değerde Türkçe harf (izinli liste hariç).
- Sözlükte yasak kelimeler.

Uyarı olarak: `.tsx` içinde çevrilmemiş Türkçe metin. Bu analizin betikleri temel alınabilir.

> Bu mantığı Faz 1'den hemen sonra eklemek de mümkün. Web projesinde test altyapısı olmadığı için A1 senaryoları da bu betiğe küçük bir kontrol olarak eklenebilir.

## 5. Sıra ve riskler

Önerilen yayın sırası: **Faz 0 → 1 → 2 → 7 → 3 → 4 → 5 → 6.**

| Risk | Önlem |
|---|---|
| Faz 4 TR görünümünü bozabilir | TR biçimi birebir korunur, önce/sonra karşılaştırılır. |
| Veritabanına giden Türkçe değerler yanlışlıkla çevrilebilir | `lib/status.ts` kuralı geçerli: **yalnız görünen etiket çevrilir.** |
| `CommandPalette` Türkçe kategori metniyle mantık kuruyor | Sunucu kodu eklenmeden etiket değiştirilmez. |
| Sözleşme metni değişikliği | K2 onayı olmadan yayınlanmaz. |

## Ek A: Eklenecek hata metinleri

**TR'de var, EN'de eksik (14):**

| Anahtar | EN önerisi |
|---|---|
| `geminiKeyMissing` | The Gemini API key isn't set. You can save it under Admin > System Settings. |
| `geminiKeyInvalid` | The Gemini API key is invalid or unauthorized. |
| `geminiQuota` | The Gemini API quota is used up. Try again later or renew the key. |
| `geminiFailed` | Couldn't reach the Gemini service. |
| `geminiUnreadable` | Couldn't read the declaration. Check the details and enter them manually. |
| `declarationAlreadyExists` | This declaration number is already registered. |
| `exitQuantityExceedsRemaining` | The exit quantity can't be more than the remaining quantity. |
| `exitPackagesExceedsRemaining` | The exit package count can't be more than the remaining packages. |
| `stockAlreadyExhausted` | All of this item has already left stock. |
| `exitAlreadyUndone` | This exit has already been undone. |
| `exitUndoExpired` | The 30-day undo period has ended. This exit can't be undone. |
| `itemHasExits` | An item with exits can't be deleted. Undo its exits first. |
| `quantityLessThanExited` | The new quantity can't be less than the quantity already exited. |
| `packagesLessThanExited` | The new package count can't be less than the packages already exited. |

**İki dilde de yok (15):**

| Anahtar | TR | EN önerisi |
|---|---|---|
| `orderDeleted` | Silinmiş sipariş tamamlanamaz. | A deleted order can't be completed. |
| `quoteCannotBeCompleted` | Teklif aşamasındaki kayıtlar tamamlanamaz. | Records at the Quote stage can't be completed. |
| `orderAlreadyCompleted` | Bu sipariş zaten tamamlanmış. | This order is already completed. |
| `orderCancelled` | İptal edilmiş sipariş tamamlanamaz. | A cancelled order can't be completed. |
| `closeFailed` | {{no}} kapatılamadı. | Couldn't close {{no}}. |
| `orderAlreadyClosed` | Tamamlanmış veya iptal edilmiş siparişin teklifi onaylanamaz. | A quote for a completed or cancelled order can't be approved. |
| `claudeKeyMissing` | Claude API anahtarı tanımlı değil. | The Claude API key isn't set. |
| `claudeKeyEmpty` | Claude API anahtarı boş olamaz. | The Claude API key can't be empty. |
| `claudeFailed` | Claude servisine ulaşılamadı. | Couldn't reach the Claude service. |
| `claudeUnreadable` | Belge okunamadı. Belgenin okunaklı olduğunu kontrol et. | Couldn't read the document. Check that it's legible. |
| `geminiKeyEmpty` | Gemini API anahtarı boş olamaz. | The Gemini API key can't be empty. |
| `invalidAiProvider` | Geçersiz yapay zekâ sağlayıcısı. Claude veya Gemini seç. | Invalid AI provider. Choose Claude or Gemini. |
| `invalidLocation` | Geçersiz konum. Antrepo veya Depo seç. | Invalid location. Choose Bonded warehouse or Warehouse. |
| `itemsRequired` | En az bir mal kalemi gir. | Enter at least one item. |
| `packagesNegative` | Kap adedi eksi olamaz. | The package count can't be negative. |

## Ek B: Anlam ve terim düzeltmeleri

"TR de" işaretli satırlarda önce kaynak metin düzeltilir. Öncelikler Bölüm 4'teki fazlara bağlanır.

### Yüksek (Faz 1)

| Anahtar | Mevcut EN | Önerilen EN | Not |
|---|---|---|---|
| `qc.cariNewAmount` | New paid amount | New total paid | TR de: "Yeni toplam ödenen" |
| `logistics.payment.pesin`, `payment.types.pesin` | Paid in advance | Advance payment | Koşul, gerçekleşmiş ödeme değil |
| `orders.form.odemeVadeli` | Installments | Deferred payment | K2 ile birlikte |
| `clauses.odemeVadeli` | Payment Method: Installments | Payment Method: Deferred Payment | K2, `ClauseText.cs` de |
| `clauses.odemeVadeliPesin` | …Installments — {{pesin}}% upfront | …Deferred Payment — {{pesin}}% upfront | K2, `ClauseText.cs` de |
| `clauses.montaj` | Assembly is not included in the prices. | Installation is not included in the prices. | K2, `ClauseText.cs` de |
| `factory.uretimTarihiHint` | Local time; leave empty for now. | Local time. If left empty, the current time is used. | |
| `docFlow.approval.logisticsApproved` | Logistics approved | Logistics approval given | Onayı Muhasebe verir |
| `accApproval.cancelTx.hint` | The payment is left out of totals and the balance due; … | The payment no longer counts toward totals, so the balance due goes up by this amount; the record stays in the list, crossed out and marked "Deleted". | TR de |
| `customers.deleteConfirm` | Delete "{{name}}"? This can't be undone. | Delete "{{name}}"? You can undo this right after. | TR de |

### Orta (Faz 5)

| Anahtar | Mevcut EN | Önerilen EN | Not |
|---|---|---|---|
| `accApproval.views.beklenen` | Unpaid | Payment pending | |
| `logistics.payment.vadeli` | Pay later ({{pesinYuzde}}% down) | Deferred payment ({{pesinYuzde}}% down payment) | |
| `payment.types.vadeli` | Pay later | Deferred payment | Terim birliği |
| `orders.form.odemePesin`, `clauses.odemePesin` | Upfront | Advance payment | `clauses` için K2 |
| `status.logistics.awaitingAccounting` | Waiting for accounting | Waiting for accounting approval | |
| `docFlow.approval.logisticsOfferApproved` | Logistics offer approved | Shipping quote approved | TR de: "Nakliye teklifi onaylandı" |
| `inbox.hints.shipment` | Choose a carrier and Incoterm, then request shipment. | Choose a carrier and delivery terms (Incoterm), then request shipment. | |
| `factory.fabrikaNotPlaceholder` | Write a note for the factory… | Write the factory note… | |
| `purchase.approvalFlowNote` | …saved as Waiting… | …saved as Pending… | |
| `accounting.tahsilat.fillRemaining` | Fill in remaining balance ({{amount}}) | Fill in balance due ({{amount}}) | |
| `completeOrder.remaining` | Remaining balance | Balance due | |
| `completeOrder.remainingNote` | There is a remaining balance. … | There is a balance due. … | |
| `logistics.transportTypes` | Transport types | Transport modes | |
| `search.fields.temsilci` | Sales Representative | Sales Rep | |
| `qc.impact.reject` | …the sales representative to fix; they see your reason. | …the Sales Rep to fix; the Sales Rep sees your reason. | TR de: "satış temsilcisi" |
| `common.noData`, `accountingHistory.empty` | Nothing here yet. | No records. | Filtre boş dönünce de çıkıyor |
| `dashboard.moduleCard.warehouseStock` | Bonded and local warehouse stock and exits | Goods in bonded and own warehouses, and stock exits | |
| `orders.confirm.currencyDesc` | …from {{from}} to {{to}} at today's rate. | …from {{from}} to {{to}} at the current rate. | TR de, para adı çevrilmeli (Faz 3) |
| `apiErrors.quoteNotApproved` | The quote isn't approved, so there's nothing to undo. | The shipping quote isn't approved, so there's no approval to undo. | TR de |
| `apiErrors.rejectNotAllowed` | …or it isn't a quote or order. | …or it isn't at the Quote or Order stage. | TR de |
| `completeOrder.finalMaliyetHint` | Written to the cost recipe. | Written to the cost sheet. | TR de: "Maliyet tablosuna yazılır." |

### Düşük (Faz 5)

| Anahtar | Önerilen EN |
|---|---|
| `workflow.currentStep` | Current step (TR de: "Şu anki adım") |
| `statement.movementsIn` | {{currency}} transactions |
| `orderDetail.copyAsNew` | Copy as new |
| `palette.doc.KP` | Copy order {{no}} as new |
| `inbox.hints.planning` | Set a production date and factory note, then start production. |
| `logistics.ship` | Start Shipment |
| `accApproval.completeDirect` | Complete Order (skip intermediate steps) |
| `purchase.asamaLabel.fabrikaOnIzleme` | Factory pre-review |
| `logistics.history.completeNote` | Delivery remarks (optional) |
| `purchase.lines.fiyatModu` | Price entry |
| `purchase.lines.sil`, `orders.draft.discard` | Delete |
| `orders.confirm.categoryDesc_one` / `_other` | …will be deleted. |
| `accountingHistory.dialog.tahsilat` | Paid % |
| `accountingFull.actions.talepGonder` | Send Request |
| `purchase.paraBirimiHint` | All items are calculated in this currency. |
| `factory.description` | Start production for orders in Planning and mark finished ones Ready. Select several rows to do them all at once. |
| `accountingFull.ekstra.aciklamaPlaceholder` | e.g. extra shipping, customs, installation price difference… |
| `users.impact.delete` | The user can no longer sign in and is removed from the list. |
| `search.startHint` | Type at least 2 characters to search. (TR de: "en az 2 karakter") |
| `common.select`, `orders.form.birimSecin` | Select / Select unit |
| `myOrders.actions.redNotu`, `myOrders.redNote.title` | Reason for Rejection / Reason for rejection |
| `myOrders.disabled.redNote` | This order wasn't rejected, so there's no rejection reason. |
| `common.undoHint` | You can reverse this with "Undo" right afterward. |
| `orders.reviseBanner` | You're revising this record |
| `orders.confirm.customerDesc` | Contact details in the customer section will be replaced with the details of "{{name}}". |
| `dashboard.kpi.pendingPaymentHint` | Payments still being collected |
| `addStock.gonderici` / `gondericiPh` | Consignor / Consignor company name |
| `addStock.alici` / `aliciPh` | Consignee / Consignee company name |
| `addStock.rejimKodu` | Customs procedure code |
| `addStock.ticariTanim` | Commercial description / details |
| `addStock.subReview` | Check the details, then save to the bonded warehouse or your own warehouse. |
| `addStock.warningsTitle` | Document reading warnings |
| `stockUndo.deleteImpact` | The item is removed from the stock list and the totals. |
| `apiErrors.requestWrongStatus` | Request #{{id}} can't be handled at this stage (current status: {{status}}). |
| `apiErrors.onlyQuotesConvert` | Only quotes can be turned into orders. Current stage: {{stage}}. |
| `apiErrors.cancelReasonTooLong` | The reason for cancelling can be at most 500 characters. |

**Yalnız TR kaynakta düzeltilecekler:** `statement.description_page` ("döviz başına yürüyen bakiyeyle"), `inbox.panel.more_*` ("iş sırası"), `completeOrder.finalMaliyet` ("Son maliyet").

**K3 ile birlikte değerlendirilecek:** `addStock.birimPh` ve `addStock.kapCinsiPh`. Alan serbest metin olduğu için İngilizce örnekler (`PCS`, `PKG`) beyannameden gelen `ADET`, `KAP` değerleriyle karışık kayıt üretebilir.

## Ek C: Sayı girişi kabul senaryoları

| Dil | Yazılan | Beklenen değer |
|---|---|---|
| TR | `1.234,56` | 1234,56 |
| TR | `1,5` | 1,5 |
| TR | `1.500` | 1500 |
| EN | `1,234.56` | 1234,56 |
| EN | `1.5` | 1,5 |
| EN | `1,500` | 1500 |
| EN | `1.500` | 1,5 |
| İkisi | `0.125` | 0,125 |
| İkisi | boş veya geçersiz | boş değer, `NaN` yok |

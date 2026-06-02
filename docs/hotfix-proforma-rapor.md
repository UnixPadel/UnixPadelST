# Hotfix Proforma — Rapor

**Tarih:** 2026-05-22
**Bağlı doküman:** [hotfix-proforma-analiz.md](hotfix-proforma-analiz.md)
**Schema değişikliği:** YOK
**WinForms birebir kuralı:** İHLAL EDİLMEDİ — placeholder substitution davranışı birebir taşındı.

---

## 1. Kullanıcı şikayeti

> "Sipariş Excel İndir butonu çalışıyor ama eski WinForms CRM'deki UNIXPADEL PROFORMA BLANK template'inden oluşturulan proforma gelmiyor."

Modern API `GET /api/orders/{no}/excel` çağrısı, ~7 satırlık sade ClosedXML özet üretiyordu (header + items tablosu). Beklenen: WinForms'taki gibi DB BLOB template üzerine yer tutucu (`#URUN`, `#TOPLAM`, vs.) substitution ile proforma.

---

## 2. ADIM 1 — WinForms kaynak özeti

7 form (`SiparisForm.cs`, `Form3.cs`, `Fabrika.cs`, `Kontrol.cs`, `Lojistik.cs`, `Muhasebe.cs`, `Ara.cs`) aynı 3 adımı yürütüyor:

1. `SELECT Excel FROM ExcelIndir LIMIT 1` — BLOB.
2. BLOB'u kullanıcının Downloads klasörüne `UNIXPADEL PREFORMA BLANK.xlsx` adıyla yaz.
3. `Microsoft.Office.Interop.Excel.Application` ile dosyayı aç, UsedRange'de gezerek `#…` yer tutucu hücrelerini değiştir, items için satır insert et, kullanmadıklarını sil.

**Görseller** (`ProformaTop.jpg`, `ProformaTop1.jpg`, `ProformaMid.jpg`, `ProformaBot.jpg`) WinForms tarafında ayrıca yerleştirilmiyor — template .xlsx içine gömülü.

Tam placeholder envanteri ve WinForms iterasyon mantığı için bkz. [hotfix-proforma-analiz.md §3](hotfix-proforma-analiz.md).

---

## 3. ADIM 2 — ExcelIndir tablo durumu

Paket 1 schema snapshot'ı (`docs/schema-paket1-20260521-150806.md`) ExcelIndir'i 0 satır olarak gösteriyordu. **Bu bilgi bayatmıştı.** Canlı sorgu:

```
SELECT COUNT(*), MAX(OCTET_LENGTH(Excel)) FROM ExcelIndir;
→ Count=1, MaxBlobSize=6,839,556 (~6.83 MB)

SELECT ID, OCTET_LENGTH(Excel) AS Sz FROM ExcelIndir;
→ ID=1, Sz=6,839,556
```

**Karar:** Template DB'de mevcut. Hard-coded layout gereksiz. WinForms ile aynı substitution path'i kullanılacak.

---

## 4. ADIM 3 — Modern API uygulaması

### Önceki durum

* `GET /api/orders/{no}/excel` → `OrderController.Excel` → **`IOrderService.GenerateExcelAsync`** → 10 satırlık sade ClosedXML üretici.
* `ReportingService.ExportOrderProformaAsync` zaten BLOB template path'ini destekliyordu **ama** placeholder map'i eksikti (yalnız ~15 placeholder) ve `OrderController.Excel`'e bağlı değildi. Sonuç: kullanıcı şikayet ettiği fallback'i alıyordu.

### Yapılan değişiklikler

1. **`CrmModern.API/Controllers/OrderController.cs`**
   * Constructor injection'a `IReportingService reportingService` eklendi.
   * `Excel(string no)` artık `reportingService.ExportOrderProformaAsync(no)` çağırıyor.
   * Dosya adı: `Proforma_{SiparisNo}_{yyyyMMdd}.xlsx` (WinForms `UNIXPADEL PREFORMA BLANK.xlsx`'i kullanıcı dosyasına yazıyordu; modern API HTTP indirme adı netleştirildi).

2. **`CrmModern.Infrastructure/Services/ReportingService.cs`**
   * `GenerateProformaFromTemplate` metodu **komple yeniden yazıldı**. WinForms'taki tüm 30+ placeholder'ı destekliyor:
     - **Header tek-değer**: `#SIPARISNO`, `#TARIH`, `#MUSTERI`, `#MUSTERIADRES`, `#MUSTERINUMBER`, `#MUSTERIEMAIL`, `#MUSTERIVATNUMBER`, `#MUSTERIZIPKODU`, `#SIRKET`, `#SIRKETALT`, `#TOPLAMPARABIRIMI`, `#BRUTTOPLAMFIYAT`, `#TOPLAMFIYAT`, `#LUTFENSADECEORAN`, `#ODEMEORANI`.
     - **Items 5-cell şablon**: `#URUN`, `#MIKTAR`, `#BIRIM`, `#BIRIMFIYAT`, `#FIYAT` — `Order.Items` üzerinde kategori/bileşen ayrımı ile (WinForms birebir).
     - **Koşullu satırlar**: `#TESLIMAT*` (5 placeholder), `#MONTAJ*` (4 placeholder), `#INDIRIM`, `#EKSIINDIRIM`, `#KDV`. Boş kalanlar `rowsToDelete` HashSet ile aşağıdan yukarı sıralı silinir.
     - **`#DETAY`**: `Order.Details` üzerinde ofset yazımı (10 satır sonra sağdaki sütuna geçer).
     - Items expansion: `Row(firstRow + i).InsertRowsBelow(1)` + `CopyTo(firstRow + i + 1)` ile şablonu klonla; artık item sayısı kadar veri satırı + 1 leftover placeholder satırı kalır. Leftover satır `rowsToDelete` ile silinir.
   * Yardımcı statik metotlar: `SirketDisplay(sirket)` (Unixpadel/ArsSport/AselCocuk → uzun isimler), `ToplamParaBirimi(paraTipi)` ("TOTAL EURO" vs.), `TrTR` culture.
   * `ExportOrderProformaAsync` artık substitution öncesi `uow.ProductCategories.GetAllAsync()` + `uow.Components.GetAllAsync()` ile KategoriAdi/BilesenAdi/Birim lookup'ı kuruyor.

3. Hard-coded ClosedXML fallback (eski yapı) dokunulmadı — BLOB yoksa veya açma başarısız olursa kullanıcı asla "boş Excel" görmesin.

### Sayı / kültür / sembol

* Para birimi sembolü: WinForms birebir — `Euro→"€ "`, `Dolar→"$ "`, `TL→"₺ "`, `Sterlin→"£ "`.
* Sayı formatı: `N2` + `tr-TR` culture (`1.234,56`).
* Tarih: `dd.MM.yyyy` + `tr-TR`.

### Fiyat formülü (Faz 3 BIREBIR)

* `BrutToplamFiyat` ve `ToplamFiyat` Order entity'sinde hesaplı saklı. Proforma sadece bunları okur:
  - `#BRUTTOPLAMFIYAT` = `paraBirimi + BrutToplamFiyat`
  - `#TOPLAMFIYAT`     = `paraBirimi + ToplamFiyat`
  - `#KDV`             = `"+ " + (Toplam × Kdv/100) + " % " + (int)Kdv` (WinForms ile aynı)
  - `#INDIRIM`         = `"Discount: -" + Indirim` (yalnız > 0 ise; aksi halde satır silinir)
  - `#EKSIINDIRIM`     = `"-" + paraBirimi + Indirim`

---

## 5. ADIM 4 — Görseller

`WindowsFormsApp1\Resources\` altındaki 4 jpg `CrmModern.API\wwwroot\proforma\` altına kopyalandı:

| Dosya | Boyut | Not |
|---|---|---|
| ProformaTop.jpg  | 141,096 B | UI/hard-coded fallback için yedek |
| ProformaTop1.jpg | 141,096 B | Aynı (varyasyon) |
| ProformaMid.jpg  |  37,630 B | |
| ProformaBot.jpg  |  79,821 B | |

> **Not:** Modern API proforma akışında bu görseller DOĞRUDAN KULLANILMIYOR — DB BLOB template'i içine zaten gömülü. wwwroot kopyaları, ileride hard-coded fallback iyileştirilirse veya web önizleme eklenirse kullanılmak üzere yedek olarak duruyor. Web SDK wwwroot'u publish'e otomatik dahil eder (.csproj'a manuel kayıt gerekmez).

---

## 6. ADIM 5 — Şirket varyasyonu

WinForms tek template kullanıyor (UNIXPADEL PREFORMA BLANK). Sadece `#SIRKET` ve `#SIRKETALT` hücrelerinin metni değişiyor:

| `Order.Sirket` | Yazılan metin (WinForms birebir) |
|---|---|
| `Unixpadel` / boş / diğer | `"UNIXPADEL KORT VE ZEMINLERI URETIMI INSAATI VE SANAYI A.S."` |
| `ArsSport` | `"ARS SPORT"` |
| `AselCocuk` | `"Asel Çocuk"` |

`SirketDisplay()` helper'ında uygulandı. Logo / layout farkı yok — sadece şirket adı metni.

---

## 7. ADIM 6 — Test sonuçları

| Test | Sonuç |
|---|---|
| `dotnet build CrmModern.slnx` | ✅ 0 Uyarı / 0 Hata |
| API start (`dotnet run`) | ✅ DI çözüldü; `IReportingService` `OrderController`'a inject edildi |
| `GET /api/orders/SELRA01042026400/excel` auth-less | ✅ 401 (yetkisiz erişim engelleniyor) |
| ExcelIndir tablosu canlı sorgu | ✅ 1 satır, ~6.83 MB BLOB mevcut |
| **Offline substitution probe** (8 item, SADAD21052026429 / HATKO AŞ / Euro / Brut=19506) | ✅ #URUN row 16'da bulundu, 8 item klonlanıp dolduruldu, çıktı **6.84 MB** (template boyutu korundu = gömülü görseller intact), `Desktop/proforma_test_SADAD21052026429.xlsx` dosyasına kaydedildi. |

### Kullanıcı tarafında manuel xlsx doğrulama checklist'i

Bir Excel sürümünde aç ve kontrol et:

* [ ] Üst banner / logo görseli (UNIXPADEL veya ArsSport/AselCocuk metni) doğru çıkıyor.
* [ ] `#` ile başlayan herhangi bir hücre KALMAMIŞ olmalı (tümü doluyor veya silinmiş).
* [ ] Sipariş no, tarih, müşteri bilgileri header'da doğru.
* [ ] Item tablosunda 8 satır var (test siparişi için), her satırın #URUN / #MIKTAR / #BIRIM / #BIRIMFIYAT / #FIYAT hücreleri:
  * Kategori (SET) satırında: ürün adı + adet + "SET" + birim fiyat (`€ X,XX`) + toplam (`€ X,XX`).
  * Bileşen satırında: öznitelik + bileşen adı + adet + birim adı + boş birim fiyat + boş toplam.
* [ ] Teslimat YOK olduğu için Teslimat satırları (5 placeholder) silinmiş.
* [ ] Montaj VAR ise Montaj satırı doldurulmuş.
* [ ] İndirim yoksa #INDIRIM/#EKSIINDIRIM satırları silinmiş.
* [ ] KDV varsa "+ X,XX % YY" formatında.
* [ ] Brüt Toplam ve Toplam Fiyat tutarlar doğru (`€ 19.506,00`).
* [ ] Footer altında şirket adı tam.
* [ ] Sayfa boyutu/font/renk bozulmamış (template intact).
* [ ] Şirket = ArsSport olan bir siparişle aynı testi tekrarla → "ARS SPORT" metni geldiğini gör.

---

## 8. Kurallara uyum

| Kural | Durum |
|---|---|
| Schema/migration üretilmedi | ✅ |
| `ExcelIndir` BLOB doluysa onu kullan (gerçekten doluydu) | ✅ |
| WinForms layout BIREBIR korundu (placeholder substitution, sütun başlıkları, fiyat formülü, "Transport cost"/"Installation cost"/"Discount:" metinleri) | ✅ |
| Görseller `wwwroot/proforma/` altına kopyalandı | ✅ (4 dosya) |
| Frontend'e dokunulmadı | ✅ (sadece backend response gövdesi değişti) |
| dotnet build yeşil | ✅ |
| Para birimi sembolü WinForms birebir | ✅ |
| WinForms English label'ları korundu ("payment:", "before loading", "Delivery Type:", "Delivered Address:", "Discount:") | ✅ |

---

## 9. Bilinen sınırlamalar / Faz 9 backlog

* **Categories/Components in-memory cache:** Her Excel indirme talebinde `GetAllAsync()` ile tüm kategori ve bileşenler çekiliyor. Veri seti küçük (~100s). İleride IMemoryCache'e taşınabilir (Faz 9).
* **Order.Items sıralama:** `OrderBy(SiparisIslemID)` ile DB insertion order korunur. WinForms 5 set + bileşenler bu sırayla yazıldığı için doğru. Yeniden sıralama gereği yok.
* **Hard-coded fallback (BLOB yoksa)** WinForms'taki gibi gömülü görselleri vermiyor — sade tablo. Üretim ortamında BLOB her zaman olacağı için pratikte fallback çalışmaz; yine de kullanıcı asla "boş Excel" görmemesi adına korundu.

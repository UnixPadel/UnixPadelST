# Hotfix Proforma — WinForms Kaynak Analizi

**Tarih:** 2026-05-22
**Kaynak:** `C:\Users\Lenovo_It_1\Desktop\CRM\WindowsFormsApp1\`
**Tetikleyen:** "Excel İndir çalışıyor ama UNIXPADEL PROFORMA BLANK template'inden üretilen proforma gelmiyor."

---

## 1. Bulgu özeti

WinForms tarafında "Proforma yazdır / Excel önizle" aksiyonu **7 farklı formda aynı pattern**'i kullanıyor:

| Form / Method | Satır | Tetikleyici |
|---|---|---|
| `SiparisForm.cs` `previewButton_Click` | 3408 | Yeni/Düzenle sipariş ekranı |
| `Form3.cs` excelYaz_Click | 2810 | Sipariş detay (mevcut sipariş yazdır) |
| `Fabrika.cs` | 1004 | Fabrika ekranı sipariş yazdır |
| `Kontrol.cs` | 2714 | Kontrol ekranı |
| `Lojistik.cs` | 1007 | Lojistik ekranı |
| `Muhasebe.cs` | 1592 | Muhasebe ekranı |
| `Ara.cs` | 925 | Arama ekranı |

Hepsi aynı 3 adımı yürütüyor:

1. `SELECT Excel FROM ExcelIndir LIMIT 1` — BLOB tek satırlık template.
2. `byte[]`'i kullanıcının `%USERPROFILE%\Downloads\UNIXPADEL PREFORMA BLANK.xlsx` dosyasına yaz.
3. `Microsoft.Office.Interop.Excel.Application` ile dosyayı aç (Visible=true, DisplayAlerts=false), `UsedRange` üzerinde gezerek `#…` placeholder hücrelerini değiştir, yeni satır insert et, sonra Excel'i kullanıcıya bırak.

> Yani şablon **DB'de BLOB olarak yaşıyor**, görseller (`ProformaTop.jpg`, `ProformaMid.jpg`, `ProformaBot.jpg`, `ProformaTop1.jpg`) bu .xlsx şablonunun içine zaten gömülmüş.
> WinForms kodu **görselleri ayrıca yerleştirmiyor** — sadece placeholder substitution yapıyor.
> `Resources/Proforma*.jpg` dosyaları WinForms'un kendi UI panellerinde de gösteriliyor (resource olarak).

## 2. ExcelIndir tablo gerçek durumu (taze sorgu)

```
Count       = 1
MaxBlobSize = 6,839,556 bytes   (~6.83 MB)
Row ID=1, size=6839556
```

Snapshot bayatmış. **BLOB DB'de mevcut.** Karar: WinForms ile aynı pattern — BLOB indir, ClosedXML ile aç, placeholder substitution yap.

## 3. Placeholder envanteri (BIREBIR WinForms)

### 3.1 Header / metadata (tek-değer placeholder)

| Placeholder | WinForms kaynak | Modern karşılığı |
|---|---|---|
| `#SIRKET` | `sirketComboBox.Text` → "UNIXPADEL KORT VE ZEMINLERI URETIMI INSAATI VE SANAYI A.S." / "ARS SPORT" / "Asel Çocuk" | `Order.Sirket` |
| `#SIRKETALT` | aynı `#SIRKET` kuralı (footer) | `Order.Sirket` |
| `#SIPARISNO` | `siparisNumrasi.Text` / `teklifNumrasi.Text` / `SiparisAdi` (mod'a göre) | `Order.SiparisNo` veya `TeklifNo` |
| `#TARIH` | `DateTime.Now` (yeni sipariş) / `reader["Tarih"]` (mevcut) | `Order.Tarih.ToString("dd.MM.yyyy")` |
| `#MUSTERI` | `comboBoxMusteriAd.Text` / `reader["MusteriAd"]` | `Order.MusteriAd` |
| `#MUSTERIADRES` | `musteriAdresTextBox.Text` / `reader["MAdres"]` | `Order.MAdres` |
| `#MUSTERINUMBER` | `musteriTelefonTextBox.Text` / `reader["MTelefon"]` | `Order.MTelefon` |
| `#MUSTERIEMAIL` | `musteriMailTextBox.Text` / `reader["MMail"]` | `Order.MMail` |
| `#MUSTERIVATNUMBER` | `musteriVATTextBox.Text` / `reader["MVATNumarasi"]` | `Order.MVATNumarasi` |
| `#MUSTERIZIPKODU` | `musteriZipKodTextBox.Text` / `reader["MZipKod"]` | `Order.MZipKod` |

> WinForms'taki yorum satırı `#KULLANICI…` placeholder'ları AKTİF DEĞİL (bilerek devre dışı).

### 3.2 Items table (döngülü placeholder — 5'li satır şablonu)

WinForms 5 set + bileşen formatında iterasyon yapıyor. Her item için aynı şablon satırı dolduruluyor; bittiğinde alt satıra yeni boş şablon kopyalanıyor:

```
#URUN   |  #MIKTAR  |  #BIRIM  |  #BIRIMFIYAT  |  #FIYAT
```

Her satırın dolma kuralları:

| Tip | #URUN | #MIKTAR | #BIRIM | #BIRIMFIYAT | #FIYAT |
|---|---|---|---|---|---|
| Set (kategori) | `anaUrunComboBox.Text` veya `KategoriAdi` | adet | `"SET"` | `ParaBirimi + (setFiyat / adet).ToString("N2")` | `ParaBirimi + setFiyat.ToString("N2")` |
| Bileşen | `Oznitelik + " " + BilesenAdi` (yoksa sadece BilesenAdi) | `Adet` | `Birim` (BilesenBilgileri) | `""` (boş — yalnızca set fiyatı görünür) | `""` |

Bittiğinde, üzerinde hâlâ `#URUN` kalan satır WinForms tarafından `rowsToDelete.Add(cell.EntireRow)` ile siliniyor.

### 3.3 Teslimat / Montaj placeholder'ları (sabit pozisyon)

Sayfada **tek satır** halinde duruyor. Kontrol kutusu açıkken doldurulur, kapalıyken `rowsToDelete.Add(cell.EntireRow)` ile satır silinir:

| Placeholder | Var dolumu |
|---|---|
| `#TESLIMAT` | "Transport cost" |
| `#TESLIMATMIKTAR` | `MTeslimat` (adet) |
| `#TESLIMATBIRIMFIYAT` | `ParaBirimi + (TeslimatFiyat / MTeslimat).ToString("N2")` |
| `#TESLIMATFIYAT` | `ParaBirimi + TeslimatFiyat.ToString("N2")` |
| `#TESLIMATADRES` | `"Delivered Address: " + TAdres` |
| `#TESLIMATZIPKOD` | `TZipKod` |
| `#TESLIMATCESITI` | `"Delivery Type: " + TeslimatÇeşiti` |
| `#MONTAJ` | "Installation cost" |
| `#MONTAJMIKTAR` | `MAdet` |
| `#MONTAJBIRIMFIYAT` | `ParaBirimi + (MontajFiyat / MAdet).ToString("N2")` |
| `#MONTAJFIYAT` | `ParaBirimi + MontajFiyat.ToString("N2")` |

### 3.4 Ödeme + toplam placeholder'ları

| Placeholder | Dolum |
|---|---|
| `#ODEMEORANI` | `"payment: %X cash, %(100-X) before loading"` (PesinYüzde) |
| `#LUTFENSADECEORAN` | `"PLEASE PAY ONLY: %X"` |
| `#INDIRIM` | `"Discount: -" + Indirim.ToString("N2")` (sadece >0 ise; aksi halde satır sil) |
| `#EKSIINDIRIM` | `"-" + ParaBirimi + Indirim.ToString("N2")` (BrutToplam − Toplam üzerinden de hesaplanabilir) |
| `#KDV` | `"+ " + (toplam × kdv/100).ToString("N2") + " % " + (int)kdv` |
| `#TOPLAMPARABIRIMI` | "TOTAL EURO" / "TOTAL DOLAR" / "TOTAL TL" / "TOTAL " + paraTipi |
| `#BRUTTOPLAMFIYAT` | `ParaBirimi + BrutToplamFiyat.ToString("N2")` |
| `#TOPLAMFIYAT` | `ParaBirimi + ToplamFiyat.ToString("N2")` |
| `#DETAY` | DetayTablo'dan onaylı detay satırlarını ofset (max 10 satır/sütun, sonra sağdaki sütuna kayar) |

### 3.5 Para birimi sembolü (`ParaBirimi`)

```csharp
radioButton1 → "€ "
radioButton2 → "$ "
radioButton3 → "₺ "
paraBirimiCombo == "Sterlin" → "£ "
```

Yani sembol + space + sayı (N2 format, tr-TR culture).

## 4. Sayfa layout / görseller

- Sayfa boyutu, font, renk, kenarlık — **tamamı template'in içinde** (BLOB). Modern API bunlara dokunmaz; sadece hücre değer/insert/delete yapar.
- `Resources/Proforma*.jpg` dosyaları WinForms UI panellerinde gösterim için; template .xlsx içindeki gömülü görseller bunlardan oluşturulmuş olabilir (tarihler 2025-01 aynı). Yine de kullanıcı isteğiyle `CrmModern.API/wwwroot/proforma/` altına kopyalanacak — ileride hard-coded fallback ya da web preview için.

## 5. Fiyat formülü (Faz 3 BIREBIR)

```
brutToplam = SUM(item.KategoriFiyat) + MontajFiyat + TeslimatFiyat
netToplam  = (brutToplam − Indirim) × (1 + Kdv/100)
```

Modern Order entity zaten `BrutToplamFiyat` ve `ToplamFiyat`'ı hesaplı saklıyor — proforma sadece okuyup yazar.

## 6. Modern API uygulama kararı

* `OrderController.Excel` (GET `/api/orders/{no}/excel`) şu an **`OrderService.GenerateExcelAsync`**'ı çağırıyor → sade ClosedXML fallback (header + items, ~7 satır). Bu endpoint yeniden yönlendirilecek: **`ReportingService.ExportOrderProformaAsync`** zaten BLOB template path'ini destekliyor; sadece placeholder map'i eksik.
* Mevcut `GenerateProformaFromTemplate`'deki map'i **§3'teki tam listeye** genişlet.
* Categories + Components'i adı/birimiyle yüklemek için `IProductCategoryRepository.GetAllWithComponentsAsync()` ve `IComponentRepository.GetAllWithAttributesAsync()` kullanılacak (yüzlerce satır, in-memory lookup yeterli).
* Dosya adı: `Proforma_{SiparisNo}_{yyyyMMdd}.xlsx`.
* Para birimi sembolü mevcut `CurrencySymbol(order.ParaTipi)` ile aynı.
* Sayı formatlama: **tr-TR culture** (`"N2"` ile `1.234,56`).

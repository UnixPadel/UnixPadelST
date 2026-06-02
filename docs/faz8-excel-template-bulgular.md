# Faz 8 — ExcelIndir BLOB Template Bulguları

## Durum

- DB'de `ExcelIndir` tablosu **0 satır** içeriyor (Faz 0 snapshot doğrulandı).
- WinForms'ta yaygın olarak `SELECT Excel FROM ExcelIndir LIMIT 1` ile çekiliyor
  (Fabrika.cs / Kontrol.cs / Muhasebe.cs / Ara.cs).
- Test ortamında şablonun gerçek formatı doğrulanamadı; production DB'de şablonun
  yüklü olduğu varsayılıyor.

## Modern UI implementasyonu

`ReportingService.GenerateProformaFromTemplate(byte[] templateBytes, Order order)`:

1. Template byte'ları ClosedXML `XLWorkbook` ile açılır.
2. `#URUN` placeholder'lı bir hücre varsa "items area" başlangıcı kabul edilir;
   her `OrderItem` için orijinal satırın bir kopyası eklenir, sonra her satırda
   `#URUN, #MIKTAR, #BIRIM, #BIRIMFIYAT, #FIYAT` placeholder'ları replace edilir.
3. Sonrasında tüm hücreler taranır, `#`-prefixli string'ler header map'inden
   değiştirilir (#SIPARISNO, #MUSTERI, #TOPLAM, #INDIRIM, vb. — toplam 19 alan).
4. Sonuç byte[] olarak döner.

## Fallback

`ExportOrderProformaAsync` template yoksa veya template uygulanırken exception
fırlarsa, Faz 3'teki tam ClosedXML fallback path'ini koruyarak çalıştırır. Bu
sayede:
- DB'de şablon olmasa bile Excel export çalışıyor.
- Şablon format uyumsuzluğunda kullanıcı asla "boş Excel" görmez.
- Test ortamında şablon yokken bile uçtan uca akış doğrulanabiliyor.

## ExportAccountingOrdersAsync

Tablo-listesi olduğu için placeholder-bazlı şablon mantığı uygun değil. Mevcut
ClosedXML üretimi korundu — WinForms `Muhasebe.cs`'in liste exporter'ı da hücre
bazlı placeholder kullanmıyor, tablo yazıyor.

## Açık konular

- Production'da şablon yüklendiğinde ilk export sonrası format görsel kontrol
  edilmeli; başlık logosu, font, hücre birleştirme gibi özellikler **template'ten**
  korunur.
- Placeholder seti spec'e göre tamam; ek placeholder gerekirse
  `GenerateProformaFromTemplate` içindeki `map`/`rowMap` sözlüklerine eklenir.
- Yeni endpoint yok — `GET /api/reporting/orders/{siparisNo}/proforma` her
  durumda Excel döner.

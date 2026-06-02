# Paket 1 — Entity ↔ DB Kolon Düzeltme Listesi

> Kaynak: `docs/schema-paket1-20260521-150806.md` (taze döküm, 46 tablo, INFORMATION_SCHEMA'dan).
> Yöntem: DB tarafına dokunulmadı; sadece `EntityTypeConfiguration` map'leri DB kolonlarına hizalandı.

## Kritik düzeltmeler (500 sebebi)

| Entity | Property | Eski mapping | Yeni mapping | Sebep |
|---|---|---|---|---|
| `OrderItem` (`SiparisIslemTablo`) | `SiparisIslemID` | `HasColumnName("SiparisIslemID")` | `HasColumnName("SiparisID")` | DB'de PK kolonu **`SiparisID`** (auto_increment). Eski snapshot yanlış `SiparisIslemID` yazıyordu; Pomelo `Unknown column 's.SiparisIslemID'` fırlattığı için OrderRepository.GetByNoAsync ve tüm `SiparisIslemTablo` Include'ları patlıyordu. → `/api/orders/{no}`, `clone`, `approve`, `reject`, Excel, Logistics complete/cancel, Dashboard'un dolaylı Order detail'ları, hepsi bu yüzden 500 alıyordu. |
| `Order` (`SiparisAlTablo`) | `OdenenMiktar` | `builder.Ignore(o => o.OdenenMiktar)` | `HasColumnName("OdenenMiktar").HasColumnType("decimal(10,2)")` | DB'de `OdenenMiktar decimal(10,2) DEFAULT 0.00` mevcut; AccountingService bu kolonu hem okuyor hem `order.OdenenMiktar = toplamOdenen` ile güncelliyordu — `Ignore` yüzünden hep `null` dönüyor, accounting + dashboard tutarsızlığı oluşuyordu. |

## Servis-seviyesi düzeltmeler (entity dışı, dashboard bug'ları)

| Yer | Eski davranış | Yeni davranış | Sebep |
|---|---|---|---|
| `ReportingService.GetDashboardKpisAsync` | 8 task `Task.WhenAll` ile **aynı DbContext** üzerinde paralel çalıştırılıyordu | Sıralı `await` (sub-second sorgular zaten hızlı) | Pomelo: *"A second operation was started on this context instance"* — DbContext thread-safe değil. |
| `OrderRepository.GetTopCustomersAsync` | `.OrderByDescending(x => x.ToplamCiro)` Select projection sonrası SQL'e çevriliyordu | GroupBy+Sum server-side, sıralama ve `Take(limit)` client-side | Pomelo: *"The LINQ expression ... could not be translated"* — dto property üzerinden ORDER BY translate edilemiyor. |

## Uzunluk / precision hizalamaları (defansif — INSERT/UPDATE truncation engelleme)

| Entity | Property | Eski | Yeni | DB |
|---|---|---|---|---|
| `OrderItem.SiparisNo` | `IsRequired().HasMaxLength(100)` | `HasMaxLength(50)` (nullable) | `varchar(50)` NULL |
| `OrderItem.TeklifNo` | `HasMaxLength(100)` | `HasMaxLength(50)` | `varchar(50)` |
| `OrderItem.OznitelikAdi` | `HasMaxLength(500)` | `HasMaxLength(40)` | `varchar(40)` |
| `OrderItem.Fiyat` | `decimal(18,2)` | `decimal(10,2)` | `decimal(10,2)` |
| `Order.OdemeDurum` | `HasMaxLength(50)` | `HasMaxLength(20)` | `varchar(20)` |
| `LogisticsEntry.SiparisNo` | `IsRequired().HasMaxLength(100)` | `HasMaxLength(50)` | `varchar(50)` |
| `LogisticsEntry.FirmaAdi` | `IsRequired().HasMaxLength(300)` | `HasMaxLength(30)` | `varchar(30)` |
| `LogisticsEntry.LojistikCesit` | `IsRequired().HasMaxLength(200)` | `HasMaxLength(10)` | `varchar(10)` |
| `LogisticsEntry.Fiyat` | `decimal(18,2)` | `decimal(10,2)` | `decimal(10,2)` |
| `LogisticsEntry.LNot` | `HasMaxLength(2000)` | `HasColumnType("text")` | `text` |

## Doğru olan ama denetlenen mapping'ler (değişmedi)

| Entity | Tablo | Doğrulama |
|---|---|---|
| `Order` | `SiparisAlTablo` | `MusteriId` (lowercase d) ✓, `KullaniciID` ✓, `PesinYüzde` (ü) ✓, `TeslimatÇeşiti` (ç ş) ✓, `Tarih` (date) ✓, `Sirket` (enum→string) ✓ |
| `OrderShipment` | `SiparisTeslimatTablo` | PK `SiparisID` ✓, `TeslimatÇeşiti` ✓ |
| `OrderDetail` | `DetayTablo` | `Text → "Detay"` ✓ |
| `OrderApproval` | `SiparisOnaylari` | ✓ — uyumlu; sınır: `uk_siparis_kullanici` unique idx aynı (SiparisNo, KullaniciID) için INSERT iki kez yapılırsa duplicate. Servis tarafı UPSERT'e geçirilmedi (Paket 1 kapsamı dışı). |
| `LogisticsEntry` | `LojistikTablo` | `KullaniciAdi` aslında int (legacy adlandırma) ✓ |
| `CompletedOrder` | `TamamlandiTablo` | `KullaniciAdi` aslında int ✓ |
| `MuhasebeIslemTablo` | `AccountingTransaction` | 6 kolon ✓ |
| `StokTablo` | `StockEntry` | ID/Urun/Adet ✓ |
| `UrunMaliyetTablo` | `ProductCost` | 9 kolon ✓ |
| `MusteriBilgileri` | `Musteri` | `MusteriID` ✓ |
| `TeslimatBilgisiTablo` | `DeliveryAddress` | `TeslimatBilgiID` ✓ |
| `SatinAlmaTalep` | `PurchaseRequest` | DB'de var ama entity'de olmayan kolonlar (SirketAdi/Birim/Miktar/Fiyat/FiyatTipi/ToplamTutar) zararsız — EF map'lemediği için sorguya katmaz |

## DB tarafında dokunulmadı

- Hiçbir kolon eklenmedi/silinmedi.
- Yeni migration üretilmedi.
- WinForms davranışı korundu.

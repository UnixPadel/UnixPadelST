# Faz 5 — Muhasebe Modülü Raporu

_Tarih: 2026-05-06_

## 1. Form ↔ Endpoint Eşlemesi

| WinForms Aksiyonu | Modern Endpoint | Yetki |
|---|---|---|
| `Muhasebe.cs` (sipariş listesi `Kontrol='Onay'`) | `GET /api/accounting/orders` | `Yonetici, Muhasebe` |
| `Muhasebe.cs` (sipariş detay paneli) | `GET /api/accounting/orders/{no}` | `Yonetici, Muhasebe` |
| Sipariş başına tahsilat geçmişi | `GET /api/accounting/orders/{no}/transactions` | `Yonetici, Muhasebe, Gozlemce` |
| **Yeni tahsilat** (modern, WinForms'ta dolaylıydı) | `POST /api/accounting/transactions` | `Yonetici, Muhasebe` |
| `MuhasebeGecmis.cs` liste | `GET /api/accounting/transactions` (geriye uyum) | `Yonetici, Muhasebe, Gozlemce` |
| `MuhasebeGecmis.cs` çoklu filtre + sayfa | `GET /api/accounting/transactions/history` | `Yonetici, Muhasebe, Gozlemce` |
| `BakiyeHesapla()` 4-döviz | `GET /api/accounting/customers/{id}/balance` | `Yonetici, Muhasebe` |
| `excelYazOzet_Click` | `GET /api/accounting/excel` | `Yonetici, Muhasebe` |
| `MuhasebeEkEkle_Click` (Faz 3 bloku) | `POST /api/accounting/orders/{no}/muhasebe-ek` | `Yonetici, Muhasebe` |
| MuhasebeEk indir (Faz 3'te zaten açıktı) | `GET /api/orders/{no}/attachments/muhasebeek` | authenticated |

Faz 3'teki Order `POST /api/orders/{no}/attachments?type=muhasebeek` artık **çalışıyor** (OrderService'teki `BusinessException` blok kaldırıldı, `Order.MuhasebeEk = bytes` yazıyor). Muhasebe rolü hem `/api/accounting/orders/{no}/muhasebe-ek` hem `/api/orders/{no}/attachments?type=muhasebeek` üzerinden yükleyebilir.

## 2. Tahsilat Akışı (WinForms birebir)

WinForms `Muhasebe.cs`'te doğrudan MuhasebeIslemTablo INSERT atan bir buton **yok** — bunun yerine `odmeButton` `SatinAlmaTalep` tablosuna yazıyor (Faz 6'da). Faz 5'te kullanıcı isteği gereği **tahsilat doğrudan API ile alındı**: `POST /api/accounting/transactions`. SQL:

```sql
INSERT INTO MuhasebeIslemTablo (SiparisNo, KullaniciID, MusteriID, OdenenMiktar, Tarih)
VALUES (@SiparisNo, @JWT, @Order.MusteriId, @Tutar, @Tarih)

UPDATE SiparisAlTablo
SET OdenenMiktar = (SELECT SUM(OdenenMiktar) FROM MuhasebeIslemTablo WHERE SiparisNo = @no),
    OdemeDurum   = CASE WHEN ToplamFiyat - SUM(...) <= 0 THEN 'Ödendi' ELSE 'Beklemede' END
WHERE SiparisNo = @no
```

**Tediye** (giden ödeme) WinForms Muhasebe.cs'te yok → bu fazda eklenmedi (Faz 6 satın alma).

## 3. OdemeDurum String'leri (BIREBIR)

WinForms enum: sadece `'Beklemede'` ve `'Ödendi'`. Spec'in önerdiği `'KısmiÖdeme'`/`'Tamamlandi'` **uygulanmadı** (WinForms birebir kuralı). Kalan ≤ 0 ise `'Ödendi'`, aksi `'Beklemede'`.

## 4. Müşteri 4-Döviz Bakiyesi

WinForms `MuhasebeGecmis.BakiyeHesapla()` portu. Modern API: müşterinin tüm siparişleri `Order.MusteriId == musteriId` ile çekilir, her döviz (Euro/Dolar/TL/Sterlin) için Toplam (sipariş ToplamFiyat) + Ödenen (tahsilat) + Kalan hesaplanır. Frontend `CustomerBalancePage` 4 kart gösterir.

## 5. Entity / Schema Değişikleri

- `MuhasebeIslemTablo` DB'de sadece 6 kolon: `ID, KullaniciID, MusteriID, SiparisNo, OdenenMiktar, Tarih`. Spec'in `IslemTuru`/`OdemeYontemi` alanları **DB'de yok** → DTO/UI'da yer almıyor (schema dokunulmaz kuralı).
- **`Order.MusteriId`** property entity'ye eklendi (DB kolonu `MusteriId` Faz 3'te map edilmemişti). Configuration güncellendi. Schema dokunulmadı.
- Faz 3'te eklenen `Order.MuhasebeEk` (mediumblob) artık `OrderService.UploadAttachmentAsync` ve `AccountingService.UploadMuhasebeEkAsync` üzerinden yazılabiliyor.
- Yeni entity yok.

## 6. StokTablo Yazma Kararı

WinForms Muhasebe.cs `StokTablo`'ya yazmıyor → Faz 5'te de yazma yok. Faz 8 cila/stok modülüne devir.

## 7. Sipariş Tamamlanma → Muhasebe Köprüsü Kararı

WinForms'ta `SiparisMiTeklifMi='Tamamlandi'` muhasebede otomatik bir hareket YAZMIYOR — sadece UI'da listede beliriyor. **Faz 4 LogisticsService.CompleteShipmentAsync'e dokunulmadı**. Modern API'da da otomatik tahsilat satırı eklenmiyor.

## 8. Excel Template

WinForms `ExcelIndir` BLOB template placeholder substitution → Faz 8'e devir. Modern `GenerateAccountingExcelAsync` şimdilik ClosedXML fallback (header + history tablosu).

## 9. AccountingService Yeni Metotları

| Metot | Açıklama |
|---|---|
| `GetOrderAccountingDetailAsync` | sipariş başlığı + bakiye hesabı |
| `GetTransactionsForOrderAsync` | sipariş başına tüm tahsilatlar |
| `AddTransactionAsync` | yeni tahsilat + Order.OdemeDurum güncelle |
| `GetTransactionHistoryPagedAsync` | çoklu filtre + sayfalama (MuhasebeGecmis port) |
| `GetCustomerBalanceAsync` | 4-döviz bakiye |
| `GenerateAccountingExcelAsync` | ClosedXML xlsx |
| `UploadMuhasebeEkAsync` | `Order.MuhasebeEk = bytes` + SiparisOnaylari audit |

AccountingRepository'ye 5 yeni metot: `SearchAsync, GetSumBySiparisNoAsync, GetByCustomerAsync, GetBySiparisNoAsync` + existing `GetAllOrderedAsync`.

## 10. Frontend Değişiklikleri

- `src/api/accounting.ts` rewrite: 10 yeni fonksiyon (`getAccountingOrders/Detail, getTransactionsForOrder, addTransaction, getTransactionHistory, getCustomerBalance, downloadAccountingExcel, uploadMuhasebeEk` + types).
- `src/pages/accounting/AccountingPage.tsx` rewrite: tahsilat ekle modal'ı + MuhasebeEk uploader + sipariş başına tahsilat geçmişi paneli. Excel yeni endpoint'e bağlandı.
- `src/pages/accounting/AccountingHistoryPage.tsx` (yeni): çoklu filtre + sayfalama + Excel.
- `src/pages/accounting/CustomerBalancePage.tsx` (yeni): müşteri seç → 4-döviz bakiye kartları.
- `src/components/Sidebar.tsx`: 3 muhasebe menüsü (Tahsilat / Geçmiş / Bakiye).
- `src/App.tsx`: 3 rota + `RoleGuard(Yonetici, Muhasebe)` (Gözlemci History'ye read).

## 11. Smoke Test Sonuçları

| Test | Beklenen | Sonuç |
|---|---|---|
| `dotnet build` (3x) | 0 hata | ✅ 0 uyarı 0 hata |
| `tsc -b --noEmit` | 0 hata | ✅ temiz |
| Swagger Faz 5 endpoint sayısı | 7+ accounting | ✅ 8 yeni accounting yolu |
| `GET /api/accounting/orders` (auth-less) | 401 | ✅ |
| `POST /api/accounting/transactions` (auth-less) | 401 | ✅ |
| `GET /api/accounting/customers/1/balance` (auth-less) | 401 | ✅ |
| `GET /api/accounting/transactions/history` (auth-less) | 401 | ✅ |
| `GET /api/accounting/excel` (auth-less) | 401 | ✅ |
| `POST /api/accounting/orders/SX/muhasebe-ek` (auth-less) | 401 | ✅ |

Tarayıcı testleri (Muhasebe rolü login → Tahsilat ekle → OdemeDurum güncelleme → MuhasebeEk yükleme → Müşteri bakiye → Excel indir) kullanıcı tarafında yapılacak.

## 12. Eksikler / Faz 6'ya Devir

1. **Tediye akışı** WinForms'ta Muhasebe.cs'te yok — Faz 6 satın alma modülünde değerlendirilecek.
2. **`SatinAlmaTalep` "Talep Gönder" akışı** (Muhasebe.cs odmeButton): Faz 6'da.
3. **`IslemTuru` / `OdemeYontemi` alanları**: DB schema değişikliği gerektirir; Faz 8 cila'da değerlendirilecek.
4. **ExcelIndir BLOB template**: Faz 8 cila.
5. **bcrypt geçişi**: Faz 1 TODO devam.
6. **Sipariş tamamlanma otomatik yansıma**: WinForms'ta yok → eklenmedi.
7. **StokTablo yazma**: WinForms'ta yok → eklenmedi. Faz 8.

## 13. Çalıştırma

```bash
cd CrmModern/CrmModern.API   && dotnet run --launch-profile http
cd CrmModern/CrmModern.Web   && npm run dev
```

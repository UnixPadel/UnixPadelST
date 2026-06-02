# Faz 4 — Üretim + Kalite Kontrol + Lojistik Raporu

_Tarih: 2026-05-06_

## 1. Form ↔ Endpoint Eşlemesi

| WinForms Form | Modern Endpoint | Yetki |
|---|---|---|
| `Kontrol.cs` (liste) | `GET /api/quality-control/pending` | `Yonetici` |
| `Kontrol.cs` (detay) | `GET /api/quality-control/{no}` | `Yonetici` |
| `Kontrol.cs` (audit) | `GET /api/quality-control/{no}/history` | authenticated |
| `Kontrol.cs::kontrolOnayla_Click` | `POST /api/quality-control/{no}/approve` | `Yonetici` |
| `KontrolRed.cs` | `POST /api/quality-control/{no}/reject` | `Yonetici` |
| `FabrikaYontim.cs` (Onayla) | `POST /api/factory/{no}/move-to-production` | `Yonetici, Fabrika` |
| `Fabrika.cs` (Hazır işaretle) | `POST /api/factory/{no}/mark-ready` | `Yonetici, Fabrika` |
| `Fabrika.cs` (liste) | `GET /api/factory` | `Yonetici, Fabrika` |
| `Lojistik.cs` (sevk listesi) | `GET /api/logistics/ready` | `Yonetici, Lojistik` |
| `LojistikYontim.cs::Onayla_Click` | `POST /api/logistics` | `Yonetici, Lojistik` |
| `Lojistik.cs` (tamamla) | `POST /api/logistics/{sevkId}/complete` | `Yonetici, Lojistik` |
| (yeni) Sevk iptali | `POST /api/logistics/{sevkId}/cancel` | `Yonetici, Lojistik` |
| `LojistikGecmis.cs` | `GET /api/logistics/history` | `Yonetici, Lojistik, Gozlemci` |
| `LojistikYontim.cs` (firma listesi) | `GET /api/logistics/carriers` | authenticated |
| (taşıma türü dropdown) | `GET /api/logistics/cesitler` | authenticated |

Geriye uyum için eski path'lar korundu: `PUT /api/quality-control/{no}/{approve,reject}`, `PUT /api/logistics/{no}/move-to-logistics`, `PUT /api/logistics/{no}/complete`.

## 2. LojistikYontim Kararı (4.1.d)

**DB'de ayrı taşıyıcı/firma yönetim tablosu YOK.** WinForms `LojistikYontim.cs` (177 satır) `SELECT DISTINCT FirmaAdi FROM LojistikTablo` ile dinamik firma listesi yapıyor; ayrı master tablo CRUD'u yok. Spec kuralı (`Eğer ayrı tablo yoksa LojistikTablo içinde dropdown listesi (string) olarak portla`) uygulandı:

- `GET /api/logistics/carriers` → `SELECT DISTINCT FirmaAdi`
- `GET /api/logistics/cesitler` → `SELECT DISTINCT LojistikCesit`
- POST/PUT/DELETE `carriers` endpoint'leri **eklenmedi**.
- Frontend `LogisticsReadyPage`'de sevk modal'ında `<datalist>` ile combo input.
- Bulgu detayı: [`docs/faz4-lojistikyontim-bulgular.md`](faz4-lojistikyontim-bulgular.md).

## 3. StokTablo Yazma Kararı (4.1.e)

WinForms `FabrikaYontim.cs`'in "Onayla" akışı `StokTablo`'ya **dokunmuyor** — reçeteden malzeme düşülmüyor. Spec kuralı gereği bu fazda **yazılmadı**, Faz 5/8'e devredildi. Modern API `StokTablo`'ya yalnızca okuma yapıyor (henüz okuma kullanım noktası da yok; `IStockRepository` Faz 3'te eklendi).

## 4. Yeni Eklenen Endpoint Sayısı

| Modül | Yeni endpoint | Toplam (faz sonu) |
|---|---|---|
| QualityControl | 3 (`/pending`, `/{no}`, `/{no}/history`) + POST aliasları | 6 |
| Factory | 0 yeni (mevcut korundu) | 6 |
| Logistics | 5 (`/ready`, `/carriers`, `/cesitler`, POST `/`, `/{id}/complete`, `/{id}/cancel`) | 10 |

Geriye uyum aliasları (PUT'lar) ile birlikte Faz 4 sonu Swagger'da 22 quality-control/factory/logistics yolu listeleniyor.

## 5. Akış Doğrulama (uçtan uca)

```
[Sipariş kaydı]
   ↓ Kontrol=Kontrol
[QC.Approve]            POST /api/quality-control/{no}/approve
   → Order.Kontrol='Onay' (Teklif→Siparis)
   → SiparisOnaylari satır (Onaylandi)
   ↓
[Üretime Geçir]         POST /api/factory/{no}/move-to-production
   → Order.SiparisMiTeklifMi='Uretim', STarih, FabrikaNot
   ↓
[Hazır Yap]             POST /api/factory/{no}/mark-ready
   → Order.SiparisMiTeklifMi='Hazir'
   ↓
[Sevkiyat Oluştur]      POST /api/logistics
   → LojistikTablo INSERT (FirmaAdi, LojistikCesit, Fiyat, LNot)
   → Order.SiparisMiTeklifMi='Lojistik', STarih, LojistikNot
   ↓
[Sevki Tamamla]         POST /api/logistics/{sevkId}/complete
   → Order.SiparisMiTeklifMi='Tamamlandi'
   → TamamlandiTablo INSERT (audit) ✓
   → SiparisOnaylari INSERT (audit) ✓

   YA DA
[Sevki İptal]           POST /api/logistics/{sevkId}/cancel
   → LojistikTablo DELETE (hard, soft-delete kolonu yok)
   → Order rollback: Lojistik → Hazir
   → SiparisOnaylari INSERT (audit, "Reddedildi")
```

Bu akış mevcut servis implementasyonuyla **uçtan uca yazma izleri bırakıyor** — TamamlandiTablo (Faz 3 entity) artık `LogisticsService.CompleteShipmentAsync` tarafından dolduruluyor.

## 6. Yetki Kararları

- **`/quality-control/*`**: Yalnız `Yonetici`. (Form3.cs satır 156–179: `kontrolButton.Enabled` sadece Yonetici.)
- **`/factory`**: Okuma `Yonetici, Fabrika, Gozlemci`; yazma `Yonetici, Fabrika`.
- **`/logistics/ready`**: `Yonetici, Lojistik` (sevk oluşturmak için).
- **`/logistics/history`**: Okuma `Yonetici, Lojistik, Gozlemci`; tamamla/iptal `Yonetici, Lojistik`.
- **`/logistics/carriers`** + `/cesitler`: tüm authenticated.

## 7. Frontend Değişiklikleri

| Dosya | Durum | Notu |
|---|---|---|
| `src/api/qualityControl.ts` | rewrite | `getPendingQC`, `getQCById`, `getQCHistory`, `approveQC` (POST + kontrolNot), `rejectQC` (POST) |
| `src/api/logistics.ts` | rewrite | 10 yeni fonksiyon: `getReadyForShipment, createShipment, completeShipment, cancelShipment, getCarriers, getCesitler, getLogisticsHistory, ...` |
| `src/api/factory.ts` | korundu | (mevcut metodlar yeterli) |
| `src/pages/quality-control/QualityControlPage.tsx` | "Detay" butonu eklendi → `OrderDetailModal` (onay timeline'ı dahil) |
| `src/pages/factory/FactoryPage.tsx` | Excel `downloadExcel` (Faz 3 endpoint) | (eski `exportOrderProforma` kaldırıldı) |
| `src/pages/logistics/LogisticsPage.tsx` | **silindi** (eski) | |
| `src/pages/logistics/LogisticsReadyPage.tsx` | **yeni** | Hazır sevkler + sevk modal (datalist taşıyıcı/tür) |
| `src/pages/logistics/LogisticsHistoryPage.tsx` | **yeni** | Geçmiş + Tamamla/İptal aksiyonları |
| `src/pages/logistics/CarriersPage.tsx` | **yeni** | DISTINCT FirmaAdi + LojistikCesit (read-only) |
| `src/components/Sidebar.tsx` | 3 logistics + qc/factory rolleri güncellendi | |
| `src/App.tsx` | 3 yeni rota + redirect `/logistics → /logistics/ready` | |

## 8. Smoke Test Sonuçları

| Test | Beklenen | Sonuç |
|---|---|---|
| `dotnet build` (4x) | 0 hata | ✅ 0 uyarı 0 hata |
| `tsc -b --noEmit` | 0 hata | ✅ temiz |
| Swagger Faz 4 endpoint sayısı | 20+ | ✅ 22 path |
| `GET /api/quality-control/pending` (auth-less) | 401 | ✅ |
| `POST /api/quality-control/SX/approve` (auth-less) | 401 | ✅ |
| `GET /api/quality-control/SX/history` (auth-less) | 401 | ✅ |
| `GET /api/logistics/ready` (auth-less) | 401 | ✅ |
| `POST /api/logistics` (auth-less) | 401 | ✅ |
| `GET /api/logistics/carriers` (auth-less) | 401 | ✅ |
| `POST /api/logistics/1/cancel` (auth-less) | 401 | ✅ |

Tarayıcı uçtan uca akış (Login → QC Onay → Üretime Geçir → Hazır → Sevk → Tamamla) gerçek kullanıcı tarafında test edilecek.

## 9. Eksikler / Faz 5'e Devir

1. **StokTablo yazma akışı**: WinForms FabrikaYontim'da yok; reçeteden tüketim Faz 5 (muhasebe maliyet) veya Faz 8 (stok modülü ekleme) işi.
2. **MuhasebeEk yükleme**: Hâlâ bloklu (Faz 5'te muhasebe modülünden açılacak).
3. **OrderShipment yazma akışı**: Faz 3'te entity hazır ama `SiparisTeslimatTablo`'ya 2-5. teslimat adresleri yazma UI'ı yok. Lojistik UI tek-adres odaklı; çoklu teslimat WinForms'ta da yalnız SiparisForm.cs'de.
4. **Excel BLOB template**: `ExcelIndir` placeholder substitution port'u Faz 8'e kaldı.
5. **bcrypt geçişi**: Faz 1 TODO devam.
6. **Lojistik sevk kayıt soft-delete**: Hard DELETE + Order rollback uygulandı (WinForms davranışını değiştirmedi). Audit'e yazılıyor; istenirse Faz 8'de soft-delete kolonu eklenebilir.

## 10. Çalıştırma

```bash
cd CrmModern/CrmModern.API   && dotnet run --launch-profile http
cd CrmModern/CrmModern.Web   && npm run dev
```

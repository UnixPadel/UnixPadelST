# Faz 2 — Master Data (Müşteri + Ürün Kataloğu + Fabrika) Raporu

_Tarih: 2026-05-06_

## 1. Form ↔ Endpoint Eşleşmesi

### Müşteri (`MusteriEkle.cs`)

| WinForms Aksiyonu | Modern Endpoint | Yetki |
|---|---|---|
| Liste/yenileme | `GET /api/musteri` | Authenticated |
| Tekil okuma | `GET /api/musteri/{id}` | Authenticated |
| Yeni Müşteri | `POST /api/musteri` (uniqueness kontrolü) | `Yonetici, Temsilci` |
| Düzenle | `PUT /api/musteri/{id}` (rename'de uniqueness) | `Yonetici, Temsilci` |
| Sil | `DELETE /api/musteri/{id}` | `Yonetici` |
| Ülke listesi | `GET /api/musteri/ulkeler` | Authenticated |
| Yeni Ülke | `POST /api/musteri/ulkeler` (uniqueness) | Authenticated (mevcut, kısıtlama eklenmedi) |

WinForms'ta ülke seçilince `NumaraBirimi` telefon kodu prefix'ine yansıyordu — modern UI'da ülke seçici "Türkiye (+90)" formatında gösterip aynı bilgiyi sunuyor (Select item label).

### Ürün Kataloğu (`AnaUrun.cs` + `Bilesen.cs` + `Recete.cs`)

| WinForms Aksiyonu | Modern Endpoint | Yetki |
|---|---|---|
| Kategori listesi | `GET /api/product-catalog/categories` | Authenticated |
| Yeni Kategori | `POST /api/product-catalog/categories` | `Yonetici` |
| Kategori Düzenle/Sil | `PUT/DELETE /api/product-catalog/categories/{id}` | `Yonetici` |
| Bileşen listesi | `GET /api/product-catalog/components` | Authenticated |
| Bileşen Ekle/Düzenle/Sil | `POST/PUT/DELETE /api/product-catalog/components[/{id}]` | `Yonetici` |
| Reçete oku | `GET /api/product-catalog/categories/{id}/recipe` | Authenticated |
| Reçete kaydet (Onayla) | `PUT /api/product-catalog/categories/{id}/recipe` (DELETE-then-INSERT) | `Yonetici` |
| Öznitelik listesi | `GET /api/product-catalog/attributes?bilesenId=...` | Authenticated |
| Öznitelik Ekle/Düzenle/Sil | `POST/PUT/DELETE /api/product-catalog/attributes[/{id}]` | `Yonetici` |

**Reçete davranışı (Recete.cs ile birebir):**
- Kategori seçilince fiyat doldurulur, **tüm bileşenler** listelenir, kategoriye dahil olanlar checked + adet input'u aktif gelir.
- "Onayla"da fiyat update + reçete kalemleri DELETE-then-INSERT atomic — `ProductCatalogService.UpdateRecipeAsync` aynı transaction'da yapıyor.
- Bileşen birim seçenekleri WinForms'taki gibi hard-coded: `Set, M, M2, Kg, Pcs`.

### Fabrika (`Fabrika.cs` + `FabrikaYontim.cs`) — KISMI PORT

| WinForms Aksiyonu | Modern Endpoint | Durum |
|---|---|---|
| Üretime Geçir | `PUT /api/factory/{siparisNo}/move-to-production` | ✅ mevcut |
| Hazır Yap | `PUT /api/factory/{siparisNo}/mark-ready` | ✅ mevcut |
| Üretim listesi | `GET /api/factory` | ✅ mevcut |
| **Çoklu filtre arama** (SiparisNo+MusteriAd+KullaniciID+Ülke+Aşama+Tarih aralığı) | — | ❌ **Faz 3** |
| **Excel BLOB üretimi** (`ExcelIndir` + placeholder doldurma) | — | ❌ **Faz 3** |
| **Ek/MuhasebeEk dosya indirme** (BLOB) | — | ❌ **Faz 3** |
| **Döviz bazlı bakiye toplamı** (Euro/Dolar/TL/Sterlin) | — | ❌ **Faz 3** |
| **Aşama bazlı satır renklendirme** | UI'a frontend tarafı StatusBadge ile yansır | ⚠️ kısmen |

## 2. Yetki Kararları

| Modül | Okuma | Yazma | Silme |
|---|---|---|---|
| Müşteri | tüm authenticated | Yonetici, Temsilci | Yonetici |
| Ürün Kataloğu (kategori/bileşen/öznitelik/reçete) | tüm authenticated | Yonetici | Yonetici |
| Fabrika | Yonetici, Fabrika, Gozlemci (mevcut) | Yonetici, Fabrika | — |

Form3.cs `iliskilendirTabButton.Enabled = (Yetki == "Yonetici")` ile uyumlu — reçete yazma sadece Yönetici. Temsilci/Fabrika rolleri reçeteyi okuyabilir ama değiştiremez.

Frontend tarafında `RoleGuard` route seviyesinde kullanılmıyor (ürün kataloğu menüsü Sidebar zaten `Yonetici, Fabrika` filtreliyor). Buton seviyesinde `canWrite = role === 'Yonetici'` kontrolü Düzenle/Sil/Onayla butonlarını saklıyor.

## 3. Fabrika Modülü Kararı

DB'de "Fabrika" adında ayrı bir tablo **YOK**. Faz 2 görev metnindeki 5. adım gereği bulgu aşağıdaki gibi raporlandı ve kararla devam edildi:

> "Fabrika" kavramı = (a) `KullaniciBilgileri.YetkiTuru = 'Fabrika'` rolü + (b) `SiparisAlTablo` üzerindeki `SiparisMiTeklifMi`, `STarih`, `FabrikaNot` kolonlarıyla ifade edilen sipariş yaşam döngüsü state'i.

**Karar:** Faz 2 master-data kapsamında Fabrika için **yeni entity yok**. Mevcut `FactoryService` 3-endpoint set'i (Get/MoveToProduction/MarkReady) Fabrika.cs'in **temel iş akışını** karşılıyor. WinForms Fabrika.cs'in **Excel BLOB üretimi, çoklu filtre arama, döviz toplamları, ek dosya indirme** gibi gelişmiş işlevleri Faz 3'e devredildi.

## 4. Entity / Configuration Değişiklikleri

- Yeni entity yok.
- Yeni konfigürasyon yok.
- `Kullanici` entity'sine Faz 1'de eklenen `OlusturmaTarihi` + `SatinAlmaYetkisi` haricinde Faz 2'de schema dokunuşu **sıfır**.
- Tek altyapı eklemesi: `IAttributeRepository` + `AttributeRepository` + `IUnitOfWork.Attributes`. Mevcut tabloya (`OznitelikTablo`) sadece okuma/yazma yapıyor.

## 5. Frontend Değişiklikleri

- `src/api/customers.ts` — `getCustomer`, `createCustomer`, `updateCustomer`, `deleteCustomer`, `createUlke` eklendi.
- `src/api/productCatalog.ts` — `updateCategory`, `deleteCategory`, `deleteComponent`, `getAttributes`, `createAttribute`, `updateAttribute`, `deleteAttribute` eklendi; `AttributeDto` exported.
- `src/types/index.ts` — `Musteri` ve `Ulke` interface'leri backend MusteriDto/UlkeDto ile birebir hizalandı (`mail` → `e_Mail`, `ulkeID` → `ulkelerID`, `bolge`, `numaraBirimi` eklendi).
- `src/pages/customers/CustomersPage.tsx` — Liste + filtre + Yeni/Düzenle/Sil + ülke seçici (numara birimi prefix gösterir) + role-based buton görünürlüğü.
- `src/pages/product-catalog/ProductCatalogPage.tsx` — 3 tab (Kategoriler+Reçete / Bileşenler / Öznitelikler), kategori satırına tıklayınca sağ tarafta **RecipePanel** (Recete.cs zihinsel modeli: tüm bileşenler listesi + checkbox + adet input + Onayla).

## 6. Smoke Test Sonuçları

| Test | Beklenen | Sonuç |
|---|---|---|
| `dotnet build` | 0 hata | ✅ 0 uyarı 0 hata |
| `tsc --noEmit` (Web) | 0 hata | ✅ temiz |
| Swagger Faz 2 endpoint sayısı | 13+ (ürün kataloğu 9 + müşteri 5 + fabrika 3) | ✅ tümü listeli |
| `GET /api/musteri` (auth-less) | 401 | ✅ |
| `POST /api/musteri` (auth-less) | 401 | ✅ |
| `DELETE /api/musteri/1` (auth-less) | 401 | ✅ |
| `GET /api/product-catalog/attributes` (auth-less) | 401 | ✅ |
| `DELETE /api/product-catalog/categories/1` (auth-less) | 401 | ✅ |

Tarayıcı üzerinden gerçek kullanıcı testi (login → CRUD → reçete kaydet) kullanıcı tarafında yapılacak — kimlik bilgisi paylaşmadım.

## 7. Bilinen Eksikler / Faz 3'e Devir

1. **Fabrika.cs gelişmiş port**: Çoklu filtre arama (300+ kolon), Excel BLOB template doldurma, Ek/MuhasebeEk BLOB indirme, döviz bazlı bakiye toplamı.
2. **StokTablo + UrunMaliyetTablo** entity'leri — Faz 3 stok/maliyet modülü.
3. **Bileşen DELETE referans çakışması**: Reçete'de kullanılan bir bileşeni silmeye çalışırsa DB FK constraint hatası dönüyor (frontend toast "Silinemedi" gösteriyor). Daha temiz hata için service'te ön kontrol Faz 3'e devir.
4. **MusteriEkle ülke ekleme**: WinForms'ta ülke ekleme aynı form içinde ikinci tab'dı; modern UI'da müşteriler sayfasında o akış henüz açılmadı (`POST /api/musteri/ulkeler` API'sinde mevcut). Müşteri form'una "Yeni ülke ekle" butonu eklenebilir — Faz 3 cosmetic.
5. **Reçete UI eksik özellik**: Adet alanına `0` girilirse otomatik unchecked. WinForms'ta da `(Adet: 0)` veya checked-but-zero ayrımı yok — birebir.
6. **Validation mesajları**: Backend'de `[Required]` zorunlu alanlar; ihlal halinde 400 + ApiResponse.Errors. Frontend toast'una error array'i propagation'ı Faz 3 cosmetic.

## 8. Çalıştırma

```bash
cd CrmModern/CrmModern.API   && dotnet run --launch-profile http     # http://localhost:5001
cd CrmModern/CrmModern.Web   && npm run dev                          # http://localhost:5173
```

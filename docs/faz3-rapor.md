# Faz 3 — Sipariş Yaşam Döngüsü Raporu

_Tarih: 2026-05-06_

## 1. Eklenen 5 Entity ↔ Tablo

| Entity | Tablo | Notu |
|---|---|---|
| `OrderApproval` | `SiparisOnaylari` | Onay/red audit log; `OnayDurumu`: `Beklemede/Onaylandi/Reddedildi` |
| `OrderShipment` | `SiparisTeslimatTablo` | Birden fazla teslimat satırı (kolonadı `TeslimatÇeşiti` Türkçe karakter korundu) |
| `CompletedOrder` | `TamamlandiTablo` | Tamamlanma audit; DB kolonu `KullaniciAdi` int → property `KullaniciID` |
| `StockEntry` | `StokTablo` | Faz 3 SADECE OKU |
| `ProductCost` | `UrunMaliyetTablo` | Faz 3 SADECE OKU (material-cost endpoint) |

`Order` entity'sine `MuhasebeEk` BLOB kolonu eklendi (DB'de zaten vardı, entity'de eksikti). 5 yeni entity için `Configuration` sınıfları + `AppDbContext` DbSet'leri + `IUnitOfWork`'e 5 yeni repository property'si eklendi. Migration üretilmedi, schema dokunulmadı.

## 2. SiparisForm.cs → Endpoint Eşlemesi

| WinForms Aksiyonu | Modern Endpoint | Yetki |
|---|---|---|
| `siparisAlButon` (Sipariş Kaydı) | `POST /api/orders/order` | `Yonetici, Temsilci` |
| `teklifAlButonu` (Teklif Hazırla) | `POST /api/orders/quote` | `Yonetici, Temsilci` |
| `revizeEtButton` (Revize Et) | `POST /api/orders/{no}/revise` | `Yonetici, Temsilci` |
| `Form Göster` (FormGetir klonla) | `POST /api/orders/{no}/clone` | `Yonetici, Temsilci` |
| `SipariseCevirButton` | `PUT /api/orders/{no}/convert-to-order` | mevcut |
| `KontrolForm.Onayla` | `POST /api/orders/{no}/approve` | `Yonetici` |
| `KontrolRed.Reddet` | `POST /api/orders/{no}/reject` | `Yonetici` |
| Onaya gönder (yeni akış) | `POST /api/orders/{no}/submit` | `Yonetici, Temsilci` |
| `anaUrunComboBox.SelectedIndexChanged` (Reçeteden Aç) | `POST /api/orders/{no}/expand-recipe` | `Yonetici, Temsilci` |
| `ekButton` (BLOB yükle) | `POST /api/orders/{no}/attachments?type=ek` | `Yonetici, Temsilci, Muhasebe` |
| `Ek İndir`, `MuhasebeEk İndir` | `GET /api/orders/{no}/attachments/{type}` | authenticated |
| Excel raporu | `GET /api/orders/{no}/excel` | `Yonetici, Fabrika, Muhasebe` |
| Material cost | `GET /api/orders/{no}/material-cost` | `Yonetici, Muhasebe, Fabrika` |
| Onay geçmişi | `GET /api/orders/{no}/approvals` | authenticated |

`Siparislerim.cs`: `GET /api/orders/my` (kullanıcının kendi kayıtları).
`Fabrika.cs` çoklu filtre + döviz toplam: `GET /api/orders` + `GET /api/orders/totals` (delegasyonu `GET /api/factory/totals`'tan da yapılır).

## 3. Reçete Açma + Fiyat Formülü (BIREBIR)

```
ON anaUrunComboBox[i].SelectedIndexChanged:
  SELECT bb.BilesenID, bb.BilesenAdi, bb.Birim, kb.Adet
  FROM BilesenBilgileri bb LEFT JOIN KategoriBilesenleri kb
    ON kb.BilesenID = bb.BilesenID AND kb.KategoriID = @id
  WHERE kb.KategoriID = @id

ExpandRecipe(orderNo, kategoriId, adet):
  // Kategori-seviye satırı
  INSERT SiparisIslemTablo (KategoriID=@id, BilesenID=NULL, Adet=@adet, Fiyat=cat.Fiyat)
  // Bileşen satırları (BoM × kategori adet)
  for each kb in cat.CategoryComponents:
    INSERT SiparisIslemTablo (BilesenID=kb.BilesenID, Adet=kb.Adet*adet, Fiyat=kb.Component.Fiyat)

Fiyat formülü (mevcut SaveAsync içinde, BIREBIR):
  brutToplam = Σ(set.KategoriFiyat) + (montajFiyat if MontajVar) + (teslimatFiyat if TeslimatVar)
  toplam = (brutToplam − Indirim) × (1 + Kdv/100)
```

## 4. Onay Akışı State Machine

```
                    submit
   [Kontrol]  ───────────────►  [Beklemede]
       │                            │
       │                            │ approve / reject
       │                            ▼
       └─── reject ──►  [Reddet] + Red kolonu = aciklama
                                    │
                                    ▼
                            (revize ile yeni denemeye)

   approve:  Kontrol = "Onay"   (Teklif ise SiparisMiTeklifMi → "Siparis")
             SiparisOnaylari satırı (OnayDurumu="Onaylandi", aciklama, OnayTarih=Now)
   reject:   Kontrol = "Reddet"  (aciklama Red kolonuna)
             SiparisOnaylari satırı (OnayDurumu="Reddedildi", aciklama)
```

## 5. Excel Template Kararı

WinForms `Fabrika.cs` `ExcelIndir` tablosundan BLOB template indiriyor; içinde `#SIPARISNO`, `#URUN`, `#MIKTAR`, `#FIYAT`, `#MONTAJ`, `#TESLIMAT` placeholder'ları var.

**Modern karar:** `ExcelIndir` tablosu **bu fazda entity'leştirilmedi**; `OrderService.GenerateExcelAsync` şu an **fallback ClosedXML xlsx** üretiyor (header + items tablosu). BLOB template port'u Faz 8 (cila) işi olarak devredildi. Frontend `downloadExcel(no)` zaten endpoint'i çağırıp blob indiriyor — template Faz 8'de eklendiğinde frontend değişmeden çalışacak.

## 6. BLOB Ek Dosya Saklama

WinForms ne yapıyorsa aynısı: `SiparisAlTablo.Ek` (`mediumblob`) ve `SiparisAlTablo.MuhasebeEk` (`mediumblob`) kolonlarına byte[] olarak yazılır. Modern API:
- Yükleme: `multipart/form-data` → `IFormFile` → `MemoryStream` → `byte[]` → `Order.Ek`
- İndirme: `application/octet-stream`, `Content-Disposition: attachment; filename={type}_{no}.bin`
- MIME bilgisi DB'de saklanmadığı için varsayılan uzantı `.bin` (WinForms da uzantı/kalıp tutmuyordu).
- `MuhasebeEk` yükleme `BusinessException` ile bloklandı (Faz 5 muhasebe modülünden yüklenecek); indirme açık.

## 7. Yetki Kararları

| Endpoint | Yetki |
|---|---|
| `GET /api/orders[/my,/{no},/{no}/approvals,/{no}/rejection-note,/totals]` | authenticated |
| `GET /api/orders/{no}/material-cost` | `Yonetici, Muhasebe, Fabrika` |
| `POST /api/orders/{order,quote}` + `revise` + `clone` + `submit` + `expand-recipe` | `Yonetici, Temsilci` |
| `POST /api/orders/{no}/{approve,reject}` | `Yonetici` |
| `POST /api/orders/{no}/attachments` | `Yonetici, Temsilci, Muhasebe` |
| `GET /api/orders/{no}/attachments/{type}` | authenticated |
| `GET /api/orders/{no}/excel` | `Yonetici, Fabrika, Muhasebe` |
| `GET /api/factory/totals,/{no}/excel,/{no}/attachments/{type}` | rol bazlı (kontrolör/onaylayıcı için) |

## 8. Frontend Değişiklikleri

- `src/api/orders.ts` — 18+ fonksiyon: `getOrders, getMyOrders, getOrderTotals, getOrderDetail, getApprovals, getMaterialCost, createOrder, createQuote, reviseOrder, cloneOrder, convertToOrder, submitForApproval, approveOrder, rejectOrder, expandRecipe, uploadAttachment, downloadExcel, getCategories, getComponentsByCategory, getDeliveryAddresses` + URL builders.
- `src/components/CurrencyTotals.tsx` (yeni) — 4 döviz kartı (€/$/₺/£).
- `src/components/OrderApprovalTimeline.tsx` (yeni) — onay/red audit timeline.
- `src/components/OrderDetailModal.tsx` — `OrderApprovalTimeline` entegre + Excel butonu yeni endpoint'e bağlandı.
- `src/pages/orders/OrdersPage.tsx` — **çoklu filtre paneli** (sipariş no, müşteri, ülke, aşama, döviz, tarih aralığı) + `CurrencyTotals` + sayfalama + role-bazlı satır aksiyonları (Onayla/Reddet `Yonetici`, Klonla/Excel/Detay herkese).
- `src/pages/orders/MyOrdersPage.tsx` (yeni) — Siparislerim portu (`/api/orders/my`), Onaya Gönder + Revize + Siparişe Çevir + Excel.
- `src/pages/orders/NewOrderPage.tsx` (yeni) — **5 sekmeli wizard** (Üst Bilgi / Kalemler / Adresler / Ekler / Onay). Kaydet sonrası "Reçeteden Aç" + Ek dosya yükleme aktif olur.
- `src/components/Sidebar.tsx` — `/orders` ("Siparişler") + `/orders/my` ("Siparişlerim") iki menü.
- `src/App.tsx` — yeni rotalar + `/orders/new` `RoleGuard(Yonetici, Temsilci)`.

## 9. Smoke Test Sonuçları

| Test | Beklenen | Sonuç |
|---|---|---|
| `dotnet build` (her alt-adımda) | 0 hata | ✅ 0 uyarı 0 hata (5x build) |
| `tsc -b --noEmit` | 0 hata | ✅ temiz |
| Swagger Faz 3 endpoint sayısı | 13+ yeni Order + 3 Factory | ✅ 18 yeni Order + 3 Factory devir |
| `GET /api/orders` (auth-less) | 401 | ✅ |
| `GET /api/orders/totals` (auth-less) | 401 | ✅ |
| `GET /api/orders/SX1/approvals` (auth-less) | 401 | ✅ |
| `POST /api/orders/SX1/approve` (auth-less) | 401 | ✅ |
| `POST /api/orders/SX1/expand-recipe` (auth-less) | 401 | ✅ |
| `GET /api/factory/totals` (auth-less) | 401 | ✅ |

Tarayıcı üzerinden gerçek kullanıcı ile uçtan uca test (login → yeni sipariş wizard → kaydet → Reçeteden Aç → Excel indir → Onaya gönder → Yönetici olarak Onayla → onay timeline'ında satır göründü mü) kullanıcı tarafından yapılacak.

## 10. Eksikler / Faz 4'e Devir

1. **Excel BLOB template port**: `ExcelIndir` tablosu entity'leşmedi; placeholder substitution (`#URUN`, `#MIKTAR`, `#SIPARISNO`...) Faz 8 cila işi. Şimdilik fallback ClosedXML xlsx üretiyor.
2. **MuhasebeEk yükleme**: `POST /api/orders/{no}/attachments?type=muhasebeek` Faz 5 muhasebe modülünden açılacak (şu an `BusinessException`).
3. **OrderShipment yazma akışı**: SiparisTeslimatTablo'ya 2-5. teslimat adresleri yazma UI'ı Faz 4 üretim/lojistik bağlamında. Bu fazda repo + entity hazır, frontend tek adres odaklı.
4. **CompletedOrder yazma akışı**: TamamlandiTablo'ya yazma Faz 4 lojistik tamamlama'da olacak. Repo hazır.
5. **StokTablo / UrunMaliyetTablo yazma**: Faz 4 (üretim) ve Faz 5 (muhasebe). Faz 3'te SADECE OKU.
6. **5-tab wizard tam parite**: Mevcut NewOrderPage iskeleti var ama WinForms 5-set tab sistemi (her sekmede ayrı kategori + adet + reçete) tam port değil — şu an tek "Reçeteden Aç" akışı var. Wizard'ın geri kalanı (5 paralel set, montaj/teslimat per-tab cache) Faz 8 cila.
7. **Sipariş numarası tek satır içinde re-üretim**: revizyon "-1, -2" mevcut; klonlama yeni numara üretiyor (kaynak `Tarih=Now`, `Kontrol=Kontrol` reset). FormGetir.cs üzerindeki ek detay kopyaları (örn. ödeme detayları, eski sipariş notları) saatte sadeleştirildi — kritik değil.
8. **Audit (EklemeGecmisi)**: Onay haricindeki değişiklikler için audit yok. Faz 8'de.
9. **Bcrypt şifre geçişi**: Faz 1'den devir, hâlâ açık.

## 11. Çalıştırma

```bash
cd CrmModern/CrmModern.API   && dotnet run --launch-profile http     # http://localhost:5001
cd CrmModern/CrmModern.Web   && npm run dev                          # http://localhost:5173
```

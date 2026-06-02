# Faz 6 — Satın Alma Modülü Raporu

_Tarih: 2026-05-06_

## 1. Kanonik Tablo Kararı (6.1.a)

**`SatinAlmaTalep` (tekil) kanoniktir.**

WinForms'taki 5 form + Migrations.cs hepsi bu tabloyu kullanıyor. DB'de 45 kolon + 17 üretim satırı. `SatinAlmaTalepleri` (çoğul) 4 kolonlu / 0 satırlı legacy taslak — modern API dokunmuyor. `PurchaseRequest.ToTable("SatinAlmaTalep")` Faz 0'da zaten doğruydu, değişiklik yok. Detay: [`docs/faz6-kanonik-tablo.md`](faz6-kanonik-tablo.md).

## 2. Şema Migration Kararı (6.1.b)

**Seçenek (i): entity-only.** DB'de 17 ödeme/ön-izleme kolonu **zaten mevcut** (SatinAlmaMigrations.cs WinForms tarafında çalışmış). Runtime ALTER TABLE runner port edilmedi. Sadece entity property + Configuration map eklendi. Schema dokunulmadı.

**Düzeltmeler (memory ile uyumsuz):** `OdemeVadeSuresi` `INT` değil **`varchar(50)`** ("30 gün" metni); `OdemeVadeTarihi` `DATETIME` değil **`date`** → `DateOnly?` property.

## 3. 3-Aşamalı Onay Zinciri (State Machine, BIREBIR)

```
[talep oluştur — Fabrika/Lojistik/Gozlemci/Temsilci/Yonetici]
        ↓ POST /api/purchase
[Durum=Bekliyor]
        ↓ omur.caliskan VEYA Yonetici
[POST /{id}/preapprove]
        ↓
[Durum=Ön Onaylandı + OnIzlemeYapan/Tarihi]
        ↓ Muhasebe rolü VEYA Yonetici
[POST /{id}/payment-details]
        ↓ (dinamik panel validation)
[Durum=Muhasebe Tamamlandı + MuhasebeYapan/Tarihi + Odeme* alanları]
        ↓ elshan.rasulov VEYA Yonetici
[POST /{id}/final-approve]
   ⟳ RULE 4: TalepTipi='SatinAlma' AND OdemeTuru IS NULL → BusinessException ⟲
        ↓
[Durum=Onaylandı + IslemYapanKullanici/Tarihi]   TERMINAL

Red yan-akışı (her aşamada): Durum=Reddedildi + RedNotu zorunlu
```

## 4. Dinamik Ödeme Paneli (BIREBIR)

`SetPaymentDetailsDto` + frontend `DynamicPaymentForm.tsx`:

| OdemeTuru | Zorunlu alanlar |
|---|---|
| `Peşin` | `OdenenTutar`, `OdemeIslemTarihi` |
| `Vadeli` | `OdenenTutar`, `OdemeVadeSuresi`, `OdemeVadeTutari` |
| `Mal Mukabili` | `OdenenTutar`, `OdemeAciklama` |
| `Çek / Senet` | `OdemeTutari`, `OdemeBelgeNo`, `OdemeVadeTarihi` |
| `Havale / EFT` | `OdemeTutari`, `OdemeBankaAdi`, `OdemeIslemTarihi` |
| `Kredi Kartı / Banka Kartı` | `OdemeTutari`, `OdemeKartTipi` (opsiyonel: `OdemeTaksitSayisi`, `OdemeBankaAdi`) |

`OdemeTuru` ComboBox değerleri WinForms'la **tam birebir** (6 seçenek). Negatif tutar yasak. Tüm doğrulama service seviyesinde (`ValidateDynamicPaymentFields`).

## 5. Rule 4 Implementation

`PurchaseService.FinalApproveAsync` içinde:
```csharp
var tipi = string.IsNullOrEmpty(entity.TalepTipi) ? "SatinAlma" : entity.TalepTipi;
if (tipi == "SatinAlma" && string.IsNullOrWhiteSpace(entity.OdemeTuru))
    throw new BusinessException(
        "Satın Alma tipi talepler için ödeme bilgisi zorunludur. " +
        "Lütfen önce Muhasebe bölümü ödeme detayını girsin.");
```

Backend ihlal → 400 (BusinessException → ApiResponse.Fail). Frontend `FinalApprovalPage` aynı kontrolü yapıp Onayla butonu disabled tutar (defansif çiftli koruma).

## 6. Özel Kullanıcı Kontrolü (omur, elshan)

WinForms birebir: rol değil **kullanıcı adı** kontrolü.

**Controller savunma katmanı:**
```csharp
if (CurrentUserName != PreApproverUser && !IsRole("Yonetici")) return Forbid();
```
- Ön onay (`/preapprove`, `/prereject`) → `omur.caliskan` veya `Yonetici`
- Nihai onay (`/final-approve`, `/final-reject`, `/pending-final`) → `elshan.rasulov` veya `Yonetici`
- Tüm talepler (`/all`) → `elshan.rasulov` veya `Yonetici` veya `Gozlemci`

JWT claim'lerindeki `ClaimTypes.Name` (= KullaniciAdi) ile karşılaştırma. Yonetici fallback'i memory ile uyumlu (admin override).

## 7. Yeni Endpoint Sayısı: 8 (16 toplam)

| Endpoint | Yetki |
|---|---|
| GET `/api/purchase/my` | authenticated |
| GET `/api/purchase/all` | Yonetici / elshan / Gozlemci |
| GET `/api/purchase/{id}` | authenticated |
| GET `/api/purchase/pending-preapproval` | Yonetici + omur |
| GET `/api/purchase/pending-payment` | Yonetici, Muhasebe |
| GET `/api/purchase/pending-final` | Yonetici + elshan |
| POST `/api/purchase/{id}/preapprove` | Yonetici + omur |
| POST `/api/purchase/{id}/prereject` | Yonetici + omur |
| POST `/api/purchase/{id}/payment-details` | Yonetici, Muhasebe |
| POST `/api/purchase/{id}/final-approve` | Yonetici + elshan |
| POST `/api/purchase/{id}/final-reject` | Yonetici + elshan |

Eski path'lar (PUT `/approve`, `/reject`, GET `/pending`, `/history`) **korundu** (geriye uyum).

## 8. Frontend Değişiklikleri

- `src/api/purchase.ts` rewrite: 16+ fonksiyon (CRUD + 8 aşama aksiyon + filtreli liste + detay).
- `src/components/PurchaseStatusBadge.tsx` (yeni) — WinForms RGB renk kuralları (BIREBIR).
- `src/components/DynamicPaymentForm.tsx` (yeni) — `OdemeTuru` seçimine göre alt panel; 6 seçenek hard-coded.
- `src/pages/purchase/NewPurchaseRequestPage.tsx` (yeni) — SatinAlmaForm portu.
- `src/pages/purchase/MyPurchaseRequestsPage.tsx` (yeni) — kullanıcının kendi talepleri.
- `src/pages/purchase/AllPurchaseRequestsPage.tsx` (yeni) — SatinAlmaTumTalepForm portu; çoklu filtre + sayfa + aşama computed.
- `src/pages/approval/PreApprovalPage.tsx` (yeni) — SatinAlimOnIzlemeForm portu, Onay/Red modal.
- `src/pages/approval/PaymentDetailsPage.tsx` (yeni) — SatinAlmaTakipForm portu, dinamik panel.
- `src/pages/approval/FinalApprovalPage.tsx` (yeni) — SatinAlmaOnayForm portu, sol panelde Muhasebe ödeme alanları read-only, Rule 4 frontend kontrolü.
- Eski `pages/purchase/PurchasePage.tsx` ve `pages/approval/ApprovalPage.tsx` **silindi**.
- `src/components/Sidebar.tsx` — `usernames` field eklendi (rol VEYA kullanıcı adı OR), 6 yeni menü.
- `src/App.tsx` — 6 yeni rota + redirect `/purchase → /purchase/mine`.

## 9. Yetki Kararları Özeti

| Sayfa | Görünürlük |
|---|---|
| Yeni Talep | Yonetici, Lojistik, Fabrika, Gozlemci, Temsilci |
| Taleplerim | authenticated |
| Tüm Talepler | Yonetici, Gozlemci, Muhasebe, **elshan.rasulov** |
| Ön Onay | Yonetici, **omur.caliskan** |
| Ödeme Detayı | Yonetici, Muhasebe |
| Nihai Onay | Yonetici, **elshan.rasulov** |

## 10. Smoke Test Sonuçları

| Test | Beklenen | Sonuç |
|---|---|---|
| `dotnet build` (3x) | 0 hata | ✅ 0 uyarı 0 hata |
| `tsc -b --noEmit` | 0 hata | ✅ temiz |
| Swagger Faz 6 endpoint sayısı | 16 toplam (8 yeni) | ✅ 16 path listeli |
| 8 auth-less endpoint | 401 | ✅ 8/8 |

**Uçtan uca test (kullanıcıda):**
- Fabrika rolü → talep oluştur (`Durum=Bekliyor`)
- omur.caliskan → preapprove (`Ön Onaylandı`)
- Muhasebe → payment-details / OdemeTuru=Vadeli (`Muhasebe Tamamlandı`)
- elshan.rasulov → final-approve (`Onaylandı`)
- **Rule 4 testi**: omur ön-onayla, doğrudan elshan'a final-approve → 400 BusinessException "Satın Alma tipi talepler için ödeme bilgisi zorunludur".

## 11. Eksikler / Faz 7'ye Devir

1. **TalepOnaylari audit tablosu**: WinForms'ta yazılmıyor, modern API'da da yazılmıyor. İstenirse Faz 8'de değerlendirilir.
2. **Tediye akışı**: WinForms Muhasebe.cs'te yok → eklenmedi (Faz 5 raporu da bunu doğrulamıştı).
3. **SatinAlmaTalepleri legacy tablosu temizliği**: 0 satır, dokunulmadı. Faz 8 cila.
4. **Grid renk kuralları RGB → Tailwind**: Yakın eşleşme yapıldı (green/sky/blue/red/yellow palet). Birebir RGB değil ama görsel paralel.
5. **Dosya ekleri**: Talep ek dosya WinForms'ta yok → eklenmedi.

## 12. Çalıştırma

```bash
cd CrmModern/CrmModern.API && dotnet run --launch-profile http
cd CrmModern/CrmModern.Web && npm run dev
```

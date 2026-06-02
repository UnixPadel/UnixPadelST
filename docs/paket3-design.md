# Paket 3 — Lojistik Muhasebe Onay Zinciri + Global Lojistik Gözlemci

**Tarih:** 2026-05-21  
**Kapsam:** CrmModern (Faz 0-8 + Paket 1-2 üzerine inşa)  
**Modüller:** Logistics (CreateShipment akışı), SiparisOnaylari (Paket 2 audit), Sidebar/Yetki katmanı

> **WinForms eşleniği:** **YOK.** Bu akış WinForms'ta mevcut değildi; modern UI için kullanıcı isteğiyle eklenen **yeni iş kuralı**dır.

---

## 1. Hedef

1. Lojistik kullanıcı bir hazır siparişe "Sevk Oluştur" dediğinde **Muhasebe onayı beklenir**. Muhasebe onaylayana kadar sipariş "Hazir" aşamasında kalır, fakat LojistikTablo'da talep satırı vardır.
2. `elshan.rasulov` kullanıcısı tüm lojistik akışını **read-only** gözlemleyebilir (Faz 6 pattern: rol VEYA kullanıcı adı).

---

## 2. Kritik Tasarım Kararı — Schema Değiştirme Yok

Mevcut iki kolon ile yeterli sinyal vardır:

* `SiparisAlTablo.SiparisMiTeklifMi` (mevcut enum)
* `LojistikTablo` satırının VARLIĞI

### State Sinyali

| Order.SiparisMiTeklifMi | LojistikTablo'da satır? | Anlam                              |
|-------------------------|--------------------------|------------------------------------|
| `Hazir`                 | **YOK**                  | Henüz sevk talebi açılmadı         |
| `Hazir`                 | **VAR**                  | Muhasebe onayı bekliyor            |
| `Lojistik`              | **VAR**                  | Muhasebe onayladı, sevk yolda      |
| `Tamamlandi`            | VAR                      | Sevk bitti (Faz 3)                  |
| `Hazir` (rejected)      | YOK (silindi)            | Muhasebe reddetti, kalkış noktasına döndü |

### Neden schema'ya dokunmuyoruz?

* `LojistikTablo`'ya `Durum` kolonu eklemek migration gerektirir; iki sinyalin türetilebileceği yerde redundancy doğurur.
* `SiparisMiTeklifMi` enum'una yeni değer (`LojistikOnayBekliyor`) eklemek tüm Faz 3 sorgularını (LogisticsOrders, search, dashboard, rapor) etkiler; her birinde "yeni değer ne olacak?" sorusu çıkar.
* `SiparisOnaylari` (Paket 2) zaten audit için var — `LojistikOnayBekliyor / LojistikOnaylandi / LojistikReddedildi` durum string'lerini buraya yazmak yeterli.

---

## 3. State Geçiş Akışı

```
[Hazir + LojistikTablo:YOK]
    │  Lojistik kullanıcı: POST /api/logistics
    ▼
[Hazir + LojistikTablo:VAR]              ── Muhasebe Onayı Bekliyor
    │
    ├─ Muhasebe: POST /api/logistics/{sevkId}/muhasebe-approve
    │       Order='Lojistik' ; LojistikTablo: aynen kalır
    │       SiparisOnaylari UPSERT durum=LojistikOnaylandi
    ▼
[Lojistik + LojistikTablo:VAR]           ── Sevk Yolda
    │
    │  Lojistik: POST /api/logistics/{sevkId}/complete  (mevcut akış)
    ▼
[Tamamlandi + LojistikTablo:VAR]         ── Tamamlandı

— veya, Muhasebe reddinde:
[Hazir + LojistikTablo:VAR]
    │  Muhasebe: POST /api/logistics/{sevkId}/muhasebe-reject
    │       LojistikTablo: DELETE
    │       Order: 'Hazir' (değişmez)
    │       SiparisOnaylari UPSERT durum=LojistikReddedildi
    ▼
[Hazir + LojistikTablo:YOK]              ── Başa dön
```

---

## 4. Backend Değişiklikleri

### 4.1 Yeni DTO

`CrmModern.Core/DTOs/Logistics/LogisticsPendingApprovalDto.cs`:

```csharp
public sealed record LogisticsPendingApprovalDto(
    int      SevkId,
    string   SiparisNo,
    string   MusteriAd,
    string?  MUlke,
    string   FirmaAdi,
    string   LojistikCesit,
    decimal  Fiyat,
    string?  LNot,
    string?  LojistikNot,
    DateTime? STarih);
```

### 4.2 Repository — Yeni metotlar

* `ILogisticsEntryRepository.GetPendingApprovalAsync()` → LojistikTablo JOIN SiparisAlTablo WHERE SiparisMiTeklifMi='Hazir' (yani onay bekleyenler).
* `IOrderRepository.UpdateLogisticsFieldsAsync(siparisNo, sTarih, lojistikNot)` → STarih + LojistikNot setle, **SiparisMiTeklifMi değişmesin**.
* `IOrderRepository.MoveHazirToLogisticsAsync(siparisNo)` → sadece Hazir→Lojistik stage geçişi (alanlara dokunmadan). Aslında mevcut `MoveToLogisticsAsync` zaten STarih+LojistikNot setliyor — bu Hazir→Lojistik için yeni bir method yazıp adımları ayırırız.

### 4.3 Service — `LogisticsService.cs`

| Metot                          | Davranış                                                            |
|--------------------------------|---------------------------------------------------------------------|
| `MoveToLogisticsAsync` (mevcut, davranış değişir) | LojistikTablo INSERT + Order.STarih/LojistikNot UPDATE (stage **DEĞİŞMEZ**) + UPSERT `LojistikOnayBekliyor` |
| `GetPendingMuhasebeApprovalAsync` (YENİ) | Repository join, DTO listesi döner |
| `MuhasebeApproveLogisticsAsync(sevkId, userId, aciklama)` (YENİ) | Order: Hazir→Lojistik + UPSERT `LojistikOnaylandi` |
| `MuhasebeRejectLogisticsAsync(sevkId, userId, redNotu)` (YENİ) | LojistikTablo DELETE + Order Hazir kalır + UPSERT `LojistikReddedildi` |
| `CompleteShipmentAsync` (mevcut, dokunulmaz)   | — |
| `CancelShipmentAsync` (mevcut, dokunulmaz)     | — |
| `GetHistoryAsync` (mevcut, dokunulmaz)         | — |

### 4.4 Controller — `LogisticsController.cs`

Yeni endpoint'ler:

| Method | Path                                                | Yetki                                                                |
|--------|-----------------------------------------------------|----------------------------------------------------------------------|
| GET    | `/api/logistics/pending-muhasebe-approval`          | Yonetici, Muhasebe, Lojistik, Gozlemci, **elshan.rasulov** (read-only) |
| POST   | `/api/logistics/{sevkId}/muhasebe-approve`          | Yonetici, Muhasebe                                                    |
| POST   | `/api/logistics/{sevkId}/muhasebe-reject`           | Yonetici, Muhasebe                                                    |

Değiştirilenler:

| Method | Path                       | Yetki                                                                  |
|--------|----------------------------|-------------------------------------------------------------------------|
| POST   | `/api/logistics`            | Yonetici, Lojistik — davranış 4.3'e göre değişti                       |
| GET    | `/api/logistics/history`    | + **elshan.rasulov** read-only (mevcut Yonetici/Lojistik/Gozlemci'ye ek) |
| GET    | `/api/logistics`            | + elshan.rasulov                                                        |
| GET    | `/api/logistics/carriers`   | + elshan.rasulov                                                        |
| GET    | `/api/logistics/cesitler`   | + elshan.rasulov                                                        |

Yetki helper'ı:

```csharp
private bool CanReadLogistics() =>
    User.IsInRole("Yonetici") || User.IsInRole("Lojistik") ||
    User.IsInRole("Gozlemci") || User.IsInRole("Muhasebe") ||
    User.FindFirstValue(ClaimTypes.Name) == "elshan.rasulov";
```

Yazma endpoint'leri (`POST /api/logistics`, `complete`, `cancel`, `muhasebe-approve`, `muhasebe-reject`) `[Authorize(Roles="...")]` ile kısıtlı kalır — elshan asla yazamaz.

---

## 5. Frontend Değişiklikleri

### 5.1 API + Types

`src/api/logistics.ts`:
* `getPendingMuhasebeApproval()`
* `muhasebeApproveLogistics(sevkId, aciklama)`
* `muhasebeRejectLogistics(sevkId, redNotu)`

`src/types/index.ts`:
* `LogisticsPendingApprovalDto`

### 5.2 Sayfalar

* **YENİ** `pages/accounting/LogisticsApprovalsPage.tsx` — Muhasebe + Yonetici görür. Bekleyen sevkler tablo, satırlarda Onayla/Reddet modal.
* `pages/logistics/LogisticsReadyPage.tsx` — toast metni: "Sevk talebi oluşturuldu — Muhasebe onayı bekliyor."
* `pages/logistics/LogisticsHistoryPage.tsx` — her satırın yanına `LogisticsStatusBadge` (Order.SiparisMiTeklifMi'den türetilen 3 renk).
* **YENİ** `components/LogisticsStatusBadge.tsx` — `Hazir → "Muhasebe Onayı Bekliyor"` (warning), `Lojistik → "Sevk Yolda"` (default), `Tamamlandi → "Tamamlandı"` (success).

### 5.3 Sidebar + Route

* `/accounting/logistics-approvals` — Yonetici, Muhasebe rolünde görünür.
* `/logistics/...` linkleri elshan.rasulov için de görünür (Sidebar `usernames` field ile).
* Lojistik sayfa içindeki yazma butonları elshan'a kapalı (frontend gizleme + backend 403).

---

## 6. Sözleşme Özeti

* WinForms birebir kuralı ihlal **edilmez**: yeni iş kuralı kullanıcı isteğiyle ekleniyor, rapora belirtildi.
* Schema/migration üretilmiyor; LojistikTablo aynı kolonlarla devam.
* `SiparisMiTeklifMi` enum'una yeni değer eklenmiyor.
* Tüm audit yazımları Paket 2 UPSERT pattern üzerinden.
* elshan.rasulov için ayrı rota yok; tüm lojistik sayfaları kullanıcı adı kontrolü ile açılır, write işlemleri 403.

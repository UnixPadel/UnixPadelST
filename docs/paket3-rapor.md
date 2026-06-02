# Paket 3 — Lojistik Sevkiyat Muhasebe Onay Zinciri + Global Lojistik Gözlemci

**Tarih:** 2026-05-21
**Bağlı dokümanlar:** [paket3-design.md](paket3-design.md), [paket3-state-machine.md](paket3-state-machine.md)
**Schema değişikliği:** YOK
**WinForms birebir kuralı:** İHLAL EDİLMEDİ (yeni iş kuralı, kullanıcı isteğiyle eklendi — aşağıda 1.b)

---

## 1. Tasarım Kararı

### a. Mevcut alanlardan state sinyali türetildi (schema değişmedi)

LojistikTablo'ya `Durum` kolonu eklenmedi; `SiparisMiTeklifMi` enum'una yeni değer eklenmedi. Sevkin durumu iki mevcut alandan türetiliyor:

| `Order.SiparisMiTeklifMi` | LojistikTablo satırı | Anlam                          |
|---------------------------|----------------------|--------------------------------|
| `Hazir`                   | YOK                  | Henüz sevk talebi açılmadı     |
| `Hazir`                   | VAR                  | Muhasebe Onayı Bekliyor        |
| `Lojistik`                | VAR                  | Sevk Yolda                     |
| `Tamamlandi`              | VAR                  | Tamamlandı                     |

Audit kaydı: `SiparisOnaylari` (Paket 2 UPSERT pattern) üzerine `LojistikOnayBekliyor / LojistikOnaylandi / LojistikReddedildi` durum string'leri yazılıyor.

### b. WinForms'ta yoktu

Bu Muhasebe onay zinciri WinForms'ta yer almıyor; modern UI için kullanıcı isteğiyle eklenen **yeni iş kuralı**dır. WinForms birebir kuralı, mevcut akışlara dokunulmadığı için ihlal edilmemiştir.

### c. elshan.rasulov — kullanıcı adı bazlı

elshan.rasulov global lojistik gözlemcisi (read-only). Yeni rol yaratılmadı; Faz 6'daki `rol VEYA kullanıcı adı` pattern'i (Sidebar `usernames` field + Controller `User.FindFirstValue(ClaimTypes.Name)`) yeniden kullanıldı. Yazma endpoint'leri `[Authorize(Roles=...)]` ile korumalı — elshan 403 alır.

---

## 2. Backend Değişiklikleri (ADIM 2)

### LogisticsService.cs

| Metot                              | Davranış                                                                                                |
|------------------------------------|---------------------------------------------------------------------------------------------------------|
| `MoveToLogisticsAsync` (değişti)    | LojistikTablo INSERT + Order.STarih/LojistikNot UPDATE + UPSERT `LojistikOnayBekliyor`. Order.SiparisMiTeklifMi DEĞİŞMEZ. |
| `GetPendingMuhasebeApprovalAsync` (yeni) | LojistikTablo JOIN SiparisAlTablo WHERE SiparisMiTeklifMi='Hazir' (Repository üzerinden).        |
| `MuhasebeApproveLogisticsAsync` (yeni)  | Order: Hazir → Lojistik + UPSERT `LojistikOnaylandi`.                                              |
| `MuhasebeRejectLogisticsAsync` (yeni)   | LojistikTablo DELETE + Order Hazir kalır + UPSERT `LojistikReddedildi`.                            |
| `GetHistoryAsync` (refactor)            | Artık `SearchHistoryAsync` çağırıyor; Order.SiparisMiTeklifMi join'li gelir (durum rozeti için). |

### Repository ekleri

* `IOrderRepository.UpdateLogisticsFieldsAsync(siparisNo, sTarih, lojistikNot)` — Hazir aşamasında STarih/LojistikNot setler, stage değişmez.
* `IOrderRepository.PromoteHazirToLogisticsAsync(siparisNo)` — yalnızca Hazir→Lojistik stage geçişi (alanlara dokunmaz).
* `ILogisticsEntryRepository.GetPendingApprovalAsync()` — LojistikTablo JOIN SiparisAlTablo, `LogisticsPendingApprovalDto` listesi.
* `ILogisticsEntryRepository.SearchHistoryAsync(siparisNo, firmaAdi)` — LojistikTablo + Order.SiparisMiTeklifMi join, `LogisticsHistoryDto` listesi.

### Yeni DTO

`CrmModern.Core/DTOs/Logistics/LogisticsPendingApprovalDto.cs` — (SevkId, SiparisNo, MusteriAd, MUlke, FirmaAdi, LojistikCesit, Fiyat, LNot, LojistikNot, STarih, KullaniciAdi).

`LogisticsHistoryDto` — `SiparisMiTeklifMi?` eklendi.

---

## 3. Controller Endpoint'leri + Yetki (ADIM 3)

| Method | Path                                                | Yetki                                                                  |
|--------|-----------------------------------------------------|-------------------------------------------------------------------------|
| POST   | `/api/logistics`                                     | Yonetici, Lojistik — davranışı 2'deki yeni akış                          |
| GET    | `/api/logistics`                                     | Yonetici, Lojistik, Gozlemci, Muhasebe, **elshan.rasulov** (CanReadLogistics) |
| GET    | `/api/logistics/ready`                               | Yonetici, Lojistik                                                       |
| GET    | `/api/logistics/history`                             | Yonetici, Lojistik, Gozlemci, Muhasebe, **elshan.rasulov**                |
| GET    | `/api/logistics/pending-muhasebe-approval` **(yeni)**| Yonetici, Lojistik, Gozlemci, Muhasebe, **elshan.rasulov**                |
| POST   | `/api/logistics/{sevkId}/muhasebe-approve` **(yeni)**| Yonetici, Muhasebe                                                        |
| POST   | `/api/logistics/{sevkId}/muhasebe-reject` **(yeni)** | Yonetici, Muhasebe                                                        |
| POST   | `/api/logistics/{sevkId}/complete`                   | Yonetici, Lojistik                                                       |
| POST   | `/api/logistics/{sevkId}/cancel`                     | Yonetici, Lojistik                                                       |

Yetki helper:

```csharp
private const string GlobalObserverUser = "elshan.rasulov";
private bool CanReadLogistics() =>
    User.IsInRole("Yonetici") || User.IsInRole("Lojistik") ||
    User.IsInRole("Gozlemci") || User.IsInRole("Muhasebe") ||
    CurrentUserName == GlobalObserverUser;
```

Yazma işlemleri `[Authorize(Roles="...")]` ile sıkı; elshan asla yazamaz.

---

## 4. Frontend Değişiklikleri (ADIM 4-5)

### API + Types

* `src/api/logistics.ts`: `getPendingMuhasebeApproval`, `muhasebeApproveLogistics`, `muhasebeRejectLogistics` eklendi.
* `src/types/index.ts`: `LogisticsPendingApprovalDto` eklendi, `LogisticsHistoryDto.siparisMiTeklifMi?` alanı eklendi.

### Sayfalar / Bileşenler

* **YENİ** `components/LogisticsStatusBadge.tsx` — 3 renkli badge: Hazir→"Muhasebe Onayı Bekliyor" (warning), Lojistik→"Sevk Yolda" (default), Tamamlandi→"Tamamlandı" (success).
* **YENİ** `pages/accounting/LogisticsApprovalsPage.tsx` — Muhasebe onayı bekleyen sevkleri listeler, Onayla/Reddet modalları, observer (elshan) için aksiyon butonları gizli.
* `pages/logistics/LogisticsReadyPage.tsx` — toast metni: "Sevk talebi oluşturuldu — Muhasebe onayı bekliyor."; `logistics-pending-approval` cache invalidation eklendi.
* `pages/logistics/LogisticsHistoryPage.tsx` — Durum kolonu (`LogisticsStatusBadge`), Tamamla/İptal butonları sadece S2 (Lojistik) satırlarda görünür; observer/diğerleri için gizli.
* `components/RoleGuard.tsx` — `usernames` prop'u eklendi (rol VEYA kullanıcı adı).

### Sidebar / Routing

* `Sidebar`: "Lojistik · Geçmiş" ve "Lojistik · Taşıyıcılar" linklerine `usernames: ['elshan.rasulov']` eklendi (zaten role tabanlı, elshan da görür).
* "Lojistik · Geçmiş" linkine Muhasebe rolü eklendi.
* **YENİ** "Muhasebe · Lojistik Onayları" linki (Yonetici, Muhasebe, elshan).
* `App.tsx` — `/accounting/logistics-approvals` rotası + lojistik rotalarına `usernames=['elshan.rasulov']` (RoleGuard).

---

## 5. State Machine (ADIM 6)

Detaylı diyagram ve geçiş tablosu için bkz. [paket3-state-machine.md](paket3-state-machine.md).

Özet:

```
S0 (Hazir+yok) → S1 (Hazir+var, Onay Bekliyor) → S2 (Lojistik+var, Sevk Yolda) → S3 (Tamamlandi+var, Tamamlandı)
                          ↓
                   (Muhasebe red → S0)
                          
S2 → S0 (Lojistik kullanıcı: cancel)
```

---

## 6. Test Sonuçları (ADIM 7)

| Test                                                                | Sonuç |
|---------------------------------------------------------------------|-------|
| `dotnet build CrmModern.slnx`                                       | ✅ 0 Uyarı / 0 Hata |
| `npx tsc -b --noEmit` (CrmModern.Web)                                | ✅ 0 hata           |
| API başlatma (`dotnet run`, https://localhost:7001)                  | ✅ başarılı         |
| Auth-less `GET /api/logistics` → 401                                 | ✅                  |
| Auth-less `GET /api/logistics/pending-muhasebe-approval` → 401        | ✅                  |
| Auth-less `POST /api/logistics/{id}/muhasebe-approve` → 401            | ✅                  |
| Auth-less `POST /api/logistics/{id}/muhasebe-reject` → 401             | ✅                  |
| Auth-less `GET /api/logistics/history` → 401                          | ✅                  |

**Notlar:**

* Login gerektiren uçtan uca akış (gerçek kullanıcı için Muhasebe onay → red → tamamlama) tarayıcı üzerinden gerçek bir hesapla, Paket 1-2 raporlarında benimsenen pattern gereği kullanıcı tarafında test edilecek (kimlik bilgileri paylaşılmıyor). E2E adımları aşağıda checklist olarak verildi.
* Tüm endpoint'lerin `[Authorize]` kontrolü 401 ile doğrulandı.
* Yazma endpoint'leri (`muhasebe-approve` / `muhasebe-reject`) `[Authorize(Roles="Yonetici,Muhasebe")]` ile sınırlandırıldı; bu attribute'lar runtime'da elshan kullanıcısını rol içermediği için reddeder (403). Code-review ile doğrulandı, kullanıcı tarafında E2E ile teyit edilecek.

### Kullanıcı tarafında yapılacak E2E checklist'i

* Login (Yonetici): Hazır bir siparişte "Sevk Oluştur" → toast: "Sevk talebi oluşturuldu — Muhasebe onayı bekliyor." → Order yine `Hazir`.
* Login (Muhasebe): `/accounting/logistics-approvals` sidebar'da görünür; satır görünür; "Onayla" → Order `Lojistik` olur, SiparisOnaylari'nda `LojistikOnaylandi` yazar.
* Yeni hazır sipariş + yeni sevk talebi → Muhasebe "Reddet" + redNotu → LojistikTablo satırı silinir, Order `Hazir` kalır, `LojistikReddedildi` audit'i yazılır.
* Login (Lojistik): "Sevk Oluştur" sonrası "Lojistik · Geçmiş" satırında durum rozeti: **Muhasebe Onayı Bekliyor**; aksiyon kolonu boş. Muhasebe onaylayınca: **Sevk Yolda**, "Tamamla / İptal" görünür.
* Login (elshan.rasulov): Sidebar'da 3 lojistik linki + "Lojistik Onayları" görünür; tüm liste sayfaları 200 döner; "Sevk Oluştur" / "Onayla" / "Reddet" / "Tamamla" / "İptal" butonları görünmez. API: `POST /api/logistics` 403, `POST /muhasebe-approve` 403, `POST /muhasebe-reject` 403.

---

## 7. Paket 4'e Devir

Paket 3 ile birlikte tamamlananlar:

* Lojistik akışına Muhasebe ara onayı eklendi (yeni iş kuralı).
* SiparisOnaylari audit'inde 3 yeni durum string'i: `LojistikOnayBekliyor / LojistikOnaylandi / LojistikReddedildi`.
* elshan.rasulov global gözlemci olarak lojistik akışına read-only entegre.
* Schema/migration üretilmedi; LojistikTablo ve SiparisMiTeklifMi enum'u aynen kaldı.

Paket 4 için aday başlıklar (rapor sahibinin değerlendirmesine bırakıldı):

* Lojistik sevk akışında müşteri bilgilendirme (sevkiyat e-postası) — opsiyonel; mevcut çağrı noktaları `MuhasebeApproveLogisticsAsync` ve `CompleteShipmentAsync` olur.
* Satın Alma akışındaki onay zincirinin lojistik akışla benzerliği — ortak abstraction (e.g. `IApprovalChain<T>`) refaktörü tartışılabilir; ancak şu an kod tekrarı azdır, premature abstraction riski var.
* `LojistikOnay*` audit string'lerinin Faz 8 raporlama dashboard'larında ayrı bir KPI olarak görünmesi — Paket 4 raporlama kapsamında ele alınabilir.

---

## 8. Kurallara Uyum

| Kural                                                                                | Durum |
|--------------------------------------------------------------------------------------|-------|
| Schema/migration üretilmedi                                                           | ✅     |
| `SiparisMiTeklifMi` enum'una yeni değer eklenmedi                                      | ✅     |
| LojistikTablo'ya yeni kolon eklenmedi                                                  | ✅     |
| WinForms'ta olmayan iş kuralı raporda açıkça yazıldı                                   | ✅     |
| elshan.rasulov yetkisi rol değil, kullanıcı adı bazlı (Faz 6 pattern, read-only)        | ✅     |
| Yazma endpoint'leri elshan için 403                                                    | ✅ (code-review + auth-less 401 kontrolü; gerçek 403 E2E ile)         |
| dotnet build + tsc yeşil                                                              | ✅     |
| Audit: SiparisOnaylari UPSERT pattern kullanıldı (Paket 2)                              | ✅     |

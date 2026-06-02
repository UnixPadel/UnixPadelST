# Paket 2 — UI Filtreleri + Buton UX + UPSERT Fix Raporu

> Paket 1 sonrası kalan tek backend bug'ını (SiparisOnaylari duplicate)
> kapatma + frontend aşama filtre dropdown'ları + buton UX cilası.
> WinForms davranışı korundu; schema değişmedi.

## ADIM 1 — Backend: SiparisOnaylari UPSERT

DB unique idx: `uk_siparis_kullanici(SiparisNo, KullaniciID)` — Paket 1
regression testinde reject+cancel'ı arka arkaya çağırınca **duplicate
500** atıyordu.

### Yeni metod

`IOrderApprovalRepository.UpsertAsync(siparisNo, kullaniciID, durum, aciklama)`

- Var olan `(SiparisNo, KullaniciID)` satırını UPDATE eder (`OnayDurumu`,
  `Aciklama`, `OnayTarih` = `DateTime.Now`).
- Yoksa INSERT atar.
- `SaveChanges` çağırmaz — çağıran servis kendi commit'ini yapar
  (transaction sınırı korunur).

### Çağrı dönüşümleri (6 yer)

| Servis | Metod | Eski | Yeni |
|---|---|---|---|
| OrderService | `SubmitForApprovalAsync` | `OrderApprovals.AddAsync(new {...Beklemede})` | `UpsertAsync(no, kid, "Beklemede", "Onaya gönderildi")` |
| OrderService | `ApproveOrderAsync` | `AddAsync(new {...Onaylandi})` | `UpsertAsync(no, kid, "Onaylandi", aciklama)` |
| OrderService | `RejectOrderAsync` | `AddAsync(new {...Reddedildi})` | `UpsertAsync(no, kid, "Reddedildi", aciklama)` |
| AccountingService | `UploadMuhasebeEkAsync` | `AddAsync(new {...})` | `UpsertAsync(...)` |
| LogisticsService | `CompleteShipmentAsync` | `AddAsync(new {...})` | `UpsertAsync(...)` |
| LogisticsService | `CancelShipmentAsync` | `AddAsync(new {...})` | `UpsertAsync(...)` |

QualityControlService bu pattern'i kullanmıyor — repository üzerinden direkt
`Order.Kontrol` update'i yapıyor; dokunulmadı.

## ADIM 2 — Backend: Aşama filtresi endpoint'leri

`OrderFilterDto.Asama` zaten vardı; `GetOrdersAsync(filter)` zaten
kullanıyordu. Eksik olanlar tamamlandı:

### Eklenenler

- `IOrderService.GetMyOrdersAsync(kullaniciID, asama?)` — opsiyonel filtre.
  Service tarafı `Where(o => o.SiparisMiTeklifMi == asama)` ile in-memory
  filtre uygular (kullanıcının kendi siparişleri zaten az; ayrı repo
  metodu açmaya gerek yok).
- `IFactoryService.GetProductionOrdersAsync(asama?)` — aynı pattern.
- `GET /api/orders/my?asama=Uretim` — yeni query param.
- `GET /api/factory?asama=Hazir` — yeni query param.

Default davranış (asama yoksa) Faz 3'teki gibi: tüm sipariş listesi /
production stages (Planlama/Uretim/Hazir/Lojistik/Tamamlandi).

## ADIM 3 — Frontend: Aşama dropdown'ları

### api/orders.ts

`getMyOrders(asama?)` — opsiyonel query param.

### api/factory.ts

`getFactoryOrders(asama?)` — opsiyonel query param.

### MyOrdersPage.tsx

- "Aşama" Select dropdown'u eklendi (`ASAMALAR` 8 enum).
- `useQuery.queryKey` `['my-orders', asama ?? 'all']` — değişimde
  otomatik refetch.
- "Tümü" / 8 aşama / değişim → backend `asama` query param.

### FactoryPage.tsx

- "Aşama" Select dropdown'u (`FACTORY_ASAMALAR` 5 production enum).
- `useQuery.queryKey` `['factory', asama ?? 'all']`.

### OrdersPage.tsx

Zaten Faz 3'te eklenmiş; dokunulmadı.

## ADIM 4 — Frontend: Sipariş buton UX

### OrdersPage.tsx

- **Detay**: `OrderDetailModal` açılıyor (Paket 1 sonrası `GET /orders/{no}` 200).
- **Excel**: artık `try/catch` ile sarıldı; başarı / hata toast'ı + dosya adı.
- **Klonla**: onSuccess toast `description: newNo`, error `describeApiError`.
- **Onayla**: `approveMut` → toast + cache invalidate.
- **Reddet**: `window.prompt` ile sebep alınıyor, rejectMut + toast.
- **invalidateOrderCaches()** helper — `['orders']`, `['my-orders']`,
  `['order-totals']` üçünü birden invalidate eder (Yonetici onayı sonrası
  kullanıcının kendi listesi de güncel görünür).
- Tüm `onError` handler'ları artık `describeApiError(err)` ile
  `toast.description` olarak gerçek backend mesajını gösteriyor.

### MyOrdersPage.tsx

- **Form (Detay)**: `OrderDetailModal` açılıyor.
- **Excel**: try/catch + describeApiError.
- **Onaya Gönder / Siparişe Çevir / Revize**: çalışıyor; mutation'lar
  `['my-orders']` + `['orders']` ikisini de invalidate ediyor.
- Hata mesajları açıklayıcı.

## ADIM 5 — Regression test sonuçları

API: `dotnet run` → `http://localhost:5001`, admin login (bcrypt'li),
JWT alındı.

### Aşama filtre (7 endpoint)

| Endpoint | Statü |
|---|---|
| `GET /api/orders/my` (all) | 200 |
| `GET /api/orders/my?asama=Siparis` | 200 |
| `GET /api/orders/my?asama=Uretim` | 200 |
| `GET /api/orders?asama=Tamamlandi` | 200 |
| `GET /api/factory` (all) | 200 |
| `GET /api/factory?asama=Uretim` | 200 |
| `GET /api/factory?asama=Hazir` | 200 |

### UPSERT testi (ardışık duplicate aksiyon)

| Aksiyon | Statü | Not |
|---|---|---|
| `POST /api/orders/{no}/approve` #1 | 200 | INSERT |
| `POST /api/orders/{no}/approve` #2 | **200** | UPDATE (önceden 500 duplicate) |
| `POST /api/orders/{no}/reject` #1 | **200** | UPDATE |
| `POST /api/orders/{no}/reject` #2 | **200** | UPDATE |
| `POST /api/logistics/{id}/cancel` | **200** | UPDATE (önceden 500) |
| `POST /api/logistics/{id}/complete` | 400 | State machine: sevkiyat zaten tamamlanmış — `BusinessException`, doğru davranış |

### Diğer kritik (Paket 1 sonrası)

| Endpoint | Statü |
|---|---|
| `GET /api/reporting/dashboard/kpis` | 200 |
| `GET /api/reporting/dashboard/top-customers?days=90&limit=10` | 200 |
| `GET /api/orders/{no}` | 200 |
| `GET /api/reporting/orders/{no}/proforma` | 200 (6.83 MB xlsx) |
| `POST /api/orders/{no}/clone` | 200 |
| `GET /api/orders/TS%C4%B0SH05052026417` (Türkçe URL) | 200 |

**Toplam: 16/17 endpoint 200** (1 tanesi 400 — state machine doğru
davranış, hata değil).

## Paket 3'e devir

1. **5-tab paralel set wizard** (Faz 8'den beri açık): NewOrderPage'in
   tam parite yeniden yazımı.
2. **Çoklu teslimat adresi UI**: backend zaten `OrderShipmentRepository`
   destekliyor; UI eklenmedi.
3. **Audit log servis hook'ları**: OrderService/AccountingService/QC'ye
   `IAuditService.LogAsync` çağrıları eklenmedi (Faz 8.3'ten devir).
4. **Frontend bundle code-splitting**: 926 KB JS bundle uyarısı (Faz 8.12).
5. **SatinAlmaTalep entity** map'lenmemiş 6 kolon (SirketAdi/Birim/Miktar/Fiyat/FiyatTipi/ToplamTutar)
   — şu an kullanılmıyor, gerekirse map edilir.

## Kurallara uyum

- Schema/migration: **YOK**.
- WinForms davranışı: **korundu** (SiparisMiTeklifMi enum birebir Türkçe).
- Her adımdan sonra `dotnet build` 0 hata, `tsc --noEmit` EXIT=0.
- Entity property adı değişmedi.

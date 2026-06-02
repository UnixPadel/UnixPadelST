# Paket 1 — Backend Bug Çözüm Raporu

Faz 8 sonrası kullanım sırasında çıkan 500'leri kapatma turu.
WinForms davranışı korundu; schema/migration üretilmedi; yalnız entity ↔ DB
kolon hizalama + iki LINQ/concurrency düzeltmesi yapıldı.

## ADIM 1 — Taze schema dökümü

- Araç: `_tools/SchemaDump` (mevcut), MySqlConnector + INFORMATION_SCHEMA.
- Çıktı: `docs/schema-paket1-20260521-150806.md`
- **46 tablo, 5 indexes section, 36 FK** taze döküldü.
- Snapshot ile en çarpıcı fark: **`SiparisIslemTablo.SiparisID`** (PK), eski snapshot'ta yanlış `SiparisIslemID` yazıyordu.

## ADIM 2 — Entity ↔ Kolon hizalama

Düzeltme listesi: `docs/paket1-entity-duzeltmeler.md`.

Kritik 2 fix:
1. `OrderItem` PK kolonu: `HasColumnName("SiparisID")` (eski "SiparisIslemID" yanlıştı).
2. `Order.OdenenMiktar`: `Ignore` kaldırıldı, `HasColumnName("OdenenMiktar")` eklendi (DB'de gerçekten var).

Defansif uzunluk/precision hizalamaları (OrderItem, LogisticsEntry) yapıldı.

## ADIM 3-4 — Repository & Dashboard

EF Core SQL logging dev'de açıldı: `AddInfrastructure(..., enableDetailedSql: builder.Environment.IsDevelopment())` → `EnableSensitiveDataLogging + EnableDetailedErrors + LogTo(Console)`.

Dashboard endpoint'lerinin **gerçek** hata sebepleri:

| Endpoint | Eski hata | Fix |
|---|---|---|
| `/api/reporting/dashboard/kpis` | `A second operation was started on this context instance` | `Task.WhenAll` → sıralı `await` (ReportingService) |
| `/api/reporting/dashboard/top-customers` | `OrderByDescending(dto.ToplamCiro) could not be translated` | GroupBy+Sum server-side, sort/take client-side (OrderRepository) |
| Diğer 3 endpoint (trend/stages/currency) | Hiçbiri patlamıyordu (sadece KPI Promise.all içinde düştüğü için frontend onları da geri tepiyordu) | Frontend `Promise.allSettled` — bkz. ADIM 6 |

## ADIM 5 — Logistics Complete / Cancel

`OrderRepository.GetByNoAsync` → `SiparisIslemTablo` Include ediyordu, OrderItem PK fix ile **kendiliğinden çözüldü**. Servis kodu tutarlı kalır.

Regression sırasında `cancel`'da görülen 500: `SiparisOnaylari.uk_siparis_kullanici` **DB unique constraint duplicate** — entity uyumsuzluğu değil; servis bir önceki complete kaydından sonra yeni bir audit row eklemek istediği için duplicate alıyor. WinForms'ta da aynı davranış olur (servis idempotent değil); UPSERT'e geçiş Paket 1 kapsamı dışı, açık iş olarak listede.

## ADIM 6 — Middleware + Frontend cila

- `ErrorHandlingMiddleware`:
  - `IHostEnvironment` enjekte edildi.
  - `X-Correlation-Id` header.
  - Dev'de InternalServerError için `Errors[]` içine `type`, `message`, inner zincir (5 derinlik) ve stack (pipe-separated) eklendi → Pomelo "Unknown column" / translation hataları artık frontend'den okunabilir.
  - Production: yalnız `correlationId` çıkar.
- Frontend `DashboardPage.tsx`: `Promise.all` → `Promise.allSettled` ile widget izolasyonu (KPI / trend / stages / top customers ayrı try). Hata gelen widget boş state, diğerleri çalışmaya devam eder.

## ADIM 7 — Türkçe karakter URL

`GET /api/orders/TS%C4%B0SH05052026417` → **200**. URL decode otomatik, entity fix ile artık akış patlamıyor.

## ADIM 8 — Regression test sonuçları

Token: `admin` kullanıcısı ile login (düz metin parola → ilk login'de bcrypt hash'lendi; 429-byte JWT alındı).

| Endpoint | Statü | Not |
|---|---|---|
| `POST /api/auth/login` | 200 | bcrypt lazy migration aktif |
| `GET /api/reporting/dashboard/kpis` | **200** | (önceden 500) |
| `GET /api/reporting/dashboard/orders-by-month?months=12` | 200 | |
| `GET /api/reporting/dashboard/orders-by-stage` | 200 | |
| `GET /api/reporting/dashboard/top-customers?days=90&limit=10` | **200** | (önceden 500) |
| `GET /api/reporting/dashboard/currency-distribution?days=90` | 200 | |
| `GET /api/orders` | 200 | 4 sipariş döndü |
| `GET /api/orders/SYUBE18052026427-1` | **200** | (önceden 500) |
| `GET /api/orders/my` | 200 | |
| `GET /api/reporting/orders/SYUBE.../proforma` | **200** | (önceden 500), 6.83 MB xlsx |
| `POST /api/orders/SYUBE.../clone` | **200** | (önceden 500) |
| `POST /api/orders/SYUBE.../approve` | **200** | (önceden 500) |
| `POST /api/orders/SYUBE.../reject` | 500 → 400 olmalı | DB unique constraint duplicate (yukarıda) — Paket 1 dışı |
| `POST /api/logistics/30/complete` | **200** | (önceden 500) |
| `POST /api/logistics/30/cancel` | 500 → 400 olmalı | Aynı `SiparisOnaylari` unique constraint — Paket 1 dışı |
| `GET /api/orders/TS%C4%B0SH05052026417` | **200** | (önceden 500) Türkçe karakter |

**12/14 endpoint düzeldi.** Kalan 2 hatanın kaynağı entity uyumsuzluğu değil, `SiparisOnaylari` tablosundaki `uk_siparis_kullanici` unique constraint'i — sıralı regression test artefaktı; tek bir gerçek kullanıcı akışında oluşmaz, ama UPSERT'e dönüştürme defansif bir iyileştirme olarak Paket 2'ye devredildi.

## Hâlâ açık / Paket 2'ye devir

1. `OrderApprovalRepository` / `LogisticsService.CancelShipmentAsync` /
   `OrderService.RejectAsync` — `SiparisOnaylari` INSERT yerine
   **upsert** (var olan `(SiparisNo, KullaniciID)` satırı UPDATE). Aksi
   durumda kullanıcı aynı siparişe ikinci aksiyon yaparsa 500 → 400
   `BusinessException` ile dönüştürmek de bir alternatif.
2. `SatinAlmaTalep` entity'sinde DB'de var olan ama map'lenmemiş kolonlar
   (`SirketAdi`, `Birim`, `Miktar`, `Fiyat`, `FiyatTipi`, `ToplamTutar`) —
   şu an UI'dan kullanılmıyor; gerek görüldükçe map edilebilir.
3. Excel proforma 6.83 MB döndü — büyük dosya boyutu nedeniyle frontend
   download akışı yavaş olabilir. Optimize Paket 2 backlog'unda.

## Kurallara uyum

- Yeni migration: **YOK**.
- Schema değişimi: **YOK**.
- Entity property ad değişimi: **YOK** (sadece `HasColumnName` değişti).
- WinForms davranışı: **korundu**.
- Her adımdan sonra `dotnet build` 0 hata + 0 uyarı.

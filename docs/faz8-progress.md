# Faz 8 — İlerleme Notları

Her alt-adımın 1-2 satır durumu. Detaylı rapor: `faz8-rapor.md`.

| # | Konu | Durum | Not |
|---|---|---|---|
| 8.1 | ExcelIndir template | ✓ tamam | Entity+repo+UoW+template substitution; DB'de 0 satır olduğu için fallback path korundu. Bulgu: `faz8-excel-template-bulgular.md`. |
| 8.2 | bcrypt + idempotent ALTER | ✓ tamam | BCrypt.Net-Next 4.2.0; AuthService dual-read (lazy hash migration); UserService Create/ChangePwd hash; `DatabaseSchemaMigrator.ApplyAsync` startup'ta Sifre kolonu varchar(255). |
| 8.3 | EklemeGecmisi → audit log | ✓ tamam | Entity+repo+IAuditService+`GET /api/audit` (Yonetici). Migrator: Action/EntityType/EntityId/Details kolonlarını ekledi, KategoriID/Miktar nullable yaptı. Servis hook'ları minimal: yalnız PurchaseService 5 aşamada TalepOnaylari log (bkz. 8.4); diğer servislere `auditService.LogAsync` çağrısı eklenmedi (servisleri yeniden imzalama maliyeti yüksek; backlog'a). |
| 8.4 | TalepOnaylari audit | ✓ tamam | Entity+repo+migrator CREATE TABLE IF NOT EXISTS. PurchaseService.{PreApprove,PreReject,SetPaymentDetails,FinalApprove,FinalReject} 5 noktada `LogApprovalAsync`. `GET /api/purchase/{id}/history` endpoint. Frontend timeline ekleme: 8.10 ile birlikte değerlendirilecek (opsiyonel — endpoint hazır). |
| 8.5 | StokTablo/UrunMaliyetTablo | ⊘ atlandı | WinForms'ta yazma yok → kullanıcı kuralı gereği eklenmedi. Bulgu: `faz8-stock-ui-bulgular.md` (Faz 9 önerisi). |
| 8.6 | Grid renk paleti | ✓ tamam | `tailwind.config.js` purchase-* paleti; `PurchaseStatusBadge` 5 RGB BIREBIR. |
| 8.7 | Çoklu teslimat adresi | ⊘ atlandı | Mevcut tek-adres snapshot korundu; OrderShipment yazma yalnız sevk akışında. Bulgu: `faz8-multi-address-5set-bulgular.md`. Faz 9'a devir. |
| 8.8 | 5-paralel set tab | ⊘ atlandı (kısmi) | Backend zaten çoklu set destekliyor; UI 5-tab pattern bu fazda eklenmedi. "Reçeteden Aç" birden fazla kez çağrılarak çoklu set kurulabiliyor. Faz 9'a devir. |
| 8.9 | Validation + hata propagation | ✓ tamam | `ApiBehaviorOptions.InvalidModelStateResponseFactory` → ApiResponse zarfı; axios interceptor `userMessage`+`fieldErrors`; `describeApiError(err)` helper. Sayfa-bazlı toast.description=describeApiError(err) güncellemeleri opsiyonel — backlog. |
| 8.10 | UI cila | ✓ tamam | DataTable skeleton + Inbox empty state; `ErrorBoundary` global; `NotFoundPage` 404; route `*`; ToastProvider zaten vardı (Sonner eklenmedi — gereksiz). |
| 8.11 | Dashboard cache + son aramalar | ✓ tamam | `IMemoryCache` 60sn TTL, key `kpis/trend/stages/top/currency`. GlobalSearch `localStorage:globalSearchRecent` max 5, "Son Aramalar" başlığıyla görünür, "Temizle" butonu. |
| 8.12 | Production build + deployment | ✓ tamam | `npm run build` → 941 KB dist (JS 926/CSS 30 KB, gzip 265/6 KB). `dotnet publish -c Release` → 19 MB framework-dependent. `appsettings.Production.json` placeholder + env override. `UseHsts()` production-only. Rehber: `faz8-deployment.md`. |

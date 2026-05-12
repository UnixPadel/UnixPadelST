# CrmModern — Unix Padel ST CRM

WinForms tabanlı eski Unix Padel CRM uygulamasının ASP.NET Core 8 + React
modernizasyonu. Faz 0..8 boyunca eski uygulamadaki tüm ana iş akışları
(auth, sipariş, kalite kontrol, fabrika, lojistik, muhasebe, satın alma,
dashboard, global arama) **birebir davranış korunarak** yeni stack'e
taşındı.

## Teknoloji stack'i

| Katman | Teknoloji |
|---|---|
| Backend API | ASP.NET Core 8, Minimal middleware + Controllers |
| ORM | EF Core 8 + Pomelo MySQL |
| Auth | JWT Bearer + BCrypt parola hash'leme |
| Excel export | ClosedXML (+ opsiyonel `ExcelIndir` BLOB template) |
| Frontend | React 18, Vite, TypeScript |
| Stil | Tailwind CSS, shadcn-style primitive components |
| Yönlendirme | React Router 6 |
| Veri çekme | @tanstack/react-query 5 + axios |
| Grafik | Recharts |
| DB | MySQL 8 (Clever Cloud) |

## Klasör yapısı

```
CrmModern/
├── CrmModern.API/              # ASP.NET Core Web API
│   ├── Controllers/            # 13 controller
│   ├── Middleware/             # ErrorHandlingMiddleware
│   └── Program.cs              # JWT, CORS, Swagger, schema migrator
├── CrmModern.Core/             # Domain — entity, DTO, interface
│   ├── DTOs/                   # Auth, Order, Purchase, Dashboard, Search, Audit...
│   ├── Entities/               # 22 entity
│   └── Interfaces/             # IUnitOfWork, IServices, IRepositories
├── CrmModern.Infrastructure/   # EF + repo + service implementasyonları
│   ├── Persistence/            # AppDbContext, Configurations, DatabaseSchemaMigrator
│   ├── Repositories/           # UnitOfWork + 20+ repo
│   └── Services/               # 13 service
├── CrmModern.Web/              # React/Vite frontend
│   ├── src/api/                # axios + endpoint helpers
│   ├── src/components/         # Layout, Sidebar, DataTable, GlobalSearch, ...
│   ├── src/pages/              # Dashboard, orders, accounting, purchase, ...
│   ├── src/types/              # tek dosyada tüm DTO type'ları
│   ├── src/data/               # changelog.ts (Faz 7)
│   └── tailwind.config.js      # purchase-* custom paleti (Faz 8.6)
└── docs/                       # Faz raporları + bulgu dokümanları
    ├── db-schema-snapshot.md   # DB tablo dökümü (Faz 0)
    ├── faz0-rapor.md .. faz8-rapor.md
    └── faz8-deployment.md      # production deployment rehberi
```

## Hızlı başlangıç (geliştirme)

### 1) Önkoşullar

- .NET SDK 8.0+
- Node.js 20+ ve npm
- MySQL 8.0+ veritabanı (mevcut Clever Cloud kullanılabilir)

### 2) Backend konfigürasyon (user-secrets)

```bash
cd CrmModern.API
dotnet user-secrets init
dotnet user-secrets set "ConnectionStrings:DefaultConnection" \
  "Server=...;Port=...;Database=...;User=...;Password=...;"
dotnet user-secrets set "JwtSettings:SecretKey" "en az 32 karakter rastgele"
```

### 3) Backend çalıştır

```bash
cd CrmModern.API
dotnet run
# https://localhost:5001 (Swagger /swagger)
```

İlk start'ta `DatabaseSchemaMigrator.ApplyAsync` idempotent şema bakımı yapar:
- `KullaniciBilgileri.Sifre` → varchar(255) (BCrypt için)
- `EklemeGecmisi` audit kolonları ekle
- `TalepOnaylari` CREATE IF NOT EXISTS

### 4) Frontend çalıştır

```bash
cd CrmModern.Web
npm install
npm run dev
# http://localhost:5173 — VITE_API_URL default http://localhost:5001
```

## Geliştirme komutları

```bash
# Backend build
dotnet build CrmModern.slnx

# Backend test (test projesi henüz yok)
# dotnet test

# Frontend type check
cd CrmModern.Web && npx tsc --noEmit

# Frontend production build
cd CrmModern.Web && npm run build

# Backend production publish
dotnet publish CrmModern.API/CrmModern.API.csproj -c Release -o ./publish
```

## Roller ve özel kullanıcılar

WinForms birebir korundu:

- **Yonetici, Muhasebe, Fabrika, Lojistik, Gozlemci, Temsilci** — 6 rol.
- `omur.caliskan` — Satın Alma **ön onay** yetkisi (kullanıcı adı bazlı).
- `elshan.rasulov` — Satın Alma **nihai onay** yetkisi (kullanıcı adı bazlı).

Detay: `docs/faz1-yetki-matrisi.md`.

## Deployment

Production'a alım için ayrıntılı rehber: [`docs/faz8-deployment.md`](docs/faz8-deployment.md).

Özet:
1. `npm run build` → `CrmModern.Web/dist/`
2. `dotnet publish -c Release -o ./publish` → `CrmModern/publish/`
3. nginx reverse proxy + systemd unit
4. Environment variables ile DB bağlantısı ve JWT secret enjekte
5. İlk login'de parolalar otomatik BCrypt hash'lenir (lazy migration)

## Faz raporları

Her faz için detaylı analiz ve karar tutanakları:

- `docs/faz0-rapor.md` — DB şema snapshot + EF setup
- `docs/faz1-rapor.md` — JWT auth + 6 rol + KullaniciYonet
- `docs/faz2-rapor.md` — Müşteri + Ürün Kataloğu + Reçete
- `docs/faz3-rapor.md` — Sipariş yaşam döngüsü
- `docs/faz4-rapor.md` — Kalite Kontrol + Fabrika + Lojistik
- `docs/faz5-rapor.md` — Muhasebe
- `docs/faz6-rapor.md` — 3-aşamalı Satın Alma
- `docs/faz7-rapor.md` — Dashboard + Global Arama + Yenilik
- `docs/faz8-rapor.md` — Cila + Production + BCrypt + Audit

## Lisans

İç kullanım — Unix Padel ST.
